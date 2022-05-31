import { isMainThread, parentPort, threadId } from 'worker_threads';

/**
 * Send a message to the parent thread.
 */
const sendMessageToParent = <T>(data: T) => {
    parentPort.postMessage({ message: data });
};

/**
 * Completely abort the worker. It will fire the "success" event
 * with a return value of "ABORTED".
 */
const abort = () => {
    parentPort.postMessage({ success: true, data: 'ABORTED' });
    process.exit(0);
};

/**
 * Contains tools too use within a worker function.
 */
export const toolBox = () => ({ isMainThread, threadId, sendMessageToParent, abort });
