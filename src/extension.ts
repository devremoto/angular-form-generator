import * as vscode from 'vscode';
import * as path from 'path';
import { FormGeneratorOrchestrator, GeneratorConfig } from './generator/form-generator-orchestrator';
import { JSDocGenerator } from './generator/jsdoc-generator';
import { AngularVersionDetector } from './utils/angular-version-detector';

async function runGenerator(args: {
  filePath?: string;
  modelName?: string;
}) {
  try {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('No workspace folder found. Please open a folder first.');
      return;
    }

    let filePath = args.filePath;
    if (!filePath) {
      const pick = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: { 'TypeScript': ['ts'] },
        defaultUri: vscode.Uri.file(workspaceRoot)
      });
      if (!pick?.[0]) { return; }
      filePath = pick[0].fsPath;
    }

    const modelName = args.modelName || await vscode.window.showInputBox({
      prompt: 'Model class name (e.g., User)',
      validateInput: (value) => {
        if (!value || !value.trim()) {
          return 'Model class name is required';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Model class name must start with uppercase letter and contain only letters and numbers';
        }
        return null;
      }
    });
    if (!modelName) { return; }

    // Detect Angular version to determine available form types
    const versionInfo = await AngularVersionDetector.detectAngularVersion(workspaceRoot);
    const formTypeOptions = [
      { label: 'reactive', description: 'Reactive Forms (FormBuilder, FormGroup)' },
      { label: 'ngModel', description: 'Template-driven Forms (ngModel)' }
    ];

    // Only add signals option for Angular 17+
    if (versionInfo.supportsSignals) {
      formTypeOptions.push({ label: 'signals', description: 'Signal-based Forms (Angular 17+)' });
    }

    formTypeOptions.push({ label: '← Back', description: 'Return to previous step' });

    // Show version info in placeholder if detected
    let placeholder = 'Select form type';
    if (versionInfo.version) {
      placeholder = `Select form type (${AngularVersionDetector.formatVersionInfo(versionInfo)})`;
    } else {
      // Show info message about version detection when not found
      vscode.window.showInformationMessage(
        'Angular version not detected. All form types will be available. For Angular 17+ Signal-based forms, ensure @angular/core is in your package.json dependencies.',
        { modal: false }
      );
      // Add signals option when version cannot be determined (for backward compatibility)
      formTypeOptions.splice(-1, 0, { label: 'signals', description: 'Signal-based Forms (Angular 17+)' });
    }

    const mode = await vscode.window.showQuickPick(formTypeOptions, {
      placeHolder: placeholder,
      ignoreFocusOut: true
    });
    if (!mode) { return; }
    if (mode.label === '← Back') {
      // Restart the configuration process
      return runGenerator({ filePath, modelName: undefined });
    }

    const defaultComponentName = `${modelName.replace(/([A-Z])/g, (match, p1, offset) => offset > 0 ? '-' + p1.toLowerCase() : p1.toLowerCase())}`;
    const componentName = await vscode.window.showInputBox({
      prompt: 'Component name (kebab-case) - Press Escape to go back',
      value: defaultComponentName,
      validateInput: (value) => {
        if (!value || !value.trim()) {
          return 'Component name is required';
        }
        if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(value)) {
          return 'Component name must be in kebab-case (e.g., user-form)';
        }
        return null;
      }
    });
    if (!componentName) {
      // Go back to form type selection
      return runGenerator({ filePath, modelName });
    }

    const outputDir = await vscode.window.showInputBox({
      prompt: 'Output directory (relative to workspace) - Press Escape to go back',
      value: 'src/app/components/forms',
      validateInput: (value) => {
        if (!value || !value.trim()) {
          return 'Output directory is required';
        }
        return null;
      }
    });
    if (!outputDir) {
      // Go back to component name
      return runGenerator({ filePath, modelName });
    }

    const serviceName = await vscode.window.showInputBox({
      prompt: 'Service name (optional - for data operations) - Press Escape to go back',
      placeHolder: 'e.g., user, userService',
      validateInput: (value) => {
        if (value && !/^[a-zA-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Service name must start with a letter and contain only letters and numbers';
        }
        return null;
      }
    });
    // Note: serviceName can be undefined (empty string) which is valid for optional field
    // Only go back if user explicitly cancelled (undefined)
    if (serviceName === undefined) {
      // Go back to output directory
      return runGenerator({ filePath, modelName });
    }

    const schema = await vscode.window.showQuickPick([
      { label: 'none', description: 'No validation schema' },
      { label: 'zod', description: 'Generate Zod validation schema' },
      { label: 'yup', description: 'Generate Yup validation schema' },
      { label: '← Back', description: 'Return to previous step' }
    ], {
      placeHolder: 'Generate validation schema?',
      ignoreFocusOut: true
    });
    if (!schema) { return; }
    if (schema.label === '← Back') {
      // Go back to service name step - restart from component configuration
      return runGenerator({ filePath, modelName });
    }

    // Show progress
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "Scaffolding Angular Form",
      cancellable: false
    }, async (progress) => {
      progress.report({ increment: 0, message: "Parsing model..." });

      // Read configuration setting for module generation
      const vsConfig = vscode.workspace.getConfiguration('angularFormGenerator');
      const generateModule = vsConfig.get<boolean>('generateModule', false);

      const config: GeneratorConfig = {
        modelFilePath: filePath!,
        modelClassName: modelName,
        outputDirectory: path.join(workspaceRoot, outputDir),
        componentName: componentName,
        serviceName: serviceName || undefined,
        mode: mode.label as 'reactive' | 'ngModel' | 'signals',
        generateSchema: schema.label as 'zod' | 'yup' | 'none',
        generateModule: generateModule,
        workspaceRoot: workspaceRoot,
      };

      progress.report({ increment: 30, message: "Checking dependencies..." });

      const orchestrator = new FormGeneratorOrchestrator();
      await orchestrator.generateForm(config);

      progress.report({ increment: 100, message: "Complete!" });
    });

    // Show success message with option to open generated files
    const openFiles = await vscode.window.showInformationMessage(
      `✅ Form component '${componentName}' scaffolded successfully!`,
      'Open Component',
      'Open Folder'
    );

    if (openFiles === 'Open Component') {
      const componentPath = path.join(workspaceRoot, outputDir, componentName, `${componentName}.component.ts`);
      const doc = await vscode.workspace.openTextDocument(componentPath);
      await vscode.window.showTextDocument(doc);
    } else if (openFiles === 'Open Folder') {
      const folderPath = path.join(workspaceRoot, outputDir, componentName);
      const folderUri = vscode.Uri.file(folderPath);
      await vscode.commands.executeCommand('revealFileInOS', folderUri);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    vscode.window.showErrorMessage(`Failed to scaffold form: ${errorMessage}`);
    console.error('Form scaffolding error:', error);
  }
}

