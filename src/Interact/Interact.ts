import type { Options } from '../runWorker/types';
import type { DeclarationFunction } from '../declare/types';
import type { APIFunction } from './types';
import ThreadzWorker from '../ThreadzWorker';
import { ThreadzError } from '../utils';
import WorkerPool from '../WorkerPool';
import SharedMemory from '../SharedMemory';
import { v4 } from 'uuid';

export default class Interact<T extends DeclarationFunction> {
    private name: string;
    private declarationsPath: string;
    private options: Options;
    private arguments: Parameters<T>;

    private worker: ThreadzWorker;
    private sharedMemory: SharedMemory<any>;

    private constructor(name: string, path: string, options: Options) {
        this.name = name;
        this.declarationsPath = path;
        this.options = options;

        this.arguments = [] as Parameters<T>;
    }

    static with<T extends DeclarationFunction>(func: T) {
        const { _name, _path, _options } = func as unknown as APIFunction;
        return new Interact<T>(_name, _path, _options);
    }

    args(...rest: Parameters<T>) {
        this.arguments = rest;
        return this;
    }

    memory<T extends unknown>(sharedMemory: SharedMemory<T>) {
        this.sharedMemory = sharedMemory;
        return this;
    }

    go() {
        this.worker = new ThreadzWorker(
            { name: this.name, args: this.arguments, declarationsPath: this.declarationsPath },
            this.options,
            this.sharedMemory
        );

        WorkerPool.go(this.worker, false);

        return this.worker;
    }
}
