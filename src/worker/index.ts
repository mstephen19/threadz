import { parentPort, workerData } from 'worker_threads';

import { SUCCESS_PAYLOAD, ERROR_PAYLOAD } from './consts.js';
import { ThreadzAPI } from '../ThreadzAPI/index.js';

import type { WorkerData } from './types.js';
import type { Declarations } from '../declare/types.js';
import { BackgroundWorkerCallPayload, BackgroundWorkerCallResponse } from '../BackgroundThreadzWorker/types.js';

const getApi = async () => {
    const { location } = workerData as WorkerData;

    const imports = await import(location);
    const api = Object.values(imports).find(item => item instanceof ThreadzAPI) as ThreadzAPI<Declarations>;

    if (!api || !api?.declarations) {
        throw new Error("Make sure you've correctly exported your declaration in a separate file.");
    }

    return api;
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
        if (terminate) process.exit();

        if (!api.declarations?.[name]) {
            throw new Error('There is no worker by this name in the specified declarations file.');
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
