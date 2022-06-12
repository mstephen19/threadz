export type MaxConcurrencyOptionsType = '400%' | '1/4' | '1/2' | '100%' | '3/4' | '200%';

export interface ThreadzWorkerPoolEvents {
    dormant: () => void;
}
