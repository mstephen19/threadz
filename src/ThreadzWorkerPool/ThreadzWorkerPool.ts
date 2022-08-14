import { cpus } from 'os';
import { TypedEmitter } from 'tiny-typed-emitter';

import { MyError } from '../Errors/index.js';
import { ERROR_CONFIG, MaxConcurrencyOptions } from './consts.js';
import { ThreadzWorker } from '../ThreadzWorker/index.js';

import type { MaxConcurrencyOptionsType, ThreadzWorkerPoolEvents } from './types.js';

/**
 * The API used by Threadz to manage all ThreadzWorker instances. Only one instance of the ThreadzWorkerPool is created.
 *
 * @example
 * threadzPool.queueLength;
 * threadzPool.maxedOut;
 * threadzPool.currentlyActive;
 * threadzPool.maxConcurrency;
 * threadzPool.nextUp;
 * threadzPool.dormant;
 * threadzPool.setMaxConcurrency();
 */
export class ThreadzWorkerPool extends TypedEmitter<ThreadzWorkerPoolEvents> {
    private active: number;
    readonly cpus: number;
    private max: number;
    private queue: ThreadzWorker[];

    constructor() {
        super();

        this.active = 0;
        this.cpus = cpus().length;
        this.max = this.cpus * 2;
        this.queue = [];
    }

    /**
     * Get the current length of the queue.
     */
    get queueLength() {
        return this.queue.length;
    }

    /**
     * Whether or not the max number of possible workers is running right now.
     */
    get maxedOut() {
        return this.active >= this.max;
    }

    /**
     * The number of workers which are currently running.
     */
    get currentlyActive() {
        return this.active;
    }

    /**
     * The maximum number of workers that ThreadzWorkerPool will allow to run concurrently.
     */
    get maxConcurrency() {
        return this.max;
    }

    /**
     * Retrieve the name, location, and arguments of the next worker in the queue to be run.
     */
    get nextUp() {
        if (!this.queue[0]) return;
        return this.queue[0].workerData;
    }

    /**
     * If `true`, the ThreadzWorkerPool is not currently running any workers and the queue is empty.
     */
    get dormant() {
        return !this.active && !this.queue.length;
    }

    /**
     *
     * @param value A number or a `MaxConcurrencyOptions` value to limit the number of workers that can be run at a single time.
     *
     * **NOTE:** It is recommended to use `MaxConcurrencyOptions` values. Do not set this number to be ridiculously high. The maximum allowed is `numberOfMachineCpus * 50`, which is already ridiculous.
     *
     * @example
     * // Using MaxConcurrencyOptions
     * ThreadzPool.setMaxConcurrency('1/4');
     * ThreadzPool.setMaxConcurrency('1/2');
     * ThreadzPool.setMaxConcurrency('3/4');
     * ThreadzPool.setMaxConcurrency('100%');
     * ThreadzPool.setMaxConcurrency('200%');
     * ThreadzPool.setMaxConcurrency('400%');
     *
     * // Using a number
     * ThreadzPool.setMaxConcurrency(6));
     *
     * // This will error out unless your machine somehow has 40 cores
     * ThreadzPool.setMaxConcurrency(2000);
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
            default:
                throw new MyError(
                    ERROR_CONFIG('Must pass either a number or a MaxConcurrencyOptions value into the setMaxConcurrency function.')
                );
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
        if (!this.maxedOut) this.#executeNextWorker();
    }

    #executeNextWorker() {
        if (this.maxedOut || !this.queue.length) return;

        // Pull the worker from the front of the queue.
        const worker = this.queue.shift();

        const handleWorkerCompletion = () => {
            this.active--;
            this.#executeNextWorker();

            if (this.dormant) this.emit('dormant');
        };

        // Once the worker is finished, attempt to run the next worker in the queue.
        worker.on('success', handleWorkerCompletion);
        worker.on('error', handleWorkerCompletion);

        // Run the worker
        worker.go();
        this.active++;
    }
}
