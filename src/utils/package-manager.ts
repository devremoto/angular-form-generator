import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface PackageInfo {
    name: string;
    version?: string;
    isInstalled: boolean;
}

export class PackageManager {
    private workspaceRoot: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
    }

    /**
     * Check if a package is installed in the project
     */
    async isPackageInstalled(packageName: string): Promise<PackageInfo> {
        try {
            const packageJsonPath = path.join(this.workspaceRoot, 'package.json');

            if (!fs.existsSync(packageJsonPath)) {
                return { name: packageName, isInstalled: false };
            }

            const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
            const packageJson = JSON.parse(packageJsonContent);

            const dependencies = packageJson.dependencies || {};
            const devDependencies = packageJson.devDependencies || {};

            if (dependencies[packageName]) {
                return {
                    name: packageName,
                    version: dependencies[packageName],
                    isInstalled: true
                };
            }

            if (devDependencies[packageName]) {
                return {
                    name: packageName,
                    version: devDependencies[packageName],
                    isInstalled: true
                };
            }

            return { name: packageName, isInstalled: false };
        } catch (error) {
            console.warn(`Failed to check if package ${packageName} is installed:`, error);
            return { name: packageName, isInstalled: false };
        }
    }

    /**
     * Install a package using the detected package manager
     */
    async installPackage(packageName: string, version?: string): Promise<boolean> {
        try {
            const packageManager = this.detectPackageManager();
            const packageToInstall = version ? `${packageName}@${version}` : packageName;

            let command: string;
            switch (packageManager) {
                case 'yarn':
                    command = `yarn add ${packageToInstall}`;
                    break;
                case 'pnpm':
                    command = `pnpm add ${packageToInstall}`;
                    break;
                default:
                    command = `npm install ${packageToInstall}`;
            }

            vscode.window.showInformationMessage(`Installing ${packageName} using ${packageManager}...`, { modal: false });

            const { stdout, stderr } = await execAsync(command, {
                cwd: this.workspaceRoot,
                timeout: 60000 // 60 seconds timeout
            });

            if (stderr && !stderr.includes('warn')) {
                console.error(`${packageManager} install stderr:`, stderr);
                return false;
            }

            vscode.window.showInformationMessage(`✅ Successfully installed ${packageName} with ${packageManager}`);
            return true;
        } catch (error) {
            console.error(`Failed to install package ${packageName}:`, error);
            vscode.window.showErrorMessage(`❌ Failed to install ${packageName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }

    /**
     * Install package types (for TypeScript support)
     */
    async installPackageTypes(packageName: string): Promise<boolean> {
        const typesPackage = `@types/${packageName}`;

        try {
            // Check if types package exists and is needed
            const typesInfo = await this.isPackageInstalled(typesPackage);
            if (typesInfo.isInstalled) {
                return true; // Already installed
            }

            const packageManager = this.detectPackageManager();
            let command: string;

            switch (packageManager) {
                case 'yarn':
                    command = `yarn add --dev ${typesPackage}`;
                    break;
                case 'pnpm':
                    command = `pnpm add --save-dev ${typesPackage}`;
                    break;
                default:
                    command = `npm install --save-dev ${typesPackage}`;
            }

            const { stdout, stderr } = await execAsync(command, {
                cwd: this.workspaceRoot,
                timeout: 30000 // 30 seconds timeout
            });

            if (stderr && !stderr.includes('warn') && !stderr.includes('404')) {
                console.warn(`Types installation stderr:`, stderr);
            }

            return true;
        } catch (error) {
            // Types package might not exist, which is fine
            console.info(`Types package ${typesPackage} not available or failed to install:`, error);
            return true; // Return true as types are optional
        }
    }

    /**
     * Detect package manager (npm, yarn, pnpm)
     */
    detectPackageManager(): string {
        if (fs.existsSync(path.join(this.workspaceRoot, 'yarn.lock'))) {
            return 'yarn';
        }
        if (fs.existsSync(path.join(this.workspaceRoot, 'pnpm-lock.yaml'))) {
            return 'pnpm';
        }
        return 'npm';
    }

    /**
     * Get recommended versions for schema packages
     */
    getRecommendedVersion(packageName: string): string | undefined {
        const versions: Record<string, string> = {
            'zod': '^3.22.0',
            'yup': '^1.4.0'
        };
        return versions[packageName];
    }

    /**
     * Check and install schema validation package if needed
     */
    async ensureSchemaPackage(schemaType: 'zod' | 'yup'): Promise<boolean> {
        try {
            const packageInfo = await this.isPackageInstalled(schemaType);

            if (packageInfo.isInstalled) {
                console.log(`✅ Package ${schemaType} is already installed (${packageInfo.version})`);
                return true;
            }

            // Ask user if they want to install the package
            const choice = await vscode.window.showInformationMessage(
                `The ${schemaType} package is required but not installed. Would you like to install it?`,
                { modal: true },
                'Install',
                'Skip'
            );

            if (choice !== 'Install') {
                vscode.window.showWarningMessage(`⚠️ Skipping ${schemaType} installation. You'll need to install it manually for the schema to work.`);
                return false;
            }

            // Install the package
            const recommendedVersion = this.getRecommendedVersion(schemaType);
            const success = await this.installPackage(schemaType, recommendedVersion);

            if (success) {
                // Try to install types as well
                await this.installPackageTypes(schemaType);
            }

            return success;
        } catch (error) {
            console.error(`Failed to ensure ${schemaType} package:`, error);
            vscode.window.showErrorMessage(`Failed to check/install ${schemaType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }
}