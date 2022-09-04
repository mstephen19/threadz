import { parentPort, workerData } from 'worker_threads';

import { SUCCESS_PAYLOAD, ERROR_PAYLOAD } from './consts.js';
import { ThreadzAPI } from '../ThreadzAPI/index.js';

import type { WorkerData } from './types.js';
import type { Declarations } from '../declare/types.js';
import { BackgroundWorkerCallPayload, BackgroundWorkerCallResponse } from '../BackgroundThreadzWorker/types.js';

const getApi = async () => {
    try {
        const { location } = workerData as WorkerData;

        // if (!fs.existsSync(location)) {
        //     throw new Error("It seems that the specified declarations file doesn't exist.");
        // }

        const imports = await import(location);

        const api = Object.values(imports).find((item) => item instanceof ThreadzAPI) as ThreadzAPI<Declarations>;

        if (!api || !api?.declarations) {
            throw new Error("It seems that the specified declarations don't exist.");
        }

        return api;
    } catch (error) {
        parentPort.postMessage(ERROR_PAYLOAD((error as Error)?.message));
        process.exit(1);
    }
};

const regular = async () => {
    try {
        const { name, args } = workerData as WorkerData;
        const api = await getApi();

        if (!api.declarations?.[name]) {
            throw new Error('There is no worker by this name in the specified declarations file.');
        }

        const result = await api?.declarations?.[name]?.worker(...args);

        parentPort.postMessage(SUCCESS_PAYLOAD(result));
    } catch (error) {
        parentPort.postMessage(ERROR_PAYLOAD((error as Error)?.message));
    } finally {
        process.exit(0);
    }
};

const background = async () => {
    const api = await getApi();

    parentPort.on('message', async ({ name, id, args, terminate }: BackgroundWorkerCallPayload) => {
        if (terminate) {
            parentPort.postMessage(SUCCESS_PAYLOAD('success'));
            process.exit(0);
        }

        if (!api?.declarations?.[name]) {
            parentPort.postMessage({ name, id, payload: null, error: `A declaration function with the name ${name} doesn't exist.` });
        }

        try {
            const payload = await api.declarations?.[name]?.worker(...args);
            parentPort.postMessage({ name, id, payload } as BackgroundWorkerCallResponse);
        } catch (error) {
            parentPort.postMessage({ name, id, payload: null, error: (error as Error).message });
        }
    });
};

if ((workerData as WorkerData).type === 'REGULAR') regular();
if ((workerData as WorkerData).type === 'BACKGROUND') background();
