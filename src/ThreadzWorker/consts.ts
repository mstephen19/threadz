import type { MyErrorConfig } from '../Errors/index.js';

export const ERROR_CONFIG = (message: string): MyErrorConfig => ({ title: 'ThreadzWorker', name: 'ThreadzWorkerError', message });
