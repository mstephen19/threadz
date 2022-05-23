import { Worker, SHARE_ENV } from 'worker_threads';
import path from 'path';
import { TypedEmitter } from 'tiny-typed-emitter';
import type { GoArguments, Options } from '../runWorker/types';
import type { WorkerResponse } from './types';

interface WorkerEvents {
    success: <T>(data: any) => T | void;
    error: <T>(error: Error) => T | void;
}

/**
 * Works similar to a regular worker, but doesn't run immediately.
 */
export class ThreadzWorker extends TypedEmitter<WorkerEvents> {
    config: GoArguments;
    options: Options;

    constructor(config: GoArguments, options: Options) {
        super();

        this.config = config;
        this.options = options;
    }

    run() {
        const worker = new Worker(path.join(__dirname, '../worker/index.js'), {
            ...this.options,
            workerData: this.config,
            env: SHARE_ENV,
        });

        // The worker is configured to never throw. It always sends a message object
        worker.on('message', ({ success, error, data }: WorkerResponse) => {
            if (!success) this.emit('error', error);
            else this.emit('success', data);

            worker.terminate();
        });
    }
}
