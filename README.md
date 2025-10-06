# Angular Form Scaffolder

A VS Code extension that automatically scaffolds Angular forms from TypeScript model classes. Supports reactive forms, template-driven forms, and Angular's new signal-based forms with modern patterns, intelligent JSDoc-driven validation, and automatic dependency management.

> **⚡ Productivity Tool for Form Scaffolding**  
> This extension is designed to boost your productivity by providing a solid foundation for Angular form development. The scaffolded code serves as a starting point that you should review, customize, and adapt to your specific project requirements. It handles the repetitive boilerplate work, allowing you to focus on the unique business logic and customizations needed for your application.

## Features

- 🚀 **Scaffold forms from TypeScript models** - Parse your model classes and create complete Angular forms
- 📝 **Multiple form types support**:
  - Reactive Forms (FormBuilder, FormGroup, Validators)
  - Template-driven Forms (ngModel)
  - Signal-based Forms (Angular 17+) *- automatically detected based on your Angular version*
- 🔍 **Smart Angular version detection** - Automatically detects your Angular version and shows appropriate form type options
- 💉 **Modern Angular patterns** - Uses `inject()` function instead of constructor injection
- 🎨 **Bootstrap-ready styling** - Uses Bootstrap 5 classes instead of custom CSS (reduces duplication)
- 🔧 **Schema validation** - Optional Zod or Yup schema generation with automatic package installation
- 📚 **JSDoc integration** - Generate intelligent JSDoc comments with validation rules
- 🎯 **Smart validation** - Use JSDoc annotations to drive form validation automatically
- 🧠 **Smart type inference** - Automatically detects types and requirements from initial values
- 📦 **Complete component scaffolding** - Creates TypeScript, HTML, CSS, and Module files
- 🔍 **Smart input detection** - Automatically detects checkboxes, textareas, and select fields
- ✅ **Built-in validation** - Generates form validation with Bootstrap feedback styles
- 📱 **Responsive design** - Uses Bootstrap grid system and responsive utilities
- 🔄 **Consolidated menu** - Unified context menu with back navigation support
- 🛠️ **Automatic dependency management** - Detects and installs required packages (Zod, Yup)

## 🎯 Important: Post-Scaffolding Adaptation

**The scaffolded code is a starting point, not a final solution.** After scaffolding, you should:

### ✅ **Review and Customize**
- **Validate generated validators** - Ensure they match your business requirements
- **Adjust form layouts** - Modify the HTML structure for your specific UI needs
- **Customize styling** - Adapt Bootstrap classes or add custom CSS as needed
- **Add business logic** - Implement specific submit handlers, API calls, and data processing

### ✅ **Adapt to Your Architecture**
- **Service integration** - Connect to your existing data services and APIs
- **State management** - Integrate with NgRx, Akita, or other state management solutions
- **Error handling** - Add comprehensive error handling and user feedback
- **Accessibility** - Enhance ARIA labels, keyboard navigation, and screen reader support

### ✅ **Enhance User Experience**
- **Custom validation messages** - Replace default messages with user-friendly text
- **Progressive enhancement** - Add features like auto-save, field dependencies, or dynamic sections
- **Performance optimization** - Implement lazy loading, OnPush change detection, or other optimizations
- **Testing** - Add unit tests, integration tests, and e2e tests for your customized forms

> **💡 Think of this extension as your coding assistant** - it handles the repetitive scaffolding work so you can focus on what makes your application unique and valuable to your users.

## Usage

### Method 1: Unified Context Menu (Recommended)

1. Right-click on a TypeScript file in the Explorer or Editor
2. Select "Angular Form Scaffolder" from the context menu
3. Choose from the available options:
   - 🔧 **Scaffold Form** - Create Angular form component from model class
   - 📄 **Generate JSDoc** - Add JSDoc comments with validation rules to model properties
   - 🎯 **Scaffold Form Here** - Scaffold form component using current file/model
   - ❌ **Cancel** - Close the menu

**Navigation Tips:**
- Use **← Back** option in dropdown menus to return to previous steps
- Press **Escape** in input fields to go back to the previous step
- The extension remembers your previous inputs when navigating back

### Method 2: Command Palette

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run one of these commands:
   - "Angular: Scaffold Form from Model"
   - "Angular: Scaffold Form from This Model"
   - "Angular: Generate JSDoc for Model"

### Step-by-Step Form Scaffolding Process

When generating a form, the extension guides you through these steps with full back navigation:

