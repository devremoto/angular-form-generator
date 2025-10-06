import { ModelClass, ModelProperty } from './model-parser';

export interface GenerationOptions {
    componentName: string;
    serviceName?: string;
    mode: 'reactive' | 'ngModel' | 'signals';
    generateSchema?: 'zod' | 'yup' | 'none';
}

export class FormGenerator {
    generateComponent(model: ModelClass, options: GenerationOptions): string {
        switch (options.mode) {
            case 'reactive':
                return this.generateReactiveForm(model, options);
            case 'ngModel':
                return this.generateTemplateForm(model, options);
            case 'signals':
                return this.generateSignalForm(model, options);
            default:
                throw new Error(`Unsupported mode: ${options.mode}`);
        }
    }

    generateTemplate(model: ModelClass, options: GenerationOptions): string {
        const formFields = model.properties
            .map(prop => this.generateTemplateField(prop, options.mode, model.name))
            .join('\n\n');

        return `<div class="container-fluid">
  <div class="row justify-content-center">
    <div class="col-12 col-md-8 col-lg-6">
      <form ${this.getFormBinding(options)} class="needs-validation" novalidate>
        <div class="card">
          <div class="card-header">
            <h5 class="card-title mb-0">${this.toDisplayName(model.name)} Form</h5>
          </div>
          <div class="card-body">
${formFields}
          </div>
          <div class="card-footer">
            <div class="d-flex gap-2 justify-content-end">
              <button 
                type="button" 
                class="btn btn-outline-secondary"
                (click)="onReset()"
              >
                <i class="bi bi-arrow-clockwise me-1"></i>
                Reset
              </button>
              <button 
                type="submit" 
                class="btn btn-primary"
                ${this.getSubmitBinding(options)}
              >
                <i class="bi bi-check-circle me-1"></i>
                Submit
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
</div>`;
    } private generateReactiveForm(model: ModelClass, options: GenerationOptions): string {
        const imports = this.generateReactiveImports(options);
        const injectStatements = this.generateInjectStatements(options);
        const formGroupInit = this.generateFormGroupInit(model);
        const onSubmitMethod = this.generateOnSubmitMethod(model, options);
        const onResetMethod = this.generateOnResetMethod(options);
        const modelImport = this.generateModelImport(model, options);

        return `${imports}
${modelImport}

@Component({
  selector: 'app-${options.componentName}',
  templateUrl: './${options.componentName}.component.html',
  styleUrls: ['./${options.componentName}.component.css']
})
export class ${this.toPascalCase(options.componentName)}Component {
  ${options.componentName}Form: FormGroup;
${injectStatements}

  constructor() {
    this.${options.componentName}Form = this.fb.group({
${formGroupInit}
    });
  }



${onSubmitMethod}

${onResetMethod}

  // Getter methods for form controls
${model.properties.map(prop => `  get ${prop.name}() { return this.${options.componentName}Form.get('${prop.name}'); }`).join('\n')}
}`;
    }

    private generateTemplateForm(model: ModelClass, options: GenerationOptions): string {
        const imports = this.generateTemplateImports(options);
        const modelProperty = this.generateModelProperty(model);
        const onSubmitMethod = this.generateOnSubmitMethod(model, options);
        const onResetMethod = this.generateTemplateFormResetMethod(model);
        const modelImport = this.generateModelImport(model, options);
        const injectStatements = this.generateInjectStatements(options);

        return `${imports}
${modelImport}

@Component({
  selector: 'app-${options.componentName}',
  templateUrl: './${options.componentName}.component.html',
  styleUrls: ['./${options.componentName}.component.css']
})
export class ${this.toPascalCase(options.componentName)}Component{
  ${model.name.toLowerCase()}: ${this.getModelType(model, options)};
${injectStatements}

  constructor() {
    this.${model.name.toLowerCase()} = ${modelProperty};
  }

${onSubmitMethod}

${onResetMethod}
}`;
    }

    private generateSignalForm(model: ModelClass, options: GenerationOptions): string {
        const imports = this.generateSignalImports(options);
        const signalProperties = this.generateSignalProperties(model);
        const onSubmitMethod = this.generateOnSubmitMethod(model, options);
        const onResetMethod = this.generateSignalResetMethod(model);
        const modelImport = this.generateModelImport(model, options);
        const injectStatements = this.generateInjectStatements(options);

        return `${imports}
${modelImport}

@Component({
  selector: 'app-${options.componentName}',
  templateUrl: './${options.componentName}.component.html',
  styleUrls: ['./${options.componentName}.component.css']
})
export class ${this.toPascalCase(options.componentName)}Component {
${signalProperties}
${injectStatements}


${onSubmitMethod}

${onResetMethod}
}`;
    } private generateReactiveImports(options?: GenerationOptions): string {
        return `import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';`;
    }

