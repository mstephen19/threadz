import { Options } from '../runWorker/types';

export type DeclarationFunction = (...args: any[]) => unknown | Promise<unknown>;

export interface DeclarationProperty {
    /**
     * Provide the function to be used within the worker.
     */
    worker: DeclarationFunction;
    /**
     * Extra options to pass to the worker. See [here](https://nodejs.org/api/worker_threads.html#workerresourcelimits) for more details
     */
    options?: Options;
}

export interface DeclarationsInterface {
    [key: string]: DeclarationProperty;
};

interface _Threadz {
    /**
     * The maximum number of workers that can be run simultaneously
     */
    maxWorkers: number;
    /**
     * Get the current number of currently active workers
     */
    activeWorkers: () => number;
    /**
     * A reference to your original declarations
     */
    declarations: DeclarationsInterface;
}

export type ThreadzAPI<T extends DeclarationsInterface> = {
    [K in keyof T]: (...args: Parameters<T[K]['worker']>) => Promise<ReturnType<T[K]['worker']>>;
} & { _threadz: _Threadz };
