import { parentPort, workerData } from 'worker_threads';

import { SUCCESS_PAYLOAD, ERROR_PAYLOAD } from './consts.js';
import { ThreadzAPI } from '../ThreadzAPI/index.js';

import type { WorkerData } from './types.js';
import type { Declarations } from '../declare/types.js';

const main = async () => {
    try {
        const { name, location, args } = workerData as WorkerData;

        const api = (await import(location)).default as ThreadzAPI<Declarations>;

        if (!api || !api?.declarations) {
            throw new Error("Make sure you've made your declarations the default export of the file they're in.");
        }

        if (!api.declarations?.[name]) {
            throw new Error('There is no worker by this name in the specified declarations file.');
        }

        if (!(api instanceof ThreadzAPI)) {
            throw new Error('The default export of your declarations file must be a ThreadzAPI instance.');
        }

        const result = await api?.declarations?.[name]?.worker(...args);

        parentPort.postMessage(SUCCESS_PAYLOAD(result));
    } catch (error) {
        parentPort.postMessage(ERROR_PAYLOAD((error as Error)?.message));
    } finally {
        process.exit(0);
    }
};

main();
