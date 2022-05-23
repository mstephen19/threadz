import callerCallsite from 'caller-callsite';
import runWorker from '../runWorker';
import WorkerPool from '../WorkerPool';
import { ThreadzError } from '../utils';

import type { DeclarationsInterface, ThreadzAPI } from './types';

/**
 * Define and configure your workers within this function. Must be the default export.
 */
export const declare = <T extends DeclarationsInterface>(declarations: T) => {
    const location = callerCallsite().getFileName();

    const workers = Object.fromEntries(
        Object.keys(declarations).map((key) => {
            if (key === '_threadz') throw new ThreadzError('can\'t use "_threadz" as a key');
            return [key, (...args: any[]) => runWorker(key, location, args, declarations[key]?.options)];
        })
    );

    const maxWorkers = () => WorkerPool.max;

    const activeWorkers = () => WorkerPool.active;

    return { ...workers, _threadz: { declarations, maxWorkers, activeWorkers } } as unknown as ThreadzAPI<T>;
};
