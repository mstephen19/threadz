import { v4 } from 'uuid';

import { WorkerOptions } from '../declare/types.js';
import { ThreadzAPI } from '../ThreadzAPI/index.js';
import { ThreadzWorker } from '../ThreadzWorker/index.js';
import { BackgroundWorkerCallPayload, BackgroundWorkerCallResponse } from './types.js';

export class BackgroundThreadzWorker<T extends ThreadzAPI> extends ThreadzWorker {
    constructor({ options = {}, location }: { options?: WorkerOptions; location: string }) {
        super({ priority: true, options, workerData: { type: 'BACKGROUND', name: v4(), args: [], location } });
    }

    start() {
        this.go();
    }

    async call<K extends keyof T['workers']>(name: K, args: Parameters<T['workers'][K]>) {
        const id = v4();

        this.worker.postMessage({ name, id, args } as BackgroundWorkerCallPayload);

        return new Promise((resolve) => {
            const callback = ({ name: passedName, id: passedId, payload }: BackgroundWorkerCallResponse) => {
                if (passedName === name && passedId === id) resolve(payload as Promise<ReturnType<T['workers'][K]>>);
                this.worker.off('message', callback);
            };

            this.worker.on('message', callback);
        }) as Promise<ReturnType<T['workers'][K]>>;
    }

    end() {
        this.worker.postMessage({ terminate: true } as BackgroundWorkerCallPayload);
        this.worker.terminate();

        this.running = false;
        this.completed = true;
    }
}
