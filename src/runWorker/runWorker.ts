import ThreadzWorker from '../ThreadzWorker';
import { ThreadzError } from '../utils';
import WorkerPool from '../WorkerPool';
import type { Options } from './types';

export const runWorker = async <P extends unknown[], R>(name: string, declarationsPath: string, args: P, options: Options = {}): Promise<R> => {
    return new Promise((resolve, reject) => {
        const worker = new ThreadzWorker({ name, args, declarationsPath }, options);

        // Add the worker to the worker pool
        WorkerPool.go(worker, false);

        // The worker will emit one of 2 events once it's complete. Resolve/reject
        // the promise one of them is emitted.
        worker.on('success', (data) => {
            resolve(data as unknown as R);
        });

        worker.on('error', (err) => {
            reject(new ThreadzError(`worker failed: ${(err as Error)?.message}`));
        });
    });
};