1. **📁 File Selection** - Choose your TypeScript model file (if not already selected)
2. **🏷️ Model Name** - Enter the class name to generate forms from
3. **⚙️ Form Type** - Select reactive, template-driven, or signal-based forms
4. **📝 Component Name** - Set the component name (auto-suggested from model name)
5. **📂 Output Directory** - Choose where to generate the files
6. **🔧 Service Name** - Optionally specify a service for data operations  
7. **✅ Validation Schema** - Choose Zod, Yup, or no schema validation

At any step, you can:
- Press **Escape** to go back to the previous step
- Select **← Back** from dropdown menus
- Cancel to exit the process entirely

The extension remembers your choices when navigating back, making it easy to correct mistakes or change configurations.

## JSDoc-Driven Validation

The extension can generate intelligent JSDoc comments for your model properties and use them to drive form validation. Here's an example:

### Before JSDoc Generation:
```typescript
export class User {
  firstName: string = '';
  email: string = '';
  age?: number;
}
```

### After JSDoc Generation:
```typescript
/**
 * User model representing user account information
 * @class User
 */
export class User {
  /**
   * User's first name
   * @type {string}
   * @required
   * @minLength 2
   * @maxLength 50
   * @alpha
   */
  firstName: string = '';

  /**
   * User's email address
   * @type {string}
   * @required
   * @email
   */
  email: string = '';

  /**
   * User's age in years
   * @type {number}
   * @min 1
   * @max 120
   */
  age?: number;
}
```

### Generated Form with JSDoc Validation:
When you generate a form from a model with JSDoc annotations, the extension automatically creates appropriate validators:

```typescript
userForm = this.fb.group({
  firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50), Validators.pattern('^[a-zA-Z]+$')]],
  email: ['', [Validators.required, Validators.email]],
  age: ['', [Validators.min(1), Validators.max(120)]]
});
```

## Smart Type Inference

The extension can automatically detect field types and requirements from initial values when TypeScript types are not explicitly defined:

### Type Detection Rules:

#### **Explicit Types** (Recommended)
```typescript
export class User {
  // Required fields (no ? or ! mark)
  name: string;
  age: number;
  isActive: boolean;
  
  // Optional fields (with ? mark)
  email?: string;
  phone?: number;
  
  // Optional fields (with ! definite assignment assertion)
  _id!: string;           // Will be assigned later → optional
  userId!: number;        // Will be assigned later → optional
  createdAt!: Date;       // Will be assigned later → optional
}
```

#### **Inferred from Initial Values**
When no explicit type is provided, the extension analyzes initial values:

```typescript
export class InferredModel {
  // Empty/Default values = Type inferred + Optional
  firstName = '';           // → string, optional
  lastName = "";            // → string, optional
  count = 0;               // → number, optional
  isActive = true;         // → boolean, optional (default value)
  isEnabled = false;       // → boolean, optional (default value)
  createdAt = new Date();  // → Date, optional (default constructor)
  settings = {};           // → object, optional
  items = [];              // → any[], optional
  
  // Non-empty/Specific values = Type inferred + Required
  title = 'Mr.';           // → string, required
  defaultAge = 18;         // → number, required
  birthDate = new Date('2000-01-01');  // → Date, required (specific date)
  scores = [1, 2, 3];      // → number[], required
  tags = ['a', 'b'];       // → string[], required
  config = { key: 'val' }; // → object, required
}
```

#### **Mixed Scenarios**
Explicit types with default values follow TypeScript syntax:

```typescript
export class MixedModel {
  // Explicit type overrides inference
  name: string = '';       // → string, required (explicit type)
  age: number = 0;         // → number, required (explicit type)
  active: boolean = false; // → boolean, required (explicit type)
  
  // Optional with explicit type
  email?: string = '';     // → string, optional (? mark)
}
```

### Generated Form with Smart Inference:
The form generator automatically creates appropriate validators based on the inferred requirements:

```typescript
// For inferred types
inferredForm = this.fb.group({
  firstName: [''],           // Optional, no validators
  count: [0],               // Optional, no validators  
  isActive: [true],         // Optional, no validators (default value)
  createdAt: [new Date()],  // Optional, no validators (default constructor)
  title: ['', [Validators.required]], // Required
  defaultAge: [18, [Validators.required, Validators.min(0)]],
  scores: [[1,2,3], [Validators.required]]  // Required
});
```

## Definite Assignment Assertion Pattern

The extension recognizes TypeScript's definite assignment assertion (`!`) and treats these fields as optional:

