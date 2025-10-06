import * as fs from 'fs';
import * as path from 'path';

export class FileWriter {
    ensureDirectoryExists(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    writeFile(filePath: string, content: string): void {
        const dir = path.dirname(filePath);
        this.ensureDirectoryExists(dir);
        fs.writeFileSync(filePath, content, 'utf8');
    }

    generateCssFile(componentName: string): string {
        return `/* Bootstrap-based styles for ${componentName} component */
/* Add any custom styles here that aren't covered by Bootstrap */

.${componentName}-container {
  /* Use .container or .container-fluid from Bootstrap instead */
}

/* Custom validation styles to complement Bootstrap */
.form-control.ng-invalid.ng-touched {
  border-color: var(--bs-danger);
  box-shadow: 0 0 0 0.25rem rgba(var(--bs-danger-rgb), 0.25);
}

.form-control.ng-valid.ng-touched {
  border-color: var(--bs-success);
  box-shadow: 0 0 0 0.25rem rgba(var(--bs-success-rgb), 0.25);
}

/* Custom error message styling */
.invalid-feedback.d-block {
  display: block !important;
}

/* Loading state for submit button */
.btn-loading {
  position: relative;
}

.btn-loading::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  margin: auto;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive adjustments */
@media (max-width: 576px) {
  .${componentName}-container {
    padding: 1rem;
  }
  
  .btn-group-vertical .btn {
    margin-bottom: 0.5rem;
  }
}`;
    } generateModuleFile(componentName: string, mode: string): string {
        const pascalComponentName = this.toPascalCase(componentName);
        const imports = this.getModuleImports(mode);

        return `import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
${imports}
import { ${pascalComponentName}Component } from './${componentName}.component';

@NgModule({
  declarations: [
    ${pascalComponentName}Component
  ],
  imports: [
    CommonModule,${this.getModuleImportsArray(mode)}
  ],
  exports: [
    ${pascalComponentName}Component
  ]
})
export class ${pascalComponentName}Module { }`;
    }

    private getModuleImports(mode: string): string {
        switch (mode) {
            case 'reactive':
                return 'import { ReactiveFormsModule } from \'@angular/forms\';';
            case 'ngModel':
                return 'import { FormsModule } from \'@angular/forms\';';
            case 'signals':
                return '';
            default:
                return '';
        }
    }

    private getModuleImportsArray(mode: string): string {
        switch (mode) {
            case 'reactive':
                return '\n    ReactiveFormsModule';
            case 'ngModel':
                return '\n    FormsModule';
            case 'signals':
                return '';
            default:
                return '';
        }
    }

    private toPascalCase(str: string): string {
        return str
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('');
    }
}