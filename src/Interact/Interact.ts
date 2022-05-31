import type { Options } from '../runWorker/types';
import type { DeclarationFunction } from '../declare/types';
import type { APIFunction, OnWorkerMessageCallback } from './types';
import ThreadzWorker from '../ThreadzWorker';
import WorkerPool from '../WorkerPool';
import SharedMemory from '../SharedMemory';

/**
 * Interact with a declared worker by passing shared memory or sending messages.
 */
export default class Interact<T extends DeclarationFunction> {
    private name: string;
    private declarationsPath: string;
    private options: Options;
    private arguments: Parameters<T>;

    private worker: ThreadzWorker;
    private sharedMemory: SharedMemory<any>;

    private callback: OnWorkerMessageCallback<any>;

    private constructor(name: string, path: string, options: Options) {
        this.name = name;
        this.declarationsPath = path;
        this.options = options;

        this.arguments = [] as Parameters<T>;
    }

    /**
     * Pass in a function from ThreadzAPI.
     */
    static with<T extends DeclarationFunction>(func: T) {
        const { _name, _path, _options } = func as unknown as APIFunction;
        return new Interact<T>(_name, _path, _options);
    }

    /**
     * Arguments for the worker.
     */
    args(...rest: Parameters<T>) {
        this.arguments = rest;
        return this;
    }

    /**
     * Handle messages received from the worker.
     */
    onMessage<T>(callback: OnWorkerMessageCallback<T>) {
        this.callback = callback;
        return this;
    }

    /**
     * Call this function at the end of the `Interact` chain.
     */
    go() {
        this.worker = new ThreadzWorker(
            { name: this.name, args: this.arguments, declarationsPath: this.declarationsPath },
            this.options,
            this.callback
        );

        WorkerPool.go(this.worker, false);

        return this.worker;
    }
}
