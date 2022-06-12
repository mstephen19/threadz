import type { MyErrorConfig } from '../Errors';

export const ERROR_CONFIG = (message: string): MyErrorConfig => ({ title: 'ThreadzWorkerPool', name: 'ThreadzWorkerPoolError', message });

export enum MaxConcurrencyOptions {
    ONE_FOURTH = '1/4',
    ONE_HALF = '1/2',
    THREE_FOURTHS = '3/4',
    ONE_HUNDRED_PERCENT = '100%',
    TWO_HUNDRED_PERCENT = '200%',
    FOUR_HUNDRED_PERCENT = '400%',
}
