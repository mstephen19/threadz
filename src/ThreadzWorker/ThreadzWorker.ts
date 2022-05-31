import { Worker, SHARE_ENV } from 'worker_threads';
import path from 'path';
import { TypedEmitter } from 'tiny-typed-emitter';
import type { GoArguments, Options } from '../runWorker/types';
import type { WorkerResponse } from './types';
import { ThreadzError } from '../utils';
import { OnWorkerMessageCallback } from '../Interact/types';

interface WorkerEvents {
    success: <T>(data: any) => T | void;
    error: <T>(error: Error) => T | void;
}

/**
 * Works similar to a regular worker, but doesn't run immediately.
 */
export class ThreadzWorker extends TypedEmitter<WorkerEvents> {
    private config: GoArguments;
    private options: Options;
    private worker: Worker;
    private wasRun: boolean;
    private callback: OnWorkerMessageCallback;

    constructor(config: GoArguments, options: Options, callback?: OnWorkerMessageCallback) {
        super();

        this.wasRun = false;
        this.config = config;
        this.options = options;
        this.callback = callback;
    }

    /**
     * Don't use this function unless you know what you're doing.
     */
    run() {
        if (this.wasRun) throw new ThreadzError('this worker was already run!');
        this.wasRun = true;
        const worker = new Worker(path.join(__dirname, '../worker/index.js'), {
            ...this.options,
            workerData: { ...this.config},
            env: SHARE_ENV,
        });

        this.worker = worker;

        // The worker is itself configured to never throw. It always sends a message object
        worker.on('message', ({ success, error, data, message }: WorkerResponse) => {
            if (message && this?.callback) return this.callback(message);

            if (message) return;

            if (!success) this.emit('error', error);
            else this.emit('success', data);

            worker.terminate();
        });
    }

    sendMessage<T>(data: T) {
        this.worker.postMessage(data);
    }

    onMessage<T>(callback: OnWorkerMessageCallback<T>) {
        this.worker.on('message', ({ message }) => {
            if (message) return callback(message);
        });
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
