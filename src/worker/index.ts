import { parentPort, workerData } from 'worker_threads';
import { SUCCESS_PAYLOAD, ERROR_PAYLOAD } from './consts';

import type { WorkerData } from './types';
import type { ThreadzAPI } from '../ThreadzAPI';
import type { Declarations } from '../declare/types';

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

        const result = await api?.declarations?.[name]?.worker(...args);

        parentPort.postMessage(SUCCESS_PAYLOAD(result));
    } catch (error) {
        parentPort.postMessage(ERROR_PAYLOAD((error as Error)?.message));
    } finally {
        process.exit(0);
    }
};

main();
