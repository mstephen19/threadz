import type { MyErrorConfig } from '../Errors/index.js';

export const ERROR_CONFIG = (message: string): MyErrorConfig => ({ title: 'ThreadzWorker', name: 'ThreadzWorkerError', message });

export enum WorkerType {
    BACKGROUND = 'BACKGROUND',
    REGULAR = 'REGULAR',
}
