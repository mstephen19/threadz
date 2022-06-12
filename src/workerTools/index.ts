import { parentPort, isMainThread } from 'worker_threads';
import { MyError } from '../Errors';
import type { WorkerMessagePayload } from '../worker/types';
import { ERROR_CONFIG } from './consts';

const sendMessageToParent = <T = unknown>(data: T) => {
    const payload: WorkerMessagePayload = {
        done: false,
        messageData: data,
    };

    parentPort.postMessage(payload);
};

const onParentMessage = (callback: (data: unknown) => void) => {
    parentPort.on('message', callback);
};

const abort = () => {
    if (isMainThread) {
        throw new MyError(ERROR_CONFIG('Attempting to abort on the main thread. Not allowed.'));
    }

    const payload: WorkerMessagePayload = {
        done: true,
        aborted: true,
        data: `Worker manually aborted at ${new Date().toISOString()}`,
    };

    parentPort.postMessage(payload);
    process.exit(0);
};

const abortOnTimeout = (seconds: number) => {
    if (isMainThread) {
        throw new MyError(ERROR_CONFIG('Attempting to abortOnTimeout on the main thread. Not allowed.'));
    }

    setTimeout(abort, seconds * 1e3);
};

const workerTools = {
    sendMessageToParent,
    onParentMessage,
    abort,
    abortOnTimeout,
};

export { workerTools };
