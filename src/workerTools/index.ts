import { parentPort, isMainThread, threadId as threadIdValue, TransferListItem, workerData } from 'worker_threads';

import { MyError } from '../Errors/index.js';
import { ERROR_CONFIG } from './consts.js';

import type { AcceptableDataType, SharedMemoryTransferObject } from '../SharedMemory/index.js';
import type { WorkerData, WorkerMessagePayload } from '../worker/types.js';

/**
 * If you have passed a message port to the worker (using the Interact API), send messages to the port with this function.
 *
 * @example
 * workerTools.sendCommunication('hello world');
 */
const sendCommunication = <T extends AcceptableDataType>(data: T | SharedMemoryTransferObject, transferList: TransferListItem[] = []) => {
    const { port } = workerData as WorkerData;

    if (!port) {
        throw new MyError(
            ERROR_CONFIG(
                "Can't find a message port to communicate on! Did you pass a MessagePort instance into the worker with the Interact API?"
            )
        );
    }

    port.postMessage(data, transferList);
};

/**
 * If you have passed a message port to the worker (using the Interact API), listen for messages on the port with this function.
 *
 * @example
 * workerTools.onCommunication<string>((message) => console.log(`received: ${message}`));
 */
function onCommunication<T extends AcceptableDataType>(callback: (data: T) => void): void;
function onCommunication<T extends SharedMemoryTransferObject>(callback: (data: T) => void): void;
function onCommunication<T extends AcceptableDataType = AcceptableDataType>(callback: (data: T | SharedMemoryTransferObject) => void) {
    const { port } = workerData as WorkerData;

    if (!port) {
        throw new MyError(
            ERROR_CONFIG(
                "Can't find a message port to listen on! Did you pass a MessagePort instance into the worker with the Interact API?"
            )
        );
    }

    port.on('message', callback);
}

/**
 * Accepts a callback which takes in the received data and returns a boolean value. When the callback returns `true`, the promise resolves.
 *
 * @example
 * const data = await workerTools.waiForCommunication<string>((data) => data === 'hello world');
 *
 * console.log(data);
 */
async function waitForCommunication<T extends AcceptableDataType>(assertion: (data: T) => data is T): Promise<void>;
async function waitForCommunication<T extends SharedMemoryTransferObject>(assertion: (data: T) => data is T): Promise<void>;
async function waitForCommunication<T extends AcceptableDataType = AcceptableDataType>(assertion: (data: T) => data is T) {
    const { port } = workerData as WorkerData;

    if (!port) {
        throw new MyError(
            ERROR_CONFIG(
                "Can't find a message port to listen on! Did you pass a MessagePort instance into the worker with the Interact API?"
            )
        );
    }

    return new Promise((resolve) => {
        port.on('message', async (data) => {
            if (assertion(data)) resolve(data);
        });
    });
}

/**
 * Send a message to be consumed back on the main thread.
 *
 * @example
 * workerTools.sendMessageToParent('hello main thread!')
 */
const sendMessageToParent = <T extends AcceptableDataType>(data: T | SharedMemoryTransferObject, transferList: TransferListItem[] = []) => {
    if (isMainThread) {
        throw new MyError(ERROR_CONFIG('Attempting to use a workerTool on the main thread. Not allowed.'));
    }

    const payload: WorkerMessagePayload = {
        done: false,
        messageData: data,
    };

    parentPort.postMessage(payload, transferList);
};

/**
 *
 * @param callback Function to run any time a message is received from the parent thread.
 *
 * @example
 * workerTools.onParentMessage((data) => console.log(data))
 */
function onParentMessage<T extends AcceptableDataType>(callback: (data: T) => void): void;
function onParentMessage<T extends SharedMemoryTransferObject>(callback: (data: T) => void): void;
function onParentMessage<T extends AcceptableDataType = AcceptableDataType>(callback: (data: T | SharedMemoryTransferObject) => void) {
    if (isMainThread) {
        throw new MyError(ERROR_CONFIG('Attempting to use a workerTool on the main thread. Not allowed.'));
    }

    parentPort.on('message', callback);
}

/**
 * Immediately terminate the worker and return out with an `aborted` status.
 *
 * @example
 * workerTools.abort();
 * workerTools.abort('API returned unexpected value');
 * workerTools.abort(2);
 */
const abort = (message?: string | number) => {
    if (isMainThread) {
        throw new MyError(ERROR_CONFIG('Attempting to abort on the main thread. Not allowed.'));
    }

    const payload: WorkerMessagePayload = {
        done: true,
        aborted: true,
        data: message ?? `Worker manually aborted at ${new Date().toISOString()}`,
    };

    parentPort.postMessage(payload);
    process.exit(0);
};

/**
 * Prevent workers from hanging or running too long by aborting out after a certain amount of time has passed.
 *
 * @example
 * workerTools.abortOnTimeout({ seconds: 120, message: 'Operation took too long' })
 */
const abortOnTimeout = ({ seconds, message }: { seconds: number; message?: string | number }) => {
    if (isMainThread) {
        throw new MyError(ERROR_CONFIG('Attempting to abortOnTimeout on the main thread. Not allowed.'));
    }

    setTimeout(() => abort(message), seconds * 1e3);
};

/**
 * Grab the unique ID of the thread currently being used. Good for creating unique identifiers.
 *
 * @example
 * const myValue = `${data}-${threadID()}`
 */
const threadID = () => {
    if (isMainThread) {
        throw new MyError(ERROR_CONFIG('Attempting to grab the threadID on the main thread. Not allowed.'));
    }

    return threadIdValue;
};

/**
 * Various tools which can be used within declaration functions.
 * Do not try to use these function outside of declaration functions. They will throw nasty errors.
 *
 * @example
 * workerTools.sendMessageToParent();
 * workerTools.onParentMessage();
 * workerTools.abort();
 * workerTools.abortOnTimeout();
 * workerTools.threadID();
 * workerTools.sendCommunication();
 * workerTools.onCommunication();
 * workerTools.waitForCommunication();
 */
const workerTools = {
    sendMessageToParent,
    onParentMessage,
    abort,
    abortOnTimeout,
    threadID,
    sendCommunication,
    onCommunication,
    waitForCommunication,
};

export { workerTools };
