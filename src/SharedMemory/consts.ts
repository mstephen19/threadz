import type { MyErrorConfig } from '../Errors/index.js';

export const ERROR_CONFIG = (message: string): MyErrorConfig => ({ title: 'SharedMemory', name: 'SharedMemoryError', message });
