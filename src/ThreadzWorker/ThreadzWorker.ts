import { Worker, SHARE_ENV } from 'worker_threads';
import { TypedEmitter } from 'tiny-typed-emitter';
import path from 'path';
import { MyError } from '../Errors';
import { ERROR_CONFIG } from './consts';

import type { WorkerData, WorkerMessagePayload } from '../worker/types';
import type { WorkerOptions } from '../declare/types';
import type { ThreadzWorkerEvents } from './types';
import type { AcceptableDataType, SharedMemoryTransferObject } from '../SharedMemory';
import type { MappedWorkerFunction } from '../ThreadzAPI/types';
import type { DeepUnPromisify } from '../Interact/types';

/**
 * A Threadz-specific wrapper for the default `Worker` class from the Node.js `worker_threadz` module
 */
export class ThreadzWorker<T extends MappedWorkerFunction = MappedWorkerFunction> extends TypedEmitter<
    ThreadzWorkerEvents<DeepUnPromisify<ReturnType<T>>>
> {
    readonly options: WorkerOptions;
    readonly workerData: WorkerData;
    priority: boolean;
    protected isRunning: boolean;
    private worker: Worker;

    constructor({ priority, options, workerData }: { priority: boolean; options: WorkerOptions; workerData: WorkerData }) {
        super();

        this.priority = priority;
        this.options = options;
        this.workerData = workerData;
    }

    /**
     * Don't use this method unless you really know what you're doing.
     * 
     * Will have no effect if the worker is already running.
     */
    go() {
        if (this.isRunning) return;

        const worker = new Worker(path.join(__dirname, '../worker/index.js'), {
            ...this.options,
            workerData: this.workerData,
            env: SHARE_ENV,
        });

        this.isRunning = true;
        this.worker = worker;

        worker.on('message', (payload: WorkerMessagePayload) => {
            const { done, success, error, messageData, data, aborted } = payload;

            if (messageData) return this.emit('message', messageData);

            if (done && success) this.emit('success', data as DeepUnPromisify<ReturnType<T>>);

            if (done && aborted) this.emit('aborted', data as string);

            if (done && error) this.emit('error', new MyError(ERROR_CONFIG(`Failed within worker: ${error}`)));

            this.isRunning = false;
            worker.terminate();
        });
    }

    /**
     *
     * @param priority A boolean or `0`/`1` defining what priority status the worker should have. Will have no effect if the worker is already running.
     */
    setPriority(priority: boolean | 1 | 0) {
        if (typeof priority !== 'boolean' && priority !== 1 && priority !== 0) return;
        if (this.isRunning) return;

        this.priority = !!priority;
    }

    /**
     * 
     * @param data Send a message to the worker
     */
    sendMessage<T extends AcceptableDataType>(data: T | SharedMemoryTransferObject) {
        this.worker.postMessage(data);
    }

    /**
     * Wait for the worker to finish, and get its returned result.
     * 
     * @returns A promise of the return value of the original declaration function
     */
    waitFor(): Promise<DeepUnPromisify<ReturnType<T>>> {
        return new Promise((resolve, reject) => {
            this.on('success', (data) => resolve(data));
            this.on('error', (error) => reject(error));
            this.on('aborted', (message) => reject(new MyError(ERROR_CONFIG(`Worker aborted with message: ${message}`))));
        });
    }
}
