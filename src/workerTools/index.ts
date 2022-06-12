import { parentPort, isMainThread } from 'worker_threads';
import { MyError } from '../Errors';
import type { WorkerMessagePayload } from '../worker/types';
import { ERROR_CONFIG } from './consts';

/**
 * Send a message to be consumed back on the main thread.
 */
const sendMessageToParent = <T = unknown>(data: T) => {
    if (isMainThread) {
        throw new MyError(ERROR_CONFIG('Attempting to use a workerTool on the main thread. Not allowed.'));
    }

    const payload: WorkerMessagePayload = {
        done: false,
        messageData: data,
    };

    parentPort.postMessage(payload);
};

/**
 *
 * @param callback Function to run any time a message is received from the parent thread.
 */
const onParentMessage = (callback: (data: unknown) => void) => {
    if (isMainThread) {
        throw new MyError(ERROR_CONFIG('Attempting to use a workerTool on the main thread. Not allowed.'));
    }

    parentPort.on('message', callback);
};

/**
 * Immediately terminate the worker and return out with an `aborted` status.
 */
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

/**
 * Prevent workers from hanging or running too long by aborting out after a certain amount of time has passed.
 *
 * @param seconds Number of seconds to let the worker continue running before aborting.
 */
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
