// import { TypedEmitter } from 'tiny-typed-emitter';
import { TextEncoder, TextDecoder } from 'util';
import { ThreadzError } from '../utils';
import { MemoryArgument } from '../worker/types';
import { atomicStore, decodeUint8Array, encodeText, parseJSON, stringifyJSON } from './utils';

// interface SharedMemoryEvents {
//     change: <T>(data: any) => T | void;
// }

/**
 * Share memory between two threads. The "shared" property can safely be passed into a worker function as an argument.
 */
export default class SharedMemory<T extends unknown> {
    shared: Uint8Array;

    private constructor(initialState: Uint8Array | T, sizeMb?: number) {
        try {
            if (!initialState) throw new ThreadzError('must provide an initial state!');

            // If they created their own Uint8Array for the initial state, just set this.shared to be that
            if (initialState instanceof Uint8Array) {
                this.shared = initialState;
                return;
            }

            // Otherwise, create a new Uint8Array from a SharedArrayBuffer and use that
            const shared = new SharedArrayBuffer(sizeMb ? Math.floor(sizeMb * 1e6) : 1e6);
            this.shared = new Uint8Array(shared);

            // Then, serialize the initial state
            this.setSync(initialState);
        } catch (err) {
            throw new ThreadzError('failed when creating shared memory: ' + (err as Error).message);
        }
    }

    /**
     * Create a new SharedMemory instance from either a Uint8Array or an JSON serializable item.
     */
    static from<T extends unknown>(state: Uint8Array | T, sizeMb?: number) {
        if (!state) return undefined;

        //@ts-ignore
        if (!!state?._isSharedMemory) return new SharedMemory(state._isSharedMemory);

        return new SharedMemory<T>(state, sizeMb);
    }

    /**
     * Asynchronously get the current state.
     */
    async get(): Promise<T> {
        try {
            const decoded = await decodeUint8Array(this.shared);

            const parsed = await parseJSON<T>(decoded);
            return parsed;
        } catch (err) {
            throw new ThreadzError('failed when grabbing shared memory: ' + (err as Error).message);
        }
    }

    /**
     * Asynchronously set the state.
     */
    async set(newState: T, { wipe }: { wipe: boolean } = { wipe: false }) {
        try {
            const stringified = await stringifyJSON(newState);
            const encoded = await encodeText(stringified);

            if (wipe) {
                const wipers = [...this.shared].map((_, i) => atomicStore(this.shared, i, 0));
                await Promise.all(wipers);
            }

            const promises = [...encoded].map((_, i) => atomicStore(this.shared, i, encoded[i]));

            await Promise.all(promises);
        } catch (err) {
            throw new ThreadzError('failed when setting shared memory: ' + (err as Error).message);
        }
    }

    /**
     * Synchronously get the current state.
     */
    getSync(): T {
        try {
            const decoded = new TextDecoder().decode(this.shared);
            const parsed = JSON.parse(decoded.trim().replace(/\0/g, ''));
            return parsed;
        } catch (err) {
            throw new ThreadzError('failed when grabbing shared memory: ' + (err as Error).message);
        }
    }

    /**
     * Synchronously set the state.
     */
    setSync(newState: T, { wipe }: { wipe: boolean } = { wipe: false }) {
        try {
            const encoded = new TextEncoder().encode(JSON.stringify(newState));

            if (wipe) {
                this.shared.forEach((_, i) => Atomics.store(this.shared, i, 0));
            }

            encoded.forEach((num, i) => Atomics.store(this.shared, i, num));
        } catch (err) {
            throw new ThreadzError('failed when setting shared memory: ' + (err as Error).message);
        }
    }

    pass() {
        return { _isSharedMemory: this.shared } as unknown as SharedMemory<T>;
    }
}
