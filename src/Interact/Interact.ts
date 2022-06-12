import { isMainThread } from 'worker_threads';
import { ThreadzWorker } from '../ThreadzWorker';
import { MyError } from '../Errors';
import { ERROR_CONFIG } from './consts';
import ThreadzWorkerPool from '../ThreadzWorkerPool';

import type { WorkerOptions } from '../declare/types';
import type { WorkerData } from '../worker/types';
import type { MappedWorkerFunction, ModifiedMappedWorkerFunction } from '../ThreadzAPI/types';
import type { ThreadzWorkerEvents } from '../ThreadzWorker/types';
import type { DeepUnPromisify } from './types';
import type { AcceptableDataType } from '../SharedMemory';

/**
 * Use this API to interact with a worker returned by ThreadzAPI by sending and receiving messages back and forth.
 */
export class Interact<T extends MappedWorkerFunction> {
    private priority: boolean;
    private options: WorkerOptions;
    private workerData: WorkerData;
    private onMessageCallbacks: ThreadzWorkerEvents<any, any>['message'][];
    private onFailureCallbacks: ThreadzWorkerEvents<any, any>['error'][];
    private onSuccessCallbacks: ThreadzWorkerEvents<DeepUnPromisify<ReturnType<T>>, any>['success'][];
    private onAbortCallbacks: ThreadzWorkerEvents['aborted'][];

    private constructor(worker: T) {
        const { _name, _location, _options, _priority } = worker as ModifiedMappedWorkerFunction<T>;

        this.workerData = {
            name: _name,
            args: [],
            location: _location,
        };
        this.options = _options;
        this.priority = _priority;

        this.onMessageCallbacks = [];
        this.onFailureCallbacks = [];
        this.onSuccessCallbacks = [];
        this.onAbortCallbacks = [];
    }

    /**
     *
     * @param worker Worker function from the `workers` property in a ThreadzAPI instance
     * @returns Interact API
     * 
     * @example Interact.with(declarations.workers.myFunc)
     */
    static with<A extends MappedWorkerFunction>(worker: A) {
        const { _name, _location, _options, _priority } = worker as ModifiedMappedWorkerFunction<A>;

        if (typeof worker !== 'function') {
            throw new MyError(ERROR_CONFIG('Must pass a function into the Interact API.'));
        }

        if (!_name || !_location || !_options || _priority === undefined) {
            throw new MyError(ERROR_CONFIG('The function passed in must be a worker function created by ThreadzAPI.'));
        }

        return new Interact<A>(worker);
    }

    /**
     * Pass arguments to the worker function within this method.
     * 
     * @example interact.args('param1', 2, { hello: 'world' })
     */
    args(...args: Parameters<T>) {
        this.workerData.args = args;
        return this;
    }

    /**
     * Treat the worker as a priority. This means that it will be pushed to the front of the ThreadzPool queue instead of the back.
     * 
     * @example interact.isPriority()
     */
    isPriority() {
        this.priority = true;
        return this;
    }

    /**
     * Treat the worker as normal. You only need to use this method if you set `priority` to `true` in the original declaration.
     * 
     * @example interact.isNotPriority()
     */
    isNotPriority() {
        this.priority = false;
        return this;
    }

    /**
     * Set the options for the worker's run. Overrides any options defined within the original declaration.
     *
     * @param options Options to set.
     * 
     * @example
     * interact.setOptions({
     *     trackUnmanagedFds: false,
     * })
     */
    setOptions(options: WorkerOptions) {
        this.options = options;
        return this;
    }

    /**
     * @param callback Function to run when a message is received from the worker.
     */
    onMessage<T extends AcceptableDataType = AcceptableDataType>(callback: ThreadzWorkerEvents<unknown, T>['message']) {
        if (typeof callback === 'function') {
            this.onMessageCallbacks.push(callback);
        }
        return this;
    }

    /**
     * @param callback Function to run when the worker fails and throws an error.
     */
    onFailure(callback: ThreadzWorkerEvents['error']) {
        if (typeof callback === 'function') {
            this.onFailureCallbacks.push(callback);
        }
        return this;
    }

    /**
     * @param callback Function to run when the worker succeeds and potentially returns a value.
     */
    onSuccess(callback: ThreadzWorkerEvents<DeepUnPromisify<ReturnType<T>>>['success']) {
        if (typeof callback === 'function') {
            this.onSuccessCallbacks.push(callback);
        }
        return this;
    }

    /**
     *
     * @param callback Function to run whenever the worker is aborted. A worker can only be aborted with the `workerTools.abort()` and `workerTools.abortOnTimeout()` functions.
     * 
     */
    onAbort(callback: ThreadzWorkerEvents['aborted']) {
        if (typeof callback === 'function') {
            this.onAbortCallbacks.push(callback);
        }
        return this;
    }

    /**
     * Run the worker and return it to be further interacted with while it is running.
     *
     * @returns ThreadzWorker
     * 
     * @example Interact.with(declarations.workers.myFunc).args('abc', 123).onMessage((data) => console.log(data)).go()
     */
    go() {
        if (!isMainThread) throw new MyError(ERROR_CONFIG("Can't run workers within workers!"));

        const worker = new ThreadzWorker<T>({ priority: this.priority, workerData: this.workerData, options: this.options });

        this.onMessageCallbacks.forEach((callback) => worker.on('message', callback));
        this.onFailureCallbacks.forEach((callback) => worker.on('error', callback));
        this.onSuccessCallbacks.forEach((callback) => worker.on('success', callback));
        this.onAbortCallbacks.forEach((callback) => worker.on('aborted', callback));

        ThreadzWorkerPool.enqueue(worker);

        return worker;
    }
}