```typescript
export class DatabaseModel {
  // These fields will be assigned by the database/framework
  _id!: string;           // MongoDB ObjectId - assigned later
  id!: number;            // Auto-increment ID - assigned later  
  userId!: string;        // Foreign key - assigned later
  createdAt!: Date;       // Timestamp - assigned later
  updatedAt!: Date;       // Timestamp - assigned later
}

// Generated form treats them as optional:
databaseForm = this.fb.group({
  _id: [''],              // Optional - no validators
  id: [0],                // Optional - no validators
  userId: [''],           // Optional - no validators
  createdAt: [new Date()], // Optional - no validators
  updatedAt: [new Date()]  // Optional - no validators
});
```

**Why treat `!` fields as optional?**
- The `!` tells TypeScript "this will be assigned later, don't worry about initialization"
- These are typically auto-generated fields (IDs, timestamps, etc.)
- Users shouldn't be required to fill them in forms
- They're usually handled by the backend/database

## Example

Given a TypeScript model like this:

```typescript
export class User {
  id: number = 0;
  firstName: string = '';
  lastName: string = '';
  email: string = '';
  age?: number;
  isActive: boolean = true;
}
```

The extension will generate:

- **Component TypeScript file** with form logic and modern `inject()` patterns
- **HTML template** with Bootstrap-styled form fields and validation
- **CSS styles** for custom form styling
- **Angular module** with necessary imports
- **Optional validation schema** (Zod or Yup)

## Generated Form Types

### Reactive Forms (Default)
Uses FormBuilder, FormGroup, and reactive patterns with validators:

```typescript
export class UserFormComponent implements OnInit {
  userForm: FormGroup;
  private fb = inject(FormBuilder);

  constructor() {
    this.userForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(1)]],
      email: ['', [Validators.required, Validators.email]],
      age: ['', [Validators.min(0)]]
    });
  }
}
```

### Template-driven Forms
Uses ngModel and template reference variables:

```html
<form #form="ngForm" (ngSubmit)="onSubmit(form)">
  <input type="text" 
         name="firstName"
         [(ngModel)]="user.firstName" 
         required
         #firstNameRef="ngModel"
         class="form-control" />
</form>
```

### Signal-based Forms (Angular 17+)
Uses Angular's new signal API:

```typescript
export class UserFormComponent {
  firstName = signal('');
  email = signal('');
  age = signal(0);
}
```

## Scaffolded Files

The extension scaffolds the following files for each form component:

### Always Scaffolded
- **`component-name.component.ts`** - The TypeScript component class with form logic
- **`component-name.component.html`** - The HTML template with Bootstrap-styled form fields
- **`component-name.component.css`** - CSS styles for custom component styling

### Conditionally Scaffolded
- **`component-name.module.ts`** - Angular module file (when `generateModule` setting is `true`)
- **`component-name.schema.ts`** - Validation schema file (when Zod or Yup is selected)

### Module Scaffolding
Module files are useful when:
- Working with **Angular versions < 14** (before standalone components)
- Using **feature modules** for lazy loading
- Following **traditional Angular architecture** with NgModules
- **Team standards** require module-based organization

For modern Angular applications (14+), **standalone components** are preferred, so keep module scaffolding disabled.

## Schema Validation

### Zod Integration
```typescript
const userSchema = z.object({
  firstName: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(0).optional()
});

type User = z.infer<typeof userSchema>;
```

### Yup Integration
```typescript
const userSchema = yup.object({
  firstName: yup.string().required().min(1),
  email: yup.string().required().email(),
  age: yup.number().min(0)
});

type User = yup.InferType<typeof userSchema>;
```

### Automatic Package Installation
When you select Zod or Yup schema generation, the extension automatically:

1. **Checks if the package is installed** in your project dependencies
2. **Prompts for installation** if the package is missing
3. **Installs the package** using npm with recommended versions:
   - **Zod**: `^3.22.0` - Modern TypeScript-first schema validation
   - **Yup**: `^1.4.0` - Object schema validation library
4. **Installs TypeScript types** (`@types/yup` if available) for better development experience

**Installation Process:**
- 📦 Detects your package manager (npm, yarn, pnpm)
- ⚡ Shows progress during installation
- ✅ Confirms successful installation
- ⚠️ Warns if installation fails but continues generation

**Manual Installation:**
If you prefer to install packages manually:
```bash
# For Zod
npm install zod

# For Yup
npm install yup
npm install --save-dev @types/yup  # Optional TypeScript types
```

## JSDoc Validation Tags

The extension recognizes these JSDoc tags for automatic validation:

- `@required` - Makes field required
- `@minLength <number>` - Minimum string length
- `@maxLength <number>` - Maximum string length
- `@min <number>` - Minimum numeric value
- `@max <number>` - Maximum numeric value
- `@email` - Email validation
- `@url` - URL validation
- `@phoneNumber` - Phone number validation
- `@pattern <regex>` - Custom regex pattern
- `@alpha` - Alphabetic characters only
- `@alphanumeric` - Alphanumeric characters only
- `@numeric` - Numeric characters only

