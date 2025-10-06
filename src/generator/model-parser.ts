import { Project, SourceFile, ClassDeclaration, PropertyDeclaration } from 'ts-morph';

export interface JSDocValidation {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    email?: boolean;
    url?: boolean;
    phoneNumber?: boolean;
    creditCard?: boolean;
    alphanumeric?: boolean;
    numeric?: boolean;
    alpha?: boolean;
}

export interface ModelProperty {
    name: string;
    type: string;
    isOptional: boolean;
    isArray: boolean;
    decorators: string[];
    initialValue?: string;
    jsDocValidation?: JSDocValidation;
    description?: string;
}

export interface ModelClass {
    name: string;
    properties: ModelProperty[];
    imports: string[];
}

export class ModelParser {
    private project: Project;

    constructor() {
        this.project = new Project({
            compilerOptions: {
                target: 99, // ScriptTarget.Latest
            },
        });
    }

    parseModelFromFile(filePath: string, className: string): ModelClass | null {
        const sourceFile = this.project.addSourceFileAtPath(filePath);
        return this.parseModel(sourceFile, className);
    }

    parseModelFromContent(content: string, className: string): ModelClass | null {
        const sourceFile = this.project.createSourceFile('temp.ts', content);
        return this.parseModel(sourceFile, className);
    }

    private parseModel(sourceFile: SourceFile, className: string): ModelClass | null {
        const classDeclaration = sourceFile.getClass(className);
        if (!classDeclaration) {
            return null;
        }

        const properties = this.extractProperties(classDeclaration);
        const imports = this.extractImports(sourceFile);

        return {
            name: className,
            properties,
            imports,
        };
    }

    private extractProperties(classDeclaration: ClassDeclaration): ModelProperty[] {
        return classDeclaration
            .getProperties()
            .map(prop => this.extractPropertyInfo(prop))
            .filter(prop => prop !== null) as ModelProperty[];
    }

    private extractPropertyInfo(prop: PropertyDeclaration): ModelProperty | null {
        const name = prop.getName();
        if (!name) { return null; }

        const typeNode = prop.getTypeNode();
        const initialValue = prop.getInitializer()?.getText();
        let type = 'any';
        let isArray = false;
        let isOptional = prop.hasQuestionToken();

        // Check for definite assignment assertion (!) - treat as optional
        if (prop.hasExclamationToken()) {
            isOptional = true;
        }

        if (typeNode) {
            // Explicit type is defined
            type = typeNode.getText();
            isArray = type.includes('[]') || type.includes('Array<');

            // Normalize array types
            if (isArray) {
                type = type.replace(/\[\]/g, '').replace(/Array<(.+)>/g, '$1');
            }
        } else if (initialValue) {
            // No explicit type, infer from initial value
            const { inferredType, inferredOptional, inferredArray } = this.inferTypeFromInitialValue(initialValue);
            type = inferredType;
            // Only override isOptional if it's not already set by ! or ?
            if (!prop.hasQuestionToken() && !prop.hasExclamationToken()) {
                isOptional = inferredOptional;
            }
            isArray = inferredArray;
        }

        const decorators = prop.getDecorators().map(d => d.getName());

        // Parse JSDoc comments
        const jsDocValidation = this.parseJSDocValidation(prop);
        const description = this.parseJSDocDescription(prop);

        return {
            name,
            type,
            isOptional,
            isArray,
            decorators,
            initialValue,
            jsDocValidation,
            description,
        };
    }

