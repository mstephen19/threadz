import { isMainThread, parentPort, threadId } from 'worker_threads';

/**
 * Send a message to the parent thread.
 */
const sendMessageToParent = <T>(data: T) => {
    parentPort.postMessage({ message: data });
};

const abort = () => {
    parentPort.postMessage({ success: true, data: 'ABORTED' });
    process.exit(0);
};

export const toolBox = () => ({ isMainThread, threadId, sendMessageToParent, abort });
