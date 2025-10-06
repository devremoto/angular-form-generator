import { ModelClass, ModelProperty } from './model-parser';

export class SchemaGenerator {
    generateZodSchema(model: ModelClass): string {
        const imports = `import { z } from 'zod';`;
        const schemaDefinition = this.generateZodSchemaDefinition(model);
        const typeExport = `export type ${model.name} = z.infer<typeof ${model.name.toLowerCase()}Schema>;`;

        return `${imports}

${schemaDefinition}

${typeExport}`;
    }

    generateYupSchema(model: ModelClass): string {
        const imports = `import * as yup from 'yup';`;
        const schemaDefinition = this.generateYupSchemaDefinition(model);

        return `${imports}

${schemaDefinition}`;
    }

    private generateZodSchemaDefinition(model: ModelClass): string {
        const fields = model.properties
            .map(prop => this.generateZodField(prop))
            .join(',\n');

        return `export const ${model.name.toLowerCase()}Schema = z.object({
${fields}
});`;
    }

    private generateYupSchemaDefinition(model: ModelClass): string {
        const fields = model.properties
            .map(prop => this.generateYupField(prop))
            .join(',\n');

        return `export const ${model.name.toLowerCase()}Schema = yup.object({
${fields}
});`;
    }

    private generateZodField(prop: ModelProperty): string {
        let zodType = this.mapTypeToZod(prop.type);

        if (prop.isArray) {
            zodType = `z.array(${zodType})`;
        }

        const validations = this.generateZodValidations(prop);
        if (validations) {
            zodType += validations;
        }

        if (prop.isOptional) {
            zodType += '.optional()';
        }

        return `  ${prop.name}: ${zodType}`;
    }

    private generateYupField(prop: ModelProperty): string {
        let yupType = this.mapTypeToYup(prop.type);

        if (prop.isArray) {
            yupType = `yup.array().of(${yupType})`;
        }

        const validations = this.generateYupValidations(prop);
        if (validations) {
            yupType += validations;
        }

        if (!prop.isOptional) {
            yupType += '.required()';
        }

        return `  ${prop.name}: ${yupType}`;
    }

    private mapTypeToZod(type: string): string {
        switch (type.toLowerCase()) {
            case 'string':
                return 'z.string()';
            case 'number':
                return 'z.number()';
            case 'boolean':
                return 'z.boolean()';
            case 'date':
                return 'z.date()';
            default:
                return 'z.any()';
        }
    }

    private mapTypeToYup(type: string): string {
        switch (type.toLowerCase()) {
            case 'string':
                return 'yup.string()';
            case 'number':
                return 'yup.number()';
            case 'boolean':
                return 'yup.boolean()';
            case 'date':
                return 'yup.date()';
            default:
                return 'yup.mixed()';
        }
    }

    private generateZodValidations(prop: ModelProperty): string {
        const validations: string[] = [];

        if (prop.type === 'string') {
            if (prop.name.toLowerCase().includes('email')) {
                validations.push('.email()');
            }
            if (!prop.isOptional) {
                validations.push('.min(1, "This field is required")');
            }
        }

        if (prop.type === 'number') {
            validations.push('.min(0)');
        }

        return validations.join('');
    }

    private generateYupValidations(prop: ModelProperty): string {
        const validations: string[] = [];

        if (prop.type === 'string') {
            if (prop.name.toLowerCase().includes('email')) {
                validations.push('.email("Invalid email format")');
            }
            if (!prop.isOptional) {
                validations.push('.min(1, "This field is required")');
            }
        }

        if (prop.type === 'number') {
            validations.push('.min(0, "Value must be positive")');
        }

        return validations.join('');
    }
}