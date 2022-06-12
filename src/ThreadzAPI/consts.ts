import type { MyErrorConfig } from '../Errors';

export const ERROR_CONFIG = (message: string): MyErrorConfig => ({ title: 'ThreadzAPI', name: 'ThreadzAPIError', message });
