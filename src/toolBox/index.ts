import { isMainThread, parentPort, threadId } from 'worker_threads';
import { OnParentMessageFunction } from '../declare/types';

/**
 * Send a message to the parent thread.
 */
const sendMessageToParent = <T>(data: T) => {
    parentPort.postMessage({ message: data });
};

/**
 * Listen for messages sent from the parent thread.
 */
const onParentMessage = (callback: OnParentMessageFunction) => {
    parentPort.on('message', async (data) => {
        await callback(data)
    })
}

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
export const toolBox = () => ({ isMainThread, threadId, sendMessageToParent, onParentMessage, abort });
