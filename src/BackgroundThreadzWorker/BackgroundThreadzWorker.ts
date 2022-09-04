import { v4 } from 'uuid';
import { MessagePort } from 'worker_threads';

import type { WorkerOptions } from '../declare/types.js';
import { DeepUnPromisify } from '../Interact/types.js';
import { ThreadzAPI } from '../ThreadzAPI/index.js';
import { WorkerType } from '../ThreadzWorker/consts.js';
import { ThreadzWorker } from '../ThreadzWorker/index.js';
import ThreadzWorkerPool from '../ThreadzWorkerPool/index.js';
import { BackgroundWorkerCallPayload, BackgroundWorkerCallResponse } from './types.js';

export class BackgroundThreadzWorker<T extends ThreadzAPI> extends ThreadzWorker {
    constructor({ options = {}, location }: { options?: WorkerOptions; location: string }) {
        super({ priority: true, options, workerData: { type: WorkerType.BACKGROUND, name: v4(), args: [], location } });
    }

    /**
     * Queue the background worker into `ThreadzPool` and wait for its `started` event to fire.
     *
     * You can optionally pass in a `MessagePort` object to enable the usage of the `Communicate` API
     * for communicating between threads.
     */
    start(port?: MessagePort) {
        if (port && port instanceof MessagePort) {
            this.workerData.port = port;
            this.options.transferList = [...(this.options?.transferList || []), port];
        }

        this.on('error', (err) => {
            throw err;
        });

        return new Promise((resolve) => {
            this.on('started', () => resolve('started'));
            ThreadzWorkerPool.enqueue(this);
        });
    }

    /**
     *
     * @param name The name of the declaration function to call within the worker
     * @param args The arguments for the function.
     */
    async call<K extends keyof T['declarations']>(name: K, ...args: Parameters<T['declarations'][K]['worker']>) {
        if (!this.running) throw new Error(`Can't use the call() function on a non-running background worker!`);

        const id = v4();

        this.worker.postMessage({ name, id, args } as BackgroundWorkerCallPayload);

        return new Promise((resolve, reject) => {
            const callback = ({ name: passedName, id: passedId, payload, error }: BackgroundWorkerCallResponse) => {
                if (passedName !== name && passedId !== id) return;

                if (error) reject(error);
                if (!error) resolve(payload as Promise<DeepUnPromisify<ReturnType<T['declarations'][K]['worker']>>>);

                this.worker.off('message', callback);
            };

            this.worker.on('message', callback);
        }) as Promise<DeepUnPromisify<ReturnType<T['declarations'][K]['worker']>>>;
    }

    /**
     * Stop the worker.
     */
    end() {
        this.worker.postMessage({ terminate: true } as BackgroundWorkerCallPayload);
        this.worker.terminate();

        // We need to do this to ensure ThreadzWorkerPool
        this.emit('success');

        this.running = false;
        this.completed = true;
    }
}
