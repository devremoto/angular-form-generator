import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface AngularVersionInfo {
    version: string | null;
    majorVersion: number | null;
    supportsSignals: boolean;
}

export class AngularVersionDetector {
    static async detectAngularVersion(workspaceRoot: string): Promise<AngularVersionInfo> {
        const defaultResult: AngularVersionInfo = {
            version: null,
            majorVersion: null,
            supportsSignals: false
        };

        try {
            // First try to detect from package.json
            const packageJsonPath = path.join(workspaceRoot, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const versionInfo = await this.getVersionFromPackageJson(packageJsonPath);
                if (versionInfo.version) {
                    return versionInfo;
                }
            }

            // Then try angular.json
            const angularJsonPath = path.join(workspaceRoot, 'angular.json');
            if (fs.existsSync(angularJsonPath)) {
                const versionInfo = await this.getVersionFromAngularJson(angularJsonPath, workspaceRoot);
                if (versionInfo.version) {
                    return versionInfo;
                }
            }

            // Try to find package.json in subdirectories (for monorepos)
            const subdirs = fs.readdirSync(workspaceRoot, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            for (const subdir of subdirs) {
                const subPackageJsonPath = path.join(workspaceRoot, subdir, 'package.json');
                if (fs.existsSync(subPackageJsonPath)) {
                    const versionInfo = await this.getVersionFromPackageJson(subPackageJsonPath);
                    if (versionInfo.version) {
                        return versionInfo;
                    }
                }
            }

            return defaultResult;
        } catch (error) {
            console.warn('Failed to detect Angular version:', error);
            return defaultResult;
        }
    }

    private static async getVersionFromPackageJson(packageJsonPath: string): Promise<AngularVersionInfo> {
        try {
            const content = fs.readFileSync(packageJsonPath, 'utf8');
            const packageJson = JSON.parse(content);

            // Check dependencies and devDependencies
            const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

            // Look for Angular core packages
            const angularPackages = [
                '@angular/core',
                '@angular/common',
                '@angular/platform-browser'
            ];

            for (const pkg of angularPackages) {
                if (deps[pkg]) {
                    const version = this.parseVersion(deps[pkg]);
                    if (version) {
                        return {
                            version: version.full,
                            majorVersion: version.major,
                            supportsSignals: version.major >= 17
                        };
                    }
                }
            }

            return { version: null, majorVersion: null, supportsSignals: false };
        } catch (error) {
            console.warn(`Failed to parse package.json at ${packageJsonPath}:`, error);
            return { version: null, majorVersion: null, supportsSignals: false };
        }
    }

    private static async getVersionFromAngularJson(angularJsonPath: string, workspaceRoot: string): Promise<AngularVersionInfo> {
        try {
            const content = fs.readFileSync(angularJsonPath, 'utf8');
            const angularJson = JSON.parse(content);

            // Try to get version from CLI config
            if (angularJson.cli?.packageManager) {
                // Look for package.json in the same directory
                const packageJsonPath = path.join(path.dirname(angularJsonPath), 'package.json');
                if (fs.existsSync(packageJsonPath)) {
                    return await this.getVersionFromPackageJson(packageJsonPath);
                }
            }

            // If angular.json exists but no version found, try to find package.json in projects
            if (angularJson.projects) {
                for (const projectName of Object.keys(angularJson.projects)) {
                    const project = angularJson.projects[projectName];
                    if (project.root) {
                        const projectPackageJsonPath = path.join(workspaceRoot, project.root, 'package.json');
                        if (fs.existsSync(projectPackageJsonPath)) {
                            const versionInfo = await this.getVersionFromPackageJson(projectPackageJsonPath);
                            if (versionInfo.version) {
                                return versionInfo;
                            }
                        }
                    }
                }
            }

            return { version: null, majorVersion: null, supportsSignals: false };
        } catch (error) {
            console.warn(`Failed to parse angular.json at ${angularJsonPath}:`, error);
            return { version: null, majorVersion: null, supportsSignals: false };
        }
    }

    private static parseVersion(versionString: string): { full: string; major: number } | null {
        try {
            // Remove version range prefixes like ^, ~, >=, etc.
            const cleanVersion = versionString.replace(/^[\^~>=<]+/, '');

            // Extract major version number
            const versionMatch = cleanVersion.match(/^(\d+)/);
            if (versionMatch) {
                const major = parseInt(versionMatch[1], 10);
                return {
                    full: cleanVersion,
                    major: major
                };
            }

            return null;
        } catch (error) {
            console.warn(`Failed to parse version string: ${versionString}`, error);
            return null;
        }
    }

    /**
     * Quick check if the workspace supports Angular Signals (Angular 17+)
     */
    static async supportsSignals(workspaceRoot: string): Promise<boolean> {
        const versionInfo = await this.detectAngularVersion(workspaceRoot);
        return versionInfo.supportsSignals;
    }

    /**
     * Get user-friendly version display string
     */
    static formatVersionInfo(versionInfo: AngularVersionInfo): string {
        if (!versionInfo.version) {
            return 'Angular version not detected';
        }

        const signalSupport = versionInfo.supportsSignals ? ' (Signals supported)' : '';
        return `Angular ${versionInfo.version}${signalSupport}`;
    }
}