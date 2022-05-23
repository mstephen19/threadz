import { cpus } from 'os';
import ThreadzWorker from '../ThreadzWorker';
import { ThreadzError } from '../utils';

class WorkerPool {
    pool: ThreadzWorker[];
    cpus: number;
    active: number;
    max: number;

    constructor(cpus: number) {
        this.pool = [];
        this.cpus = cpus;
        this.max = cpus * 2;
        this.active = 0;
    }

    setMax(num: number) {
        if (num <= 0) throw new ThreadzError(`value ${num} isn't greater than 0`);
        this.max = num;
    }

    private goNext() {
        if (!this.pool.length) return;
        const next = this.pool.shift();
        return this.go(next, true);
    }

    /**
     *
     * @param worker An instance of ThreadzWorker
     * @param wasQueued A boolean stating whether or not the worker was already queued and it's trying again to run
     */
    go(worker: ThreadzWorker, wasQueued: boolean) {
        return new Promise((resolve) => {
            // If the queue is full (more than 3 threads running per CPU at once), add the worker back
            // to the queue. If it is new, add it to the end of the line, while if it was previously
            // there, add it to th front.
            if (this.active >= this.max) return wasQueued ? this.pool.unshift(worker) : this.pool.push(worker);

            this.active += 1;
            worker.run();

            worker.on('success', () => {
                this.active -= 1;
                // Since this operation has completed, run the next one
                this.goNext();
                resolve(true);
            });

            worker.on('error', (error) => {
                this.active -= 1;
                this.goNext();
                resolve(error);
            });
        });
    }
}

export default new WorkerPool(cpus().length);