    private inferTypeFromInitialValue(initialValue: string): { inferredType: string; inferredOptional: boolean; inferredArray: boolean } {
        // Remove quotes and whitespace for analysis
        const trimmedValue = initialValue.trim();

        // String patterns: '', "", ``, 'text', "text", `text`
        if (trimmedValue === "''" || trimmedValue === '""' || trimmedValue === '``') {
            return { inferredType: 'string', inferredOptional: true, inferredArray: false };
        }
        if ((trimmedValue.startsWith("'") && trimmedValue.endsWith("'")) ||
            (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
            (trimmedValue.startsWith('`') && trimmedValue.endsWith('`'))) {
            return { inferredType: 'string', inferredOptional: false, inferredArray: false };
        }

        // Number patterns: 0, 1, -1, 0.5, etc.
        if (trimmedValue === '0') {
            return { inferredType: 'number', inferredOptional: true, inferredArray: false };
        }
        if (/^-?\d+(\.\d+)?$/.test(trimmedValue)) {
            return { inferredType: 'number', inferredOptional: false, inferredArray: false };
        }

        // Boolean patterns: true, false - treat as optional (default values)
        if (trimmedValue === 'true' || trimmedValue === 'false') {
            return { inferredType: 'boolean', inferredOptional: true, inferredArray: false };
        }

        // Date patterns: new Date(), new Date(...)
        if (trimmedValue.startsWith('new Date(')) {
            // new Date() without parameters is typically a default value
            if (trimmedValue === 'new Date()') {
                return { inferredType: 'Date', inferredOptional: true, inferredArray: false };
            }
            // new Date(specific_value) is more intentional
            return { inferredType: 'Date', inferredOptional: false, inferredArray: false };
        }

        // Array patterns: [], [1,2,3], ['a','b']
        if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
            if (trimmedValue === '[]') {
                return { inferredType: 'any', inferredOptional: true, inferredArray: true };
            }
            // Try to infer array element type
            const arrayContent = trimmedValue.slice(1, -1).trim();
            if (arrayContent) {
                const firstElement = arrayContent.split(',')[0].trim();
                const { inferredType } = this.inferTypeFromInitialValue(firstElement);
                return { inferredType, inferredOptional: false, inferredArray: true };
            }
        }

        // Object patterns: {}, {key: value}
        if (trimmedValue.startsWith('{') && trimmedValue.endsWith('}')) {
            if (trimmedValue === '{}') {
                return { inferredType: 'object', inferredOptional: true, inferredArray: false };
            }
            return { inferredType: 'object', inferredOptional: false, inferredArray: false };
        }

        // Default fallback
        return { inferredType: 'any', inferredOptional: false, inferredArray: false };
    }

    private parseJSDocValidation(prop: PropertyDeclaration): JSDocValidation | undefined {
        const jsDocs = prop.getJsDocs();
        if (!jsDocs.length) { return undefined; }

        const validation: JSDocValidation = {};

        for (const jsDoc of jsDocs) {
            const tags = jsDoc.getTags();

            // Parse validation tags
            for (const tag of tags) {
                const tagName = tag.getTagName();
                const tagText = tag.getComment()?.toString() || '';

                switch (tagName) {
                    case 'required':
                        validation.required = true;
                        break;
                    case 'minLength':
                        validation.minLength = parseInt(tagText) || undefined;
                        break;
                    case 'maxLength':
                        validation.maxLength = parseInt(tagText) || undefined;
                        break;
                    case 'min':
                        validation.min = parseFloat(tagText) || undefined;
                        break;
                    case 'max':
                        validation.max = parseFloat(tagText) || undefined;
                        break;
                    case 'pattern':
                        validation.pattern = tagText;
                        break;
                    case 'email':
                        validation.email = true;
                        break;
                    case 'url':
                        validation.url = true;
                        break;
                    case 'phoneNumber':
                        validation.phoneNumber = true;
                        break;
                    case 'creditCard':
                        validation.creditCard = true;
                        break;
                    case 'alphanumeric':
                        validation.alphanumeric = true;
                        break;
                    case 'numeric':
                        validation.numeric = true;
                        break;
                    case 'alpha':
                        validation.alpha = true;
                        break;
                }
            }
        }

        return Object.keys(validation).length > 0 ? validation : undefined;
    }

    private parseJSDocDescription(prop: PropertyDeclaration): string | undefined {
        const jsDocs = prop.getJsDocs();
        if (!jsDocs.length) { return undefined; }

        for (const jsDoc of jsDocs) {
            const description = jsDoc.getDescription().trim();
            if (description) {
                return description;
            }
        }

        return undefined;
    } private extractImports(sourceFile: SourceFile): string[] {
        return sourceFile
            .getImportDeclarations()
            .map(imp => imp.getText());
    }
}