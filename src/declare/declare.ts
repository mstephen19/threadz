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
            const func = (...args: any[]) => runWorker(key, location, args, declarations[key]?.options);
            func._name = key;
            func._options = declarations[key]?.options;
            func._path = location;
            return [key, func];
        })
    );

    const maxWorkers = () => WorkerPool.max;

    const activeWorkers = () => WorkerPool.active;

    return {
        ...workers,
        _threadz: { declarations, maxWorkers, activeWorkers, location },
    } as unknown as ThreadzAPI<T>;
};