## Angular Version Detection

The extension automatically detects your Angular version to show appropriate form type options:

### Detection Methods
1. **package.json** - Checks for `@angular/core` in dependencies or devDependencies
2. **angular.json** - Looks for Angular workspace configuration
3. **Monorepo Support** - Searches subdirectories for Angular projects

### Version-based Features
- **Angular 17+**: Shows Signal-based Forms option with automatic type inference
- **Angular < 17**: Only shows Reactive and Template-driven forms
- **Version Unknown**: Shows all options with an informational message

### Example Version Display
When detected, the form type selection will show:
```
Select form type (Angular 17.2.0 - Signals supported)
```

### Troubleshooting Version Detection
If Angular version is not detected:
- Ensure `@angular/core` is listed in your `package.json` dependencies
- Check that you're in an Angular workspace directory
- For monorepos, ensure Angular packages are in at least one subdirectory's `package.json`

## Configuration

The extension supports these configuration options:

- **Form Type**: Reactive, Template-driven, or Signal-based
- **Validation Schema**: None, Zod, or Yup
- **Component Name**: Custom component name
- **Output Directory**: Where to generate files
- **Service Integration**: Optional service injection
- **Bootstrap Integration**: Automatic Bootstrap class usage

### VS Code Settings

You can configure the extension behavior through VS Code settings:

#### Module Generation
Control whether Angular module files are generated along with components:

```json
{
  "angularFormGenerator.generateModule": false
}
```

- **Type**: `boolean`
- **Default**: `false`
- **Description**: When `true`, generates an Angular module file (`*.module.ts`) along with the component files. When `false`, only generates component files (TypeScript, HTML, CSS).

**How to configure:**
1. Open VS Code Settings (`Ctrl+,` / `Cmd+,`)
2. Search for "Angular Form Scaffolder"
3. Toggle "Generate Module" option
4. Or add the setting to your `settings.json` file

> **💡 Tip**: Most modern Angular applications use standalone components (Angular 14+), so keeping module generation disabled (`false`) is often preferred unless you're working with older Angular versions or specific architectural requirements.

> **📝 Remember**: These generated components provide a solid foundation that you should customize according to your project's specific requirements, coding standards, and architectural patterns.

## Requirements

- VS Code 1.90.0 or higher
- TypeScript project
- Angular CLI (recommended)
- Bootstrap 5 (for styling)
- **npm, yarn, or pnpm** - For automatic package installation (schema dependencies)
- **Developer expertise** - This tool generates scaffolding code that requires review and customization

### Automatic Dependency Management
- **Schema packages** (Zod, Yup) are automatically detected and installed when needed
- **Package managers** are auto-detected (npm, yarn, pnpm)
- **Installation prompts** ensure user consent before adding dependencies
- **Fallback support** if automatic installation fails

> **🎯 Best Practice**: Always review, test, and adapt the scaffolded code to fit your project's architecture, security requirements, and user experience standards.

## Author

**Adilson de Almeida Pedro**
- 🌐 Website: [adilson.almeidapedro.com.br](https://adilson.almeidapedro.com.br)
- 📧 Email: [adilson@almeidapedro.com.br](mailto:adilson@almeidapedro.com.br)
- 🐙 GitHub: [@devremoto](https://github.com/devremoto)
- 🐦 Twitter: [@devremoto](https://twitter.com/devremoto)
- 💼 LinkedIn: [Adilson Pedro](https://www.linkedin.com/in/adilsonpedro/)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 💖 Support My Work

I build and maintain open-source projects to help the developer community.  
If you find my work useful, please consider supporting future development! 🙌

[![Support on Patreon](https://img.shields.io/badge/Patreon-F96854?logo=patreon&logoColor=white)](https://patreon.com/devremoto)
[![Buy Me a Coffee on Ko-fi](https://img.shields.io/badge/Ko--fi-FF5E5B?logo=ko-fi&logoColor=white)](https://ko-fi.com/devremoto)
[![Sponsor on GitHub](https://img.shields.io/badge/GitHub%20Sponsors-181717?logo=github&logoColor=white)](https://github.com/sponsors/devremoto)

### ☕ How Your Support Helps
- Keeps my projects active and maintained  
- Funds hosting and development tools  
- Motivates me to release more free and open-source resources  

Thank you for your generosity 💜 Every contribution — big or small — makes a difference!


## License

This extension is licensed under the MIT License.