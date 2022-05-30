import { Worker, SHARE_ENV } from 'worker_threads';
import path from 'path';
import { TypedEmitter } from 'tiny-typed-emitter';
import type { GoArguments, Options } from '../runWorker/types';
import type { WorkerResponse } from './types';
import SharedMemory from '../SharedMemory';
import { ThreadzError } from '../utils';
import { rejects } from 'assert';

interface WorkerEvents {
    success: <T>(data: any) => T | void;
    error: <T>(error: Error) => T | void;
}

/**
 * Works similar to a regular worker, but doesn't run immediately.
 */
export class ThreadzWorker<T extends unknown = {}> extends TypedEmitter<WorkerEvents> {
    private config: GoArguments;
    private options: Options;
    sharedMemory: Uint8Array;
    private worker: Worker;
    private wasRun: boolean;
    callback: (sharedMem: SharedMemory<T>, data: unknown) => any;

    constructor(config: GoArguments, options: Options, memory?: SharedMemory<T>) {
        super();

        this.wasRun = false;
        this.config = config;
        this.options = options;
        this.sharedMemory = memory?.shared;
    }

    run() {
        if (this.wasRun) throw new ThreadzError('this worker was already run!');
        this.wasRun = true;
        const worker = new Worker(path.join(__dirname, '../worker/index.js'), {
            ...this.options,
            workerData: { ...this.config, memory: this.sharedMemory },
            env: SHARE_ENV,
        });

        this.worker = worker;

        // The worker is configured to never throw. It always sends a message object
        worker.on('message', ({ success, error, data }: WorkerResponse) => {
            if (!success) this.emit('error', error);
            else this.emit('success', data);

            worker.terminate();
        });
    }

    sendMessage<T>(data: T) {
        this.worker.postMessage(data);
    }

    waitFor() {
        return new Promise((resolve, reject) => {
            this.on('success', (data) => {
                resolve(data);
            });

            this.on('error', (err) => {
                reject(new ThreadzError(`worker failed: ${err?.message}`));
            });
        });
    }
}
