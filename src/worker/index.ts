import { parentPort, workerData } from 'worker_threads';
import { DeclarationsInterface, ThreadzAPI } from '../declare/types';
import SharedMemory from '../SharedMemory';

import type { WorkerArgs } from './types';

const run = async () => {
    const { name, args, declarationsPath, memory }: WorkerArgs = workerData;

    try {
        const {
            _threadz: { declarations, onParentMessageCallbacks },
        } = (await import(declarationsPath)).default as ThreadzAPI<DeclarationsInterface>;

        const sharedMemory = SharedMemory.from(memory);

        if (onParentMessageCallbacks?.[name]) {
            parentPort.on('message', (data) => onParentMessageCallbacks?.[name](data, sharedMemory));
        }

        const data = await declarations[name]?.worker(...args);

        parentPort.postMessage({ success: true, error: null, data });
    } catch (error) {
        parentPort.postMessage({
            success: false,
            error,
            data: null,
        });
    } finally {
        process.exit(0);
    }
};

run();
