import * as path from 'path';
import { ModelParser } from './model-parser';
import { FormGenerator, GenerationOptions } from './form-generator';
import { SchemaGenerator } from './schema-generator';
import { FileWriter } from './file-writer';
import { PackageManager } from '../utils/package-manager';

export interface GeneratorConfig {
    modelFilePath: string;
    modelClassName: string;
    outputDirectory: string;
    componentName: string;
    serviceName?: string;
    mode: 'reactive' | 'ngModel' | 'signals';
    generateSchema?: 'zod' | 'yup' | 'none';
    generateModule?: boolean;
    workspaceRoot?: string; // Add workspace root for package management
    angularVersion?: number; // Angular major version for version-specific features
}

export class FormGeneratorOrchestrator {
    private modelParser: ModelParser;
    private formGenerator: FormGenerator;
    private schemaGenerator: SchemaGenerator;
    private fileWriter: FileWriter;

    constructor() {
        this.modelParser = new ModelParser();
        this.formGenerator = new FormGenerator();
        this.schemaGenerator = new SchemaGenerator();
        this.fileWriter = new FileWriter();
    }

    async generateForm(config: GeneratorConfig): Promise<void> {
        // Parse the model
        const model = this.modelParser.parseModelFromFile(
            config.modelFilePath,
            config.modelClassName
        );

        if (!model) {
            throw new Error(`Could not find class '${config.modelClassName}' in file '${config.modelFilePath}'`);
        }

        // Prepare generation options
        const options: GenerationOptions = {
            componentName: config.componentName,
            serviceName: config.serviceName,
            mode: config.mode,
            generateSchema: config.generateSchema,
            generateModule: config.generateModule,
            angularVersion: config.angularVersion,
            modelFilePath: config.modelFilePath,
            outputDirectory: path.join(config.outputDirectory, config.componentName),
        };

        // Generate component files
        const componentDir = path.join(config.outputDirectory, config.componentName);

        // Generate TypeScript component
        const componentContent = this.formGenerator.generateComponent(model, options);
        const componentPath = path.join(componentDir, `${config.componentName}.component.ts`);
        this.fileWriter.writeFile(componentPath, componentContent);

        // Generate HTML template
        const templateContent = this.formGenerator.generateTemplate(model, options);
        const templatePath = path.join(componentDir, `${config.componentName}.component.html`);
        this.fileWriter.writeFile(templatePath, templateContent);

        // Generate CSS styles
        const cssContent = this.fileWriter.generateCssFile(config.componentName);
        const cssPath = path.join(componentDir, `${config.componentName}.component.css`);
        this.fileWriter.writeFile(cssPath, cssContent);

        // Generate module file if enabled
        const createdFiles = [
            path.relative(process.cwd(), componentPath),
            path.relative(process.cwd(), templatePath),
            path.relative(process.cwd(), cssPath)
        ];

        if (config.generateModule) {
            const moduleContent = this.fileWriter.generateModuleFile(config.componentName, config.mode);
            const modulePath = path.join(componentDir, `${config.componentName}.module.ts`);
            this.fileWriter.writeFile(modulePath, moduleContent);
            createdFiles.push(path.relative(process.cwd(), modulePath));
        }

        // Check and install schema packages if needed
        if (config.generateSchema && config.generateSchema !== 'none' && config.workspaceRoot) {
            const packageManager = new PackageManager(config.workspaceRoot);
            const packageInstalled = await packageManager.ensureSchemaPackage(config.generateSchema);

            if (!packageInstalled) {
                console.warn(`⚠️ ${config.generateSchema} package not installed. Schema file will be generated but may not work until package is installed.`);
            }
        }

        // Generate schema file if requested
        if (config.generateSchema && config.generateSchema !== 'none') {
            const schemaContent = config.generateSchema === 'zod'
                ? this.schemaGenerator.generateZodSchema(model)
                : this.schemaGenerator.generateYupSchema(model);

            const schemaPath = path.join(componentDir, `${config.componentName}.schema.ts`);
            this.fileWriter.writeFile(schemaPath, schemaContent);
            createdFiles.push(path.relative(process.cwd(), schemaPath));
        }

        console.log(`✅ Generated form component '${config.componentName}' in '${componentDir}'`);
        console.log(`📁 Files created:`);
        createdFiles.forEach(file => {
            console.log(`   - ${file}`);
        });
    }
}