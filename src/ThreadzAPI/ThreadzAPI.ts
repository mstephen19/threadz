import { TypedEmitter } from 'tiny-typed-emitter';
import { isMainThread } from 'worker_threads';

import { ThreadzWorker } from '../ThreadzWorker/index.js';
import ThreadzWorkerPool from '../ThreadzWorkerPool/index.js';
import { MyError } from '../Errors/index.js';
import { ERROR_CONFIG } from './consts.js';
import { Interact } from '../Interact/index.js';

import type { Declarations, WorkerOptions } from '../declare/types.js';
import type { ThreadzAPIConstructorOptions, ThreadzAPIEvents, MappedWorkers } from './types.js';
import { BackgroundThreadzWorker } from '../BackgroundThreadzWorker/index.js';
import { WorkerType } from '../ThreadzWorker/consts.js';

/**
 * Access declared workers and data about them via this API returned from the `declare()` function.
 *
 * @example
 * api.declarationCount;
 * api.threadzPool;
 * api.workers;
 * api.location;
 * api.declarations;
 * api.interactWith();
 * api.createBackgroundWorker();
 */
export class ThreadzAPI<T extends Declarations = Declarations> extends TypedEmitter<ThreadzAPIEvents> {
    /**
     * The location at which the declarations file lives.
     */
    readonly location: string;
    /**
     * The original declarations used to create the ThreadzAPI instance.
     */
    readonly declarations: T;
    /**
     * Declarations turned into promisified worker functions using the ThreadzAPI.
     */
    readonly workers: MappedWorkers<T>;

    constructor({ location, declarations }: ThreadzAPIConstructorOptions<T>) {
        super();

        this.location = location;

        const shallowCloneDeclarations = { ...declarations };
        Object.freeze(shallowCloneDeclarations);
        this.declarations = shallowCloneDeclarations;

        // Create a map of functions based on the declarations which all call the queueWorker
        // function with various arguments. The queueWorker function passes the name to the
        // Worker, which dynamically imports the declarations from "location" and then runs the
        // function under that name.
        const entries = Object.entries(declarations).map(([name, declaration]) => {
            const run = (...args: any[]) => {
                if (!isMainThread) throw new MyError(ERROR_CONFIG("Can't run workers within workers!"));
                return this.#queueWorker({ name, args, options: declaration?.options || {}, priority: declaration?.priority || false });
            };

            run._name = name;
            run._location = this.location;
            run._options = declaration?.options || {};
            run._priority = declaration?.priority ?? false;

            Object.freeze(run);

            return [name, run];
        });

        const workers = Object.fromEntries(entries);

        Object.freeze(workers);
        this.workers = workers;
    }

    /**
     * Get the total number of declarations on this ThreadzAPI instance.
     */
    get declarationCount() {
        return Object.values(this.declarations).length;
    }

    /**
     * Grab hold of the ThreadzWorkerPool instance.
     */
    get threadzPool() {
        return ThreadzWorkerPool;
    }

    /**
     *
     * @param name Name of the worker on this ThreadzAPI instance to interact with. Shortcut to using `Interact.with()`
     * @returns Interact API instance
     *
     * @example
     * const worker = api.interactWith('myFunc').args('abc', 123).go();
     *
     * await worker.waitFor()
     */
    interactWith<K extends keyof T>(name: K) {
        if (!this.workers[name]) {
            throw new MyError(
                ERROR_CONFIG(`A worker with the name ${String(name)} doesn't exist on this ThreadzAPI instance. Check your declarations.`)
            );
        }

        return Interact.with(this.workers[name]);
    }

    createBackgroundWorker({ options = {} }: { options?: WorkerOptions } = {}): BackgroundThreadzWorker<ThreadzAPI<T>> {
        return new BackgroundThreadzWorker<ThreadzAPI<T>>({ options, location: this.location });
    }

    #queueWorker<A>({
        name,
        args,
        options,
        priority,
    }: {
        name: string;
        args: any[];
        options: WorkerOptions;
        priority: boolean;
    }): Promise<A> {
        return new Promise((resolve, reject) => {
            const worker = new ThreadzWorker({
                priority,
                options,
                workerData: { name, args, location: this.location, type: WorkerType.REGULAR },
            });

            ThreadzWorkerPool.enqueue(worker);

            this.emit('workerQueued', { name, args });

            worker.on('success', (data) => {
                this.emit('workerDone', { name, args });
                resolve(data as unknown as A);
            });

            worker.on('aborted', (data) => {
                this.emit('workerDone', { name, args });
                reject(new MyError(ERROR_CONFIG(`Worker was aborted with message: ${data}`)));
            });

            worker.on('error', (err) => {
                this.emit('workerDone', { name, args });
                reject(err);
            });
        });
    }
}