    private generateTemplateImports(options?: GenerationOptions): string {
        return `import { Component, ${(options && options.serviceName) ? 'inject' : ''} } from '@angular/core';
import { NgForm } from '@angular/forms';`;
    }

    private generateSignalImports(options?: GenerationOptions): string {
        return `import { Component, signal, ${options && options.serviceName ? 'inject' : ''} } from '@angular/core';`;
    }

    private generateInjectStatements(options: GenerationOptions): string {
        const statements = options.mode === 'reactive' ? [`  private fb = inject(FormBuilder);`] : [];

        if (options.serviceName) {
            statements.push(`  private ${options.serviceName} = inject(${this.toPascalCase(options.serviceName)}Service);`);
        }

        return statements.join('\n');
    }

    private generateModelImport(model: ModelClass, options: GenerationOptions): string {
        if (options.generateSchema === 'zod') {
            return `import { ${model.name.toLowerCase()}Schema } from './${options.componentName}.schema';
import { z } from 'zod';`;
        } else if (options.generateSchema === 'yup') {
            return `import { ${model.name.toLowerCase()}Schema } from './${options.componentName}.schema';
import * as yup from 'yup';`;
        }

        // Import the actual model when no schema
        return `import { ${model.name} } from '../models/${model.name.toLowerCase()}';`;
    }

    private getModelType(model: ModelClass, options: GenerationOptions): string {
        if (options.generateSchema === 'zod') {
            return `z.infer<typeof ${model.name.toLowerCase()}Schema>`;
        } else if (options.generateSchema === 'yup') {
            return `yup.InferType<typeof ${model.name.toLowerCase()}Schema>`;
        }
        return model.name;
    }

    private generateValidationCode(model: ModelClass, options: GenerationOptions): string {
        if (options.generateSchema === 'zod') {
            return `// Validate with Zod schema
      try {
        const validatedData = ${model.name.toLowerCase()}Schema.parse(formValue);
        if (!validatedData) return;
        // Data is valid
      } catch (error) {
        console.error('Validation failed:', error);
        return;
      }`;
        } else if (options.generateSchema === 'yup') {
            return `// Validate with Yup schema
      try {
        await ${model.name.toLowerCase()}Schema.validate(this.${model.name.toLowerCase()});
        // Data is valid
      } catch (error) {
        console.error('Validation failed:', error);
        return;
      }`;
        }
        return '// No additional validation schema';
    }

    private generateSignalValidationCode(model: ModelClass, options: GenerationOptions): string {
        if (options.generateSchema === 'zod') {
            return `// Validate with Zod schema
    try {
      const validatedData = ${model.name.toLowerCase()}Schema.parse(formData);
      if (!validatedData) return;
      // Data is valid
    } catch (error) {
      console.error('Validation failed:', error);
      return;
    }`;
        } else if (options.generateSchema === 'yup') {
            return `// Validate with Yup schema
    try {
      await ${model.name.toLowerCase()}Schema.validate(formData);
      // Data is valid
    } catch (error) {
      console.error('Validation failed:', error);
      return;
    }`;
        }
        return '// No additional validation schema';
    } private generateFormGroupInit(model: ModelClass): string {
        return model.properties
            .map(prop => {
                const validators = this.generateValidators(prop);
                const defaultValue = this.getDefaultValue(prop);
                return `      ${prop.name}: [${defaultValue}${validators ? `, ${validators}` : ''}]`;
            })
            .join(',\n');
    }

    private generateModelProperty(model: ModelClass): string {
        const properties = model.properties
            .map(prop => `${prop.name}: ${this.getDefaultValue(prop)}`)
            .join(',\n    ');

        return `{\n    ${properties}\n  }`;
    }

    private generateSignalProperties(model: ModelClass): string {
        return model.properties
            .map(prop => `  ${prop.name} = signal(${this.getDefaultValue(prop)});`)
            .join('\n');
    }