async function runJSDocGenerator(args: {
  filePath?: string;
  modelName?: string;
}) {
  try {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('No workspace folder found. Please open a folder first.');
      return;
    }

    let filePath = args.filePath;
    if (!filePath) {
      const pick = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: { 'TypeScript': ['ts'] },
        defaultUri: vscode.Uri.file(workspaceRoot)
      });
      if (!pick?.[0]) { return; }
      filePath = pick[0].fsPath;
    }

    const modelName = args.modelName || await vscode.window.showInputBox({
      prompt: 'Model class name (e.g., User) - Press Escape to return to main menu',
      validateInput: (value) => {
        if (!value || !value.trim()) {
          return 'Model class name is required';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Model class name must start with uppercase letter and contain only letters and numbers';
        }
        return null;
      }
    });
    if (!modelName) {
      // User cancelled, show main menu again
      return showAngularFormMenu(args);
    }

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Generating JSDoc comments',
      cancellable: false
    }, async (progress) => {
      progress.report({ increment: 0, message: 'Analyzing model...' });

      const generator = new JSDocGenerator();
      const result = await generator.generateJSDoc(filePath, modelName);

      progress.report({ increment: 50, message: 'Writing JSDoc comments...' });

      if (result.success) {
        progress.report({ increment: 100, message: 'JSDoc comments generated successfully!' });
        vscode.window.showInformationMessage(`JSDoc comments generated successfully for ${modelName}!`);

        // Open the updated file
        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc);
      } else {
        vscode.window.showErrorMessage(`Failed to generate JSDoc: ${result.error}`);
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    vscode.window.showErrorMessage(`Failed to generate JSDoc: ${errorMessage}`);
    console.error('JSDoc generation error:', error);
  }
}

