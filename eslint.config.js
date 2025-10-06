import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
    {
        files: ['src/**/*.ts'],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
                project: './tsconfig.json'
            }
        },
        plugins: {
            '@typescript-eslint': typescript
        },
        rules: {
            // Basic TypeScript rules
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-var-requires': 'error',

            // VS Code extension specific
            'no-console': 'off', // Console is often used for debugging in extensions

            // General JavaScript rules
            'prefer-const': 'error',
            'no-var': 'error',
            'eqeqeq': 'error',
            'curly': 'error'
        }
    },
    {
        files: ['*.js', '*.mjs'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module'
        },
        rules: {
            'no-console': 'off',
            'prefer-const': 'error',
            'no-var': 'error'
        }
    }
];