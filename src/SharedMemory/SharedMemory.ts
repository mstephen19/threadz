import { TypedEmitter } from 'tiny-typed-emitter';
import { TextEncoder, TextDecoder } from 'util';
import { ThreadzError } from '../utils';
import { atomicStore, decodeUint8Array, encodeText, parseJSON, stringifyJSON } from './utils';

interface SharedMemoryEvents {
    change: <T>(data: any) => T | void;
}

export default class SharedMemory<T extends unknown> extends TypedEmitter<SharedMemoryEvents> {
    shared: Uint8Array;

    private constructor(initialState: Uint8Array | T, sizeMb?: number) {
        super();
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
            this.set(initialState);
        } catch (err) {
            throw new ThreadzError('failed when creating shared memory: ' + (err as Error).message);
        }
    }

    static from<T extends unknown>(state: Uint8Array | T) {
        if (!state) return undefined;

        return new SharedMemory<T>(state);
    }

    //@ts-ignore
    async get() {
        try {
            const decoded = await decodeUint8Array(this.shared);

            const parsed = await parseJSON<T>(decoded);
            return parsed;
        } catch (err) {
            throw new ThreadzError('failed when grabbing shared memory: ' + (err as Error).message);
        }
    }

    async set(newState: T) {
        try {
            const stringified = await stringifyJSON(newState);
            const encoded = await encodeText(stringified);

            const promises = [...encoded].map((_, i) => atomicStore(this.shared, i, encoded[i]));

            await Promise.all(promises);
        } catch (err) {
            throw new ThreadzError('failed when setting shared memory: ' + (err as Error).message);
        }
    }
}
