import { Options } from '../runWorker/types';
import SharedMemory from '../SharedMemory';

export type DeclarationFunction = { (...args: any[]): unknown | Promise<unknown> };

export type OnParentMessageFunction = <T, A>(data: T | unknown, memory: SharedMemory<A | unknown>) => void | Promise<void>;

export interface DeclarationProperty {
    /**
     * Provide the function to be used within the worker.
     */
    worker: DeclarationFunction;
    /**
     * The function to run when a message is received from the parent
     */
    onParentMessage?: OnParentMessageFunction;
    /**
     * Extra options to pass to the worker. See [here](https://nodejs.org/api/worker_threads.html#workerresourcelimits) for more details.
     */
    options?: Options;
}

export interface DeclarationsInterface {
    [key: string]: DeclarationProperty;
}

interface _Threadz {
    /**
     * The maximum number of workers that can be run simultaneously.
     */
    maxWorkers: number;
    /**
     * Get the current number of currently active workers.
     */
    activeWorkers: () => number;
    /**
     * A reference to your original declarations.
     */
    declarations: DeclarationsInterface;
    /**
     * The location at which the declarations file lives.
     */
    location: string;
    /**
     *
     */
    onParentMessageCallbacks: {
        [key: string]: OnParentMessageFunction;
    };
}

type ThreadzFunction<T extends DeclarationFunction> = {
    (...args: Parameters<T>): Promise<ReturnType<T>>;
};

export type ThreadzAPI<T extends DeclarationsInterface> = {
    [K in keyof T]: ThreadzFunction<T[K]['worker']>;
} & { _threadz: _Threadz };
