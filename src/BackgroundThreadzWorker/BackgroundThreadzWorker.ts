import { v4 } from 'uuid';

import { WorkerOptions } from '../declare/types.js';
import { DeepUnPromisify } from '../Interact/types.js';
import { ThreadzAPI } from '../ThreadzAPI/index.js';
import { ThreadzWorker } from '../ThreadzWorker/index.js';
import { BackgroundWorkerCallPayload, BackgroundWorkerCallResponse } from './types.js';

export class BackgroundThreadzWorker<T extends ThreadzAPI> extends ThreadzWorker {
    constructor({ options = {}, location }: { options?: WorkerOptions; location: string }) {
        super({ priority: true, options, workerData: { type: 'BACKGROUND', name: v4(), args: [], location } });
    }

    start() {
        return new Promise((resolve) => {
            this.on('started', () => resolve('started'));
            this.go();
        });
    }

    async call<K extends keyof T['declarations']>(name: K, ...args: Parameters<T['declarations'][K]['worker']>) {
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

    end() {
        this.worker.postMessage({ terminate: true } as BackgroundWorkerCallPayload);
        this.worker.terminate();

        this.running = false;
        this.completed = true;
    }
}
