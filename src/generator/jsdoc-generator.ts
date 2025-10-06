import { ModelClass, ModelProperty, ModelParser } from './model-parser';
import * as fs from 'fs';

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
    description?: string;
}

export class JSDocGenerator {
    async generateJSDoc(filePath: string, modelName: string): Promise<{ success: boolean; error?: string }> {
        try {
            const parser = new ModelParser();
            const model = parser.parseModelFromFile(filePath, modelName);

            if (!model) {
                return { success: false, error: `Model '${modelName}' not found in ${filePath}` };
            }

            // Generate JSDoc for the model
            const jsDocContent = this.generateJSDocForModel(model);

            // Read the original file content
            const originalContent = fs.readFileSync(filePath, 'utf-8');

            // Find the model class in the original content and replace it
            const classRegex = new RegExp(`(export\\s+class\\s+${modelName}\\s*{[^}]*})`, 'gs');

            if (!classRegex.test(originalContent)) {
                return { success: false, error: `Could not find class '${modelName}' in the file` };
            }

            const updatedContent = originalContent.replace(classRegex, jsDocContent);

            // Write the updated content back to the file
            fs.writeFileSync(filePath, updatedContent, 'utf-8');

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
    generateJSDocForModel(model: ModelClass): string {
        const classDoc = this.generateClassJSDoc(model);
        const properties = model.properties.map(prop => this.generatePropertyWithJSDoc(prop)).join('\n\n');

        return `${classDoc}
export class ${model.name} {
${properties}
}`;
    }

    private generateClassJSDoc(model: ModelClass): string {
        const description = this.getClassDescription(model.name);
        return `/**
 * ${description}
 * @class ${model.name}
 */`;
    }

    private generatePropertyWithJSDoc(prop: ModelProperty): string {
        const validation = this.generateValidationFromProperty(prop);
        const jsDoc = this.generatePropertyJSDoc(prop, validation);
        const propertyDeclaration = this.generatePropertyDeclaration(prop);

        return `${jsDoc}
${propertyDeclaration}`;
    }

    private generatePropertyJSDoc(prop: ModelProperty, validation: JSDocValidation): string {
        const lines: string[] = [];

        // Add description
        if (validation.description) {
            lines.push(` * ${validation.description}`);
        } else {
            lines.push(` * ${this.getPropertyDescription(prop)}`);
        }

        // Add validation annotations
        const validationLines = this.generateValidationAnnotations(validation);
        if (validationLines.length > 0) {
            lines.push(' *');
            lines.push(...validationLines);
        }

        // Add type information
        lines.push(` * @type {${this.getJSDocType(prop)}}`);

        if (prop.isOptional) {
            lines.push(' * @optional');
        }

        return `  /**\n${lines.join('\n')}\n   */`;
    }

    private generateValidationFromProperty(prop: ModelProperty): JSDocValidation {
        const validation: JSDocValidation = {};

        // Required validation
        if (!prop.isOptional) {
            validation.required = true;
        }

        // Type-based validations
        if (prop.type === 'string') {
            if (prop.name.toLowerCase().includes('email')) {
                validation.email = true;
                validation.required = true;
            } else if (prop.name.toLowerCase().includes('url') || prop.name.toLowerCase().includes('website')) {
                validation.url = true;
            } else if (prop.name.toLowerCase().includes('phone')) {
                validation.phoneNumber = true;
                validation.pattern = '^\\+?[1-9]\\d{1,14}$';
            } else if (prop.name.toLowerCase().includes('password')) {
                validation.minLength = 8;
                validation.pattern = '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]';
            } else if (prop.name.toLowerCase().includes('name') || prop.name.toLowerCase().includes('title')) {
                validation.minLength = 2;
                validation.maxLength = 100;
            } else if (prop.name.toLowerCase().includes('description') || prop.name.toLowerCase().includes('bio')) {
                validation.maxLength = 500;
            } else if (prop.name.toLowerCase().includes('code') || prop.name.toLowerCase().includes('id')) {
                validation.alphanumeric = true;
            }
        }

        if (prop.type === 'number') {
            if (prop.name.toLowerCase().includes('age')) {
                validation.min = 0;
                validation.max = 120;
            } else if (prop.name.toLowerCase().includes('price') || prop.name.toLowerCase().includes('amount')) {
                validation.min = 0;
            } else if (prop.name.toLowerCase().includes('rating')) {
                validation.min = 0;
                validation.max = 5;
            } else if (prop.name.toLowerCase().includes('percentage') || prop.name.toLowerCase().includes('percent')) {
                validation.min = 0;
                validation.max = 100;
            }
        }

        if (prop.type === 'Date') {
            if (prop.name.toLowerCase().includes('birthday') || prop.name.toLowerCase().includes('birth')) {
                validation.pattern = '^\\d{4}-\\d{2}-\\d{2}$';
            }
        }

        // Add description based on property name
        validation.description = this.getPropertyDescription(prop);

        return validation;
    }

    private generateValidationAnnotations(validation: JSDocValidation): string[] {
        const lines: string[] = [];

        if (validation.required) {
            lines.push(' * @required');
        }

        if (validation.email) {
            lines.push(' * @email');
        }

        if (validation.url) {
            lines.push(' * @url');
        }

        if (validation.phoneNumber) {
            lines.push(' * @phoneNumber');
        }

        if (validation.creditCard) {
            lines.push(' * @creditCard');
        }

        if (validation.alphanumeric) {
            lines.push(' * @alphanumeric');
        }

        if (validation.numeric) {
            lines.push(' * @numeric');
        }

        if (validation.alpha) {
            lines.push(' * @alpha');
        }

        if (validation.minLength !== undefined) {
            lines.push(` * @minLength ${validation.minLength}`);
        }

        if (validation.maxLength !== undefined) {
            lines.push(` * @maxLength ${validation.maxLength}`);
        }

        if (validation.min !== undefined) {
            lines.push(` * @min ${validation.min}`);
        }

        if (validation.max !== undefined) {
            lines.push(` * @max ${validation.max}`);
        }

        if (validation.pattern) {
            lines.push(` * @pattern ${validation.pattern}`);
        }

        return lines;
    }

    private generatePropertyDeclaration(prop: ModelProperty): string {
        const optionalModifier = prop.isOptional ? '?' : '';
        const defaultValue = prop.initialValue ? ` = ${prop.initialValue}` : '';

        return `  ${prop.name}${optionalModifier}: ${prop.type}${prop.isArray ? '[]' : ''}${defaultValue};`;
    }

    private getClassDescription(className: string): string {
        const descriptions: { [key: string]: string } = {
            'User': 'User profile data',
            'Product': 'Product information',
            'Order': 'Order details',
            'Customer': 'Customer information',
            'BlogPost': 'Blog post data',
            'Article': 'Article content',
            'Comment': 'User comment',
            'Review': 'Product or service review',
            'Category': 'Category information',
            'Tag': 'Tag metadata',
            'Address': 'Address information',
            'Contact': 'Contact details',
            'Invoice': 'Invoice data',
            'Payment': 'Payment information',
            'Subscription': 'Subscription details'
        };

        return descriptions[className] || `${className} data model`;
    }

    private getPropertyDescription(prop: ModelProperty): string {
        const name = prop.name.toLowerCase();

        // Common property descriptions
        const descriptions: { [key: string]: string } = {
            'id': 'Unique identifier',
            'uuid': 'Universally unique identifier',
            'name': 'Display name',
            'title': 'Title or heading',
            'description': 'Detailed description',
            'email': 'Email address',
            'phone': 'Phone number',
            'url': 'Website URL',
            'website': 'Website URL',
            'address': 'Physical address',
            'city': 'City name',
            'state': 'State or province',
            'country': 'Country name',
            'zipcode': 'Postal code',
            'zip': 'Postal code',
            'age': 'Age in years',
            'birthday': 'Date of birth',
            'birthdate': 'Date of birth',
            'createdat': 'Creation timestamp',
            'updatedat': 'Last update timestamp',
            'deletedat': 'Deletion timestamp',
            'isactive': 'Active status flag',
            'active': 'Active status flag',
            'isenabled': 'Enabled status flag',
            'enabled': 'Enabled status flag',
            'ispublic': 'Public visibility flag',
            'public': 'Public visibility flag',
            'price': 'Price amount',
            'amount': 'Monetary amount',
            'quantity': 'Item quantity',
            'stock': 'Stock quantity',
            'rating': 'Rating score',
            'score': 'Numeric score',
            'tags': 'Associated tags',
            'categories': 'Associated categories',
            'permissions': 'User permissions',
            'role': 'User role',
            'status': 'Current status',
            'type': 'Item type',
            'content': 'Main content',
            'body': 'Content body',
            'summary': 'Brief summary',
            'excerpt': 'Content excerpt',
            'slug': 'URL-friendly identifier',
            'token': 'Authentication token',
            'password': 'User password',
            'avatar': 'Profile picture URL',
            'image': 'Image URL',
            'thumbnail': 'Thumbnail image URL'
        };

        // Check for exact matches first
        if (descriptions[name]) {
            return descriptions[name];
        }

        // Check for partial matches
        for (const [key, desc] of Object.entries(descriptions)) {
            if (name.includes(key)) {
                return desc;
            }
        }

        // Generate description based on property characteristics
        if (prop.isArray) {
            return `Collection of ${prop.type.toLowerCase()} items`;
        }

        if (prop.type === 'boolean') {
            return `${this.camelCaseToWords(prop.name)} flag`;
        }

        if (prop.type === 'Date') {
            return `${this.camelCaseToWords(prop.name)} date`;
        }

        if (prop.type === 'number') {
            return `${this.camelCaseToWords(prop.name)} value`;
        }

        return this.camelCaseToWords(prop.name);
    }

    private getJSDocType(prop: ModelProperty): string {
        let type = prop.type;

        if (prop.isArray) {
            type = `${type}[]`;
        }

        if (prop.isOptional) {
            type = `${type}|undefined`;
        }

        return type;
    }

    private camelCaseToWords(str: string): string {
        return str
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }
}