    private generateValidators(prop: ModelProperty): string {
        const validators: string[] = [];

        // Check JSDoc validation first, then fallback to property-based validation
        if (prop.jsDocValidation) {
            if (prop.jsDocValidation.required) {
                validators.push('Validators.required');
            }

            if (prop.jsDocValidation.minLength !== undefined) {
                validators.push(`Validators.minLength(${prop.jsDocValidation.minLength})`);
            }

            if (prop.jsDocValidation.maxLength !== undefined) {
                validators.push(`Validators.maxLength(${prop.jsDocValidation.maxLength})`);
            }

            if (prop.jsDocValidation.min !== undefined) {
                validators.push(`Validators.min(${prop.jsDocValidation.min})`);
            }

            if (prop.jsDocValidation.max !== undefined) {
                validators.push(`Validators.max(${prop.jsDocValidation.max})`);
            }

            if (prop.jsDocValidation.email) {
                validators.push('Validators.email');
            }

            if (prop.jsDocValidation.pattern) {
                validators.push(`Validators.pattern('${prop.jsDocValidation.pattern}')`);
            }

            if (prop.jsDocValidation.url) {
                validators.push(`Validators.pattern('^https?:\\/\\/.+\\..+')`);
            }

            if (prop.jsDocValidation.phoneNumber) {
                validators.push(`Validators.pattern('^\\\\+?[1-9]\\\\d{1,14}$')`);
            }

            if (prop.jsDocValidation.alphanumeric) {
                validators.push(`Validators.pattern('^[a-zA-Z0-9]+$')`);
            }

            if (prop.jsDocValidation.numeric) {
                validators.push(`Validators.pattern('^[0-9]+$')`);
            }

            if (prop.jsDocValidation.alpha) {
                validators.push(`Validators.pattern('^[a-zA-Z]+$')`);
            }
        } else {
            // Fallback to property-based validation
            if (!prop.isOptional) {
                validators.push('Validators.required');
            }

            if (prop.type === 'string') {
                validators.push('Validators.minLength(1)');
            }

            if (prop.type === 'number') {
                validators.push('Validators.min(0)');
            }

            if (prop.name.toLowerCase().includes('email')) {
                validators.push('Validators.email');
            }
        }

        return validators.length > 0 ? `[${validators.join(', ')}]` : '';
    } private generateTemplateField(prop: ModelProperty, mode: string, modelName?: string): string {
        const inputType = this.getInputType(prop);
        const isRequired = !prop.isOptional;

        // Special handling for different input types
        if (prop.type === 'boolean') {
            return this.generateCheckboxField(prop, mode, modelName, isRequired);
        }

        if (prop.isArray && prop.type === 'string') {
            return this.generateSelectField(prop, mode, modelName, isRequired);
        }

        if (prop.name.toLowerCase().includes('bio') || prop.name.toLowerCase().includes('description') || prop.name.toLowerCase().includes('content')) {
            return this.generateTextareaField(prop, mode, modelName, isRequired);
        }

        switch (mode) {
            case 'reactive':
                const placeholder = prop.description ||
                    `Enter ${this.toDisplayName(prop.name).toLowerCase()}`;

                return `    <div class="mb-3">
      <label for="${prop.name}" class="form-label">${this.toDisplayName(prop.name)}${isRequired ? ' *' : ''}</label>
      <input 
        id="${prop.name}"
        type="${inputType}"
        class="form-control"
        formControlName="${prop.name}"
        [class.is-invalid]="${prop.name}?.invalid && ${prop.name}?.touched"
        [class.is-valid]="${prop.name}?.valid && ${prop.name}?.touched"
        placeholder="${placeholder}"
      />
      <div *ngIf="${prop.name}?.invalid && ${prop.name}?.touched" class="invalid-feedback d-block">
        <div *ngIf="${prop.name}?.errors?.['required']">${this.toDisplayName(prop.name)} is required</div>
        <div *ngIf="${prop.name}?.errors?.['email']">Please enter a valid email</div>
        <div *ngIf="${prop.name}?.errors?.['minlength']">Minimum length required</div>
        <div *ngIf="${prop.name}?.errors?.['maxlength']">Maximum length exceeded</div>
        <div *ngIf="${prop.name}?.errors?.['min']">Value must be greater than ${prop.jsDocValidation?.min || 0}</div>
        <div *ngIf="${prop.name}?.errors?.['max']">Value must be less than ${prop.jsDocValidation?.max || 100}</div>
        <div *ngIf="${prop.name}?.errors?.['pattern']">Invalid format</div>
      </div>
    </div>`;

            case 'ngModel':
                const modelVar = modelName?.toLowerCase() || 'model';
                const ngModelPlaceholder = prop.description ||
                    `Enter ${this.toDisplayName(prop.name).toLowerCase()}`;

                return `    <div class="mb-3">
      <label for="${prop.name}" class="form-label">${this.toDisplayName(prop.name)}${isRequired ? ' *' : ''}</label>
      <input 
        id="${prop.name}"
        type="${inputType}"
        class="form-control"
        name="${prop.name}"
        [(ngModel)]="${modelVar}.${prop.name}"
        ${isRequired ? 'required' : ''}
        #${prop.name}Ref="ngModel"
        [class.is-invalid]="${prop.name}Ref.invalid && ${prop.name}Ref.touched"
        [class.is-valid]="${prop.name}Ref.valid && ${prop.name}Ref.touched"
        placeholder="${ngModelPlaceholder}"
      />
      <div *ngIf="${prop.name}Ref.invalid && ${prop.name}Ref.touched" class="invalid-feedback d-block">
        <div *ngIf="${prop.name}Ref.errors?.['required']">${this.toDisplayName(prop.name)} is required</div>
        <div *ngIf="${prop.name}Ref.errors?.['email']">Please enter a valid email</div>
      </div>
    </div>`;

            case 'signals':
                const signalsPlaceholder = prop.description ||
                    `Enter ${this.toDisplayName(prop.name).toLowerCase()}`;

                return `    <div class="mb-3">
      <label for="${prop.name}" class="form-label">${this.toDisplayName(prop.name)}${isRequired ? ' *' : ''}</label>
      <input 
        id="${prop.name}"
        type="${inputType}"
        class="form-control"
        [value]="${prop.name}()"
        (input)="${prop.name}.set($any($event.target).value)"
        placeholder="${signalsPlaceholder}"
      />
    </div>`;
        }

        return '';
    } private getFormBinding(options: GenerationOptions): string {
        switch (options.mode) {
            case 'reactive':
                return `[formGroup]="${options.componentName}Form" (ngSubmit)="onSubmit()"`;
            case 'ngModel':
                return `#form="ngForm" (ngSubmit)="onSubmit(form)"`;
            case 'signals':
                return `(ngSubmit)="onSubmit()"`;
            default:
                return '';
        }
    }

