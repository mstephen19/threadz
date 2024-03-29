import type { MyErrorConfig } from '../Errors/index.js';

export const ERROR_CONFIG = (message: string): MyErrorConfig => ({ title: 'Declare', name: 'DeclarationError', message });

export enum ModuleType {
    COMMONJS = 'commonjs',
    MODULE = 'module',
}
