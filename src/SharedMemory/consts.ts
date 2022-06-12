import type { MyErrorConfig } from '../Errors';

export const ERROR_CONFIG = (message: string): MyErrorConfig => ({ title: 'SharedMemory', name: 'SharedMemoryError', message });