    private getSubmitBinding(options: GenerationOptions): string {
        switch (options.mode) {
            case 'reactive':
                return `[disabled]="${options.componentName}Form.invalid"`;
            case 'ngModel':
                return `[disabled]="form.invalid"`;
            case 'signals':
                return '';
            default:
                return '';
        }
    }

    private generateOnSubmitMethod(model: ModelClass, options: GenerationOptions): string {
        switch (options.mode) {
            case 'reactive':
                const validationCode = this.generateValidationCode(model, options);
                return `  onSubmit(): void {
    if (this.${options.componentName}Form.valid) {
      const formValue: ${this.getModelType(model, options)} = this.${options.componentName}Form.value;
      ${validationCode}
      console.log('Form submitted:', formValue);
      ${options.serviceName ? `// this.${options.serviceName}.save${model.name}(formValue);` : ''}
    }
  }`;

            case 'ngModel':
                const templateValidationCode = this.generateValidationCode(model, options);
                return `  onSubmit(form: NgForm): void {
    if (form.valid) {
      ${templateValidationCode}
      console.log('Form submitted:', this.${model.name.toLowerCase()});
      ${options.serviceName ? `// this.${options.serviceName}.save${model.name}(this.${model.name.toLowerCase()});` : ''}
    }
  }`;

            case 'signals':
                const signalValidationCode = this.generateSignalValidationCode(model, options);
                return ` async onSubmit(): Promise<void> {
    const formData: ${this.getModelType(model, options)} = {
${model.properties.map(prop => `      ${prop.name}: this.${prop.name}()`).join(',\n')}
    };
    ${signalValidationCode}
    console.log('Form submitted:', formData);
    ${options.serviceName ? `// this.${options.serviceName}.save${model.name}(formData);` : ''}
  }`;
        }
        return '';
    } private generateOnResetMethod(options: GenerationOptions): string {
        return `  onReset(): void {
    this.${options.componentName}Form.reset();
  }`;
    }

    private generateTemplateFormResetMethod(model: ModelClass): string {
        const resetStatements = model.properties
            .map(prop => `    this.${model.name.toLowerCase()}.${prop.name} = ${this.getDefaultValue(prop)};`)
            .join('\n');

        return `  onReset(): void {
${resetStatements}
  }`;
    }

    private generateSignalResetMethod(model: ModelClass): string {
        const resetStatements = model.properties
            .map(prop => `    this.${prop.name}.set(${this.getDefaultValue(prop)});`)
            .join('\n');

        return `  onReset(): void {
${resetStatements}
  }`;
    }

    private getInputType(prop: ModelProperty): string {
        if (prop.name.toLowerCase().includes('email')) return 'email';
        if (prop.name.toLowerCase().includes('password')) return 'password';
        if (prop.name.toLowerCase().includes('phone')) return 'tel';
        if (prop.name.toLowerCase().includes('url')) return 'url';
        if (prop.type === 'number') return 'number';
        if (prop.type === 'boolean') return 'checkbox';
        if (prop.type === 'Date') return 'date';
        return 'text';
    }

    private getDefaultValue(prop: ModelProperty): string {
        if (prop.initialValue) return prop.initialValue;
        if (prop.type === 'string') return "''";
        if (prop.type === 'number') return '0';
        if (prop.type === 'boolean') return 'false';
        if (prop.isArray) return '[]';
        return 'null';
    }

    private toDisplayName(name: string): string {
        return name
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    private toPascalCase(str: string): string {
        return str
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('');
    }

    private generateCheckboxField(prop: ModelProperty, mode: string, modelName?: string, isRequired?: boolean): string {
        switch (mode) {
            case 'reactive':
                return `    <div class="mb-3">
      <div class="form-check">
        <input 
          id="${prop.name}"
          type="checkbox"
          class="form-check-input"
          formControlName="${prop.name}"
        />
        <label for="${prop.name}" class="form-check-label">
          ${this.toDisplayName(prop.name)}${isRequired ? ' *' : ''}
        </label>
      </div>
    </div>`;

            case 'ngModel':
                const modelVar = modelName?.toLowerCase() || 'model';
                return `    <div class="mb-3">
      <div class="form-check">
        <input 
          id="${prop.name}"
          type="checkbox"
          class="form-check-input"
          name="${prop.name}"
          [(ngModel)]="${modelVar}.${prop.name}"
        />
        <label for="${prop.name}" class="form-check-label">
          ${this.toDisplayName(prop.name)}${isRequired ? ' *' : ''}
        </label>
      </div>
    </div>`;

            case 'signals':
                return `    <div class="mb-3">
      <div class="form-check">
        <input 
          id="${prop.name}"
          type="checkbox"
          class="form-check-input"
          [checked]="${prop.name}()"
          (change)="${prop.name}.set($any($event.target).checked)"
        />
        <label for="${prop.name}" class="form-check-label">
          ${this.toDisplayName(prop.name)}${isRequired ? ' *' : ''}
        </label>
      </div>
    </div>`;
        }
        return '';
    }

    private generateTextareaField(prop: ModelProperty, mode: string, modelName?: string, isRequired?: boolean): string {
        switch (mode) {
            case 'reactive':
                return `    <div class="mb-3">
      <label for="${prop.name}" class="form-label">${this.toDisplayName(prop.name)}${isRequired ? ' *' : ''}</label>
      <textarea 
        id="${prop.name}"
        class="form-control"
        formControlName="${prop.name}"
        rows="4"
        [class.is-invalid]="${prop.name}?.invalid && ${prop.name}?.touched"
        [class.is-valid]="${prop.name}?.valid && ${prop.name}?.touched"
        placeholder="Enter ${this.toDisplayName(prop.name).toLowerCase()}"
      ></textarea>
      <div *ngIf="${prop.name}?.invalid && ${prop.name}?.touched" class="invalid-feedback d-block">
        <div *ngIf="${prop.name}?.errors?.['required']">${this.toDisplayName(prop.name)} is required</div>
        <div *ngIf="${prop.name}?.errors?.['minlength']">Minimum length required</div>
      </div>
    </div>`;

            case 'ngModel':
                const modelVar = modelName?.toLowerCase() || 'model';
                return `    <div class="mb-3">
      <label for="${prop.name}" class="form-label">${this.toDisplayName(prop.name)}${isRequired ? ' *' : ''}</label>
      <textarea 
        id="${prop.name}"
        class="form-control"
        name="${prop.name}"
        [(ngModel)]="${modelVar}.${prop.name}"
        rows="4"
        ${isRequired ? 'required' : ''}
        #${prop.name}Ref="ngModel"
        [class.is-invalid]="${prop.name}Ref.invalid && ${prop.name}Ref.touched"
        [class.is-valid]="${prop.name}Ref.valid && ${prop.name}Ref.touched"
        placeholder="Enter ${this.toDisplayName(prop.name).toLowerCase()}"
      ></textarea>
      <div *ngIf="${prop.name}Ref.invalid && ${prop.name}Ref.touched" class="invalid-feedback d-block">
        <div *ngIf="${prop.name}Ref.errors?.['required']">${this.toDisplayName(prop.name)} is required</div>
      </div>
    </div>`;

            case 'signals':
                return `    <div class="mb-3">
      <label for="${prop.name}" class="form-label">${this.toDisplayName(prop.name)}${isRequired ? ' *' : ''}</label>
      <textarea 
        id="${prop.name}"
        class="form-control"
        rows="4"
        [value]="${prop.name}()"
        (input)="${prop.name}.set($any($event.target).value)"
        placeholder="Enter ${this.toDisplayName(prop.name).toLowerCase()}"
      ></textarea>
    </div>`;
        }
        return '';
    }

    private generateSelectField(prop: ModelProperty, mode: string, modelName?: string, isRequired?: boolean): string {
        // For array types, we'll create a simple select with placeholder options
        const options = ['Option 1', 'Option 2', 'Option 3']; // In real scenario, this could be dynamic

        switch (mode) {
            case 'reactive':
                return `    <div class="mb-3">
      <label for="${prop.name}" class="form-label">${this.toDisplayName(prop.name)}${isRequired ? ' *' : ''}</label>
      <select 
        id="${prop.name}"
        class="form-select"
        formControlName="${prop.name}"
        [class.is-invalid]="${prop.name}?.invalid && ${prop.name}?.touched"
        [class.is-valid]="${prop.name}?.valid && ${prop.name}?.touched"
      >
        <option value="">Select ${this.toDisplayName(prop.name).toLowerCase()}</option>
        ${options.map(opt => `<option value="${opt.toLowerCase()}">${opt}</option>`).join('\n        ')}
      </select>
      <div *ngIf="${prop.name}?.invalid && ${prop.name}?.touched" class="invalid-feedback d-block">
        <div *ngIf="${prop.name}?.errors?.['required']">${this.toDisplayName(prop.name)} is required</div>
      </div>
    </div>`;

            case 'ngModel':
                const modelVar = modelName?.toLowerCase() || 'model';
                return `    <div class="mb-3">
      <label for="${prop.name}" class="form-label">${this.toDisplayName(prop.name)}${isRequired ? ' *' : ''}</label>
      <select 
        id="${prop.name}"
        class="form-select"
        name="${prop.name}"
        [(ngModel)]="${modelVar}.${prop.name}"
        ${isRequired ? 'required' : ''}
        #${prop.name}Ref="ngModel"
        [class.is-invalid]="${prop.name}Ref.invalid && ${prop.name}Ref.touched"
        [class.is-valid]="${prop.name}Ref.valid && ${prop.name}Ref.touched"
      >
        <option value="">Select ${this.toDisplayName(prop.name).toLowerCase()}</option>
        ${options.map(opt => `<option value="${opt.toLowerCase()}">${opt}</option>`).join('\n        ')}
      </select>
      <div *ngIf="${prop.name}Ref.invalid && ${prop.name}Ref.touched" class="invalid-feedback d-block">
        <div *ngIf="${prop.name}Ref.errors?.['required']">${this.toDisplayName(prop.name)} is required</div>
      </div>
    </div>`;

            case 'signals':
                return `    <div class="mb-3">
      <label for="${prop.name}" class="form-label">${this.toDisplayName(prop.name)}${isRequired ? ' *' : ''}</label>
      <select 
        id="${prop.name}"
        class="form-select"
        [value]="${prop.name}()"
        (change)="${prop.name}.set($any($event.target).value)"
      >
        <option value="">Select ${this.toDisplayName(prop.name).toLowerCase()}</option>
        ${options.map(opt => `<option value="${opt.toLowerCase()}">${opt}</option>`).join('\n        ')}
      </select>
    </div>`;
        }
        return '';
    }
}