async function showAngularFormMenu(args: {
  filePath?: string;
  modelName?: string;
}) {
  const menuOptions = [
    {
      label: '🔧 Scaffold Form',
      description: 'Scaffold Angular form component from model class',
      command: 'generate'
    },
    {
      label: '📄 Generate JSDoc',
      description: 'Add JSDoc comments with validation rules to model properties',
      command: 'jsdoc'
    },
    {
      label: '🎯 Scaffold Form Here',
      description: 'Scaffold form component using current file/model',
      command: 'generateHere'
    },
    {
      label: '❌ Cancel',
      description: 'Close this menu',
      command: 'cancel'
    }
  ];

  const selected = await vscode.window.showQuickPick(menuOptions, {
    placeHolder: 'Select Angular Form Scaffolder action',
    ignoreFocusOut: true
  });

  if (!selected || selected.command === 'cancel') { return; }

  switch (selected.command) {
    case 'generate':
      await runGenerator(args);
      break;
    case 'jsdoc':
      await runJSDocGenerator(args);
      break;
    case 'generateHere':
      await runGenerator(args);
      break;
  }
}

export function activate(ctx: vscode.ExtensionContext) {
  ctx.subscriptions.push(
    vscode.commands.registerCommand('angularForm.generate', () => runGenerator({})),
    vscode.commands.registerCommand('angularForm.generateHere', (uri?: vscode.Uri) => {
      // Explorer context passes the file Uri as first arg; editor context gives active document
      let filePath: string | undefined = uri?.fsPath;
      if (!filePath && vscode.window.activeTextEditor?.document) {
        filePath = vscode.window.activeTextEditor.document.fileName;
      }
      // Best effort: try to guess class name from file name (PascalCase)
      let modelGuess = filePath ? path.basename(filePath).replace(/\.[tj]s$/, '') : undefined;
      if (modelGuess) {
        modelGuess = modelGuess
          .split(/[-_]/g)
          .map(s => s.charAt(0).toUpperCase() + s.slice(1))
          .join('');
      }
      runGenerator({ filePath, modelName: modelGuess });
    }),
    vscode.commands.registerCommand('angularForm.generateJSDoc', (uri?: vscode.Uri) => {
      // Explorer context passes the file Uri as first arg; editor context gives active document
      let filePath: string | undefined = uri?.fsPath;
      if (!filePath && vscode.window.activeTextEditor?.document) {
        filePath = vscode.window.activeTextEditor.document.fileName;
      }
      // Best effort: try to guess class name from file name (PascalCase)
      let modelGuess = filePath ? path.basename(filePath).replace(/\.[tj]s$/, '') : undefined;
      if (modelGuess) {
        modelGuess = modelGuess
          .split(/[-_]/g)
          .map(s => s.charAt(0).toUpperCase() + s.slice(1))
          .join('');
      }
      runJSDocGenerator({ filePath, modelName: modelGuess });
    }),
    vscode.commands.registerCommand('angularForm.showMenu', (uri?: vscode.Uri) => {
      // Explorer context passes the file Uri as first arg; editor context gives active document
      let filePath: string | undefined = uri?.fsPath;
      if (!filePath && vscode.window.activeTextEditor?.document) {
        filePath = vscode.window.activeTextEditor.document.fileName;
      }
      // Best effort: try to guess class name from file name (PascalCase)
      let modelGuess = filePath ? path.basename(filePath).replace(/\.[tj]s$/, '') : undefined;
      if (modelGuess) {
        modelGuess = modelGuess
          .split(/[-_]/g)
          .map(s => s.charAt(0).toUpperCase() + s.slice(1))
          .join('');
      }
      showAngularFormMenu({ filePath, modelName: modelGuess });
    })
  );
}

export function deactivate() { }
