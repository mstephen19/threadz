import { parentPort, workerData } from 'worker_threads';
import SharedMemory from '../SharedMemory';

import type { WorkerArgs } from './types';

const run = async () => {
    const { name, args, declarationsPath, memory }: WorkerArgs = workerData;

    try {
        const {
            _threadz: { declarations },
        } = (await import(declarationsPath)).default;

        const sharedMemory = SharedMemory.from(memory);

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
