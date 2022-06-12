import { cpus } from 'os';
import { isMainThread } from 'worker_threads';
import { MyError } from '../Errors';
import { ERROR_CONFIG, MaxConcurrencyOptions } from './consts';
import { ThreadzWorker } from '../ThreadzWorker';

import type { MaxConcurrencyOptionsType } from './types';

/**
 * The API used by Threadz to manage all ThreadzWorker instances.
 */
export class ThreadzWorkerPool {
    private active: number;
    readonly cpus: number;
    private max: number;
    private queue: ThreadzWorker[];

    constructor() {
        if (!isMainThread) {
            throw new MyError(ERROR_CONFIG('Can only create one instance of ThreadzWorkerPool, which must be on the main thread.'));
        }

        this.active = 0;
        this.cpus = cpus().length;
        this.max = this.cpus * 2;
        this.queue = [];
    }

    get queueIsFull() {
        return this.active >= this.max;
    }

    get currentlyActive() {
        return this.active;
    }

    get maxConcurrency() {
        return this.max;
    }

    /**
     * 
     * @param value A number or a `MaxConcurrencyOptions` value to limit the number of workers that can be run at a single time.
     * 
     * **NOTE:** It is recommended to use `MaxConcurrencyOptions` values. Do not set this number to be ridiculously high. The maximum allowed is `numberOfMachineCpus * 50`, which is already ridiculous.
     */
    setMaxConcurrency<T extends MaxConcurrencyOptionsType>(value: T): void;
    setMaxConcurrency(value: number): void;
    setMaxConcurrency<T extends MaxConcurrencyOptionsType>(value: T | number) {
        // Handle the case if a number was passed in
        if (typeof value === 'number') {
            // Prevent absolutely absurd concurrency
            if (value > this.cpus * 50) throw new MyError(ERROR_CONFIG("Max concurrency set dangerously high. Don't do that."));

            this.max = value;
            return;
        }

        // If the value is anything other than a number, check if it's included in the
        // MaxConcurrencyOptions. if so, run the corresponding calculation.
        if (Object.values(MaxConcurrencyOptions).some((option) => option === value)) {
            switch (value) {
                case MaxConcurrencyOptions.ONE_FOURTH:
                    this.max = Math.round(this.cpus / 4);
                    break;
                case MaxConcurrencyOptions.ONE_HALF:
                    this.max = Math.round(this.cpus / 2);
                    break;
                case MaxConcurrencyOptions.THREE_FOURTHS:
                    this.max = Math.round((this.cpus * 3) / 4);
                    break;
                case MaxConcurrencyOptions.ONE_HUNDRED_PERCENT:
                    this.max = this.cpus;
                    break;
                case MaxConcurrencyOptions.TWO_HUNDRED_PERCENT:
                    this.max = this.cpus * 2;
                    break;
                case MaxConcurrencyOptions.FOUR_HUNDRED_PERCENT:
                    this.max = this.cpus * 4;
                    break;
            }
        }
    }

    /**
     * Don't use this method unless you really know what you're doing.
     */
    enqueue(input: ThreadzWorker) {
        // Handle incorrect input
        if (!input || !(input instanceof ThreadzWorker)) {
            throw new MyError(ERROR_CONFIG('Attempted to enqueue an invalid object into the ThreadzWorkerPool.'));
        }

        // If it's marked as priority, add it to the front of the queue.
        // Otherwise, add it to the back.
        if (input.priority) this.queue.unshift(input);
        else this.queue.push(input);

        // If the queue is not full, go ahead and run the worker.
        if (!this.queueIsFull) this.#executeNextWorker();
    }

    #executeNextWorker() {
        if (this.queueIsFull) return;

        // Pull the worker from the front of the queue.
        const worker = this.queue.shift();

        if (!worker) return;

        const handleWorkerCompletion = () => {
            this.active--;
            this.#executeNextWorker();
        };

        // Once the worker is finished, attempt to run the next worker in the queue.
        worker.on('success', handleWorkerCompletion);
        worker.on('error', handleWorkerCompletion);

        // Run the worker
        worker.go();
        this.active++;
    }
}
