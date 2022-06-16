import { TypedEmitter } from 'tiny-typed-emitter';
import { isMainThread } from 'worker_threads';
import { ThreadzWorker } from '../ThreadzWorker';
import ThreadzWorkerPool from '../ThreadzWorkerPool';
import { MyError } from '../Errors';
import { ERROR_CONFIG } from './consts';
import { Interact } from '../Interact';

import type { Declarations, WorkerOptions } from '../declare/types';
import type { ThreadzAPIConstructorOptions, ThreadzAPIEvents, MappedWorkers } from './types';

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
            run._priority = declaration?.priority || false;

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

    #queueWorker<A>({ name, args, options, priority }: { name: string; args: any[]; options: WorkerOptions; priority: boolean }): Promise<A> {
        return new Promise((resolve, reject) => {
            const worker = new ThreadzWorker({ priority, options, workerData: { name, args, location: this.location } });

            ThreadzWorkerPool.enqueue(worker);

            this.emit('workerQueued', { name, args });

            worker.on('success', (data) => {
                this.emit('workerDone', { name, args });
                resolve(data as unknown as A);
            });

            worker.on('aborted', (data) => {
                this.emit('workerDone', { name, args });
                // @ts-ignore
                reject(new MyError(ERROR_CONFIG(`Worker was aborted with message: ${data}`)));
            });

            worker.on('error', (err) => {
                this.emit('workerDone', { name, args });
                reject(err);
            });
        });
    }
}
