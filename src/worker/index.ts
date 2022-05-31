import { parentPort, workerData } from 'worker_threads';
import { DeclarationsInterface, ThreadzAPI } from '../declare/types';
import SharedMemory from '../SharedMemory';
import type { WorkerArgs, MemoryArgument } from './types';

const run = async () => {
    const { name, args, declarationsPath }: WorkerArgs = workerData;

    try {
        // Import the functions declared
        const {
            _threadz: { declarations, onParentMessageCallbacks },
        } = (await import(declarationsPath)).default as ThreadzAPI<DeclarationsInterface>;

        // Find the first SharedMemory instance and set the variable to it
        let sharedMemory = undefined;
        const memoryArg = args.findIndex((item: any) => !!item?._isSharedMemory);
        if (memoryArg !== -1) sharedMemory = SharedMemory.from((args[memoryArg] as MemoryArgument)._isSharedMemory);

        // Map through the arguments. If any are shared memory, replace it with with a SharedMemory instance
        const newArgs = args.map((item: any) => {
            if (!!item?._isSharedMemory) return SharedMemory.from((item as MemoryArgument)._isSharedMemory);
            return item;
        });

        if (onParentMessageCallbacks?.[name]) {
            parentPort.on('message', (data) => onParentMessageCallbacks?.[name](data, sharedMemory));
        }

        const data = await declarations[name]?.worker(...newArgs);

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
