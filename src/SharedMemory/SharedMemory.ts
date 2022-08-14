import { MyError } from '../Errors';
import { decodeBytes, encodeBytes, isSharedMemoryTransferObject, megabytesToBytes, wipeUsedBytes, wipeUsedBytesAndSet } from './utils';
import { ERROR_CONFIG } from './consts';

import type { AcceptableDataType, SharedMemoryTransferObject, FromArgumentType, FromOptions } from './types';

/**
 * Use this API to allocate a certain amount of memory to be shared between different threads.
 *
 * @example
 * SharedMemory.from();
 * instance.transfer();
 * instance.byteLength
 * instance.get();
 * instance.wipe();
 * instance.set();
 * instance.setWith();
 */
export class SharedMemory<T extends AcceptableDataType = AcceptableDataType> {
    private byteArray: Uint8Array;

    private constructor(state: Uint8Array) {
        this.byteArray = state;
    }

    /**
     * Pass in an AcceptableDataType (with options).
     *
     * @returns SharedMemory instance.
     *
     * @example
     * SharedMemory.from({ hello: 'world' }, { sizeMb: 0.5 });
     *
     */
    static from<T extends AcceptableDataType>(state: T, { sizeMb }?: FromOptions): SharedMemory<T>;
    /**
     * Pass in a SharedMemory instance and receive the same SharedMemory instance back.
     *
     * @returns SharedMemory instance.
     *
     * @example
     * SharedMemory.from(SharedMemory.from('test'));
     *
     */
    static from<T extends SharedMemory>(instance: T): T;
    /**
     * Pass in a SharedMemoryTransferObject.
     *
     * @returns SharedMemory instance.
     *
     * @example
     * SharedMemory.from(SharedMemory.from(123).transfer());
     *
     */
    static from<T extends SharedMemoryTransferObject>(
        transferObject: T
    ): SharedMemory<T extends SharedMemoryTransferObject<infer A> ? A : AcceptableDataType>;
    static from<T extends FromArgumentType>(state: T, { sizeMb }: FromOptions = { sizeMb: 0.001 }) {
        // Don't allow undefined values
        if (state === undefined) throw new MyError(ERROR_CONFIG('Must provide an initial state.'));

        // In the case that someone tries to pass a SharedMemory instance to
        // this function, just return that SharedMemory instance
        if (state instanceof SharedMemory) return state;

        // If the object passed in has this key, that means it's a SharedMemoryTransferObject
        if (isSharedMemoryTransferObject(state)) return new SharedMemory(state._sharedMemoryByteArray);

        try {
            // Otherwise, the state is one of the acceptable data types and we have to
            // create a new SharedArrayBuffer + Uint8Array
            const shared = new SharedArrayBuffer(megabytesToBytes(sizeMb));
            const byteArray = new Uint8Array(shared);

            encodeBytes(state, byteArray);

            return new SharedMemory(byteArray);
        } catch (error) {
            throw new MyError(ERROR_CONFIG(`Failed to encode data: ${(error as Error)?.message}`));
        }
    }

    /**
     * The byte length of the stored Uint8Array.
     */
    get byteLength() {
        return this.byteArray.byteLength;
    }

    /**
     *
     * @returns An basic object that can be easily passed around.
     *
     * @example
     * const data = SharedMemory.from({ hello: 'world' });
     *
     * declarations.workers.myFunc(data.transfer());
     */
    transfer(): SharedMemoryTransferObject<T> {
        const transferObject = { _sharedMemoryByteArray: this.byteArray };
        Object.freeze(transferObject);
        return transferObject;
    }

    /**
     *
     * @returns Value currently stored in the memory space.
     *
     * Pass in `true` to run the operation as a microtask.
     *
     * @example
     * const data = memory.get();
     */
    get(): T;
    /**
     * Pass in `true` to run the operation as a microtask.
     *
     * @returns A promise of the value currently stored in the memory space.
     *
     * @example
     * const data = await memory.get(true);
     */
    get(microtask: true): Promise<T>;
    get(microtask?: boolean) {
        if (microtask) {
            // Run as a microtask.
            return Promise.resolve()
                .then(() => {
                    const data = decodeBytes<T>(this.byteArray);
                    return data;
                })
                .catch((error) => {
                    throw new MyError(ERROR_CONFIG(`Failed to decode data: ${(error as Error)?.message}`));
                });
        }

        // Run normally.
        try {
            const decoded = decodeBytes<T>(this.byteArray);
            return decoded;
        } catch (error) {
            throw new MyError(ERROR_CONFIG(`Failed to decode data: ${(error as Error)?.message}`));
        }
    }

    /**
     * Entirely reset the memory space (not deletion of the memory space!).
     *
     * @example
     * memory.wipe();
     */
    wipe(): void;
    /**
     * Entirely reset the memory space (not deletion of the memory space!).
     *
     * Pass in `true` to run the operation as a microtask.
     *
     * @example
     * await memory.wipe(true);
     */
    wipe(microtask: true): Promise<void>;
    wipe(microtask?: boolean) {
        // Run as a microtask.
        if (microtask) {
            return Promise.resolve()
                .then(() => {
                    wipeUsedBytes(this.byteArray);
                })
                .catch((error) => {
                    throw new MyError(ERROR_CONFIG(`Failed to wipe: ${(error as Error)?.message}`));
                });
        }

        // Run normally.
        try {
            wipeUsedBytes(this.byteArray);
        } catch (error) {
            throw new MyError(ERROR_CONFIG(`Failed to wipe: ${(error as Error)?.message}`));
        }
    }

    /**
     * Set a new value for the current memory space.
     *
     * @example
     * memory.set('hi');
     */
    set<A extends T>(data: A): void;
    /**
     * Set a new value for the current memory space.
     *
     * Pass `true` as the second parameter to run the operation as a microtask.
     *
     * @example
     * await memory.set('hi', true);
     */
    set<A extends T>(data: A, microtask: true): Promise<void>;
    set<A extends T>(data: A, microtask?: boolean) {
        // Run as a microtask.
        if (microtask) {
            return Promise.resolve()
                .then(() => {
                    wipeUsedBytesAndSet(data, this.byteArray);
                })
                .catch((error) => {
                    throw new MyError(ERROR_CONFIG(`Failed to set new value: ${(error as Error)?.message}`));
                });
        }

        // Run normally.
        try {
            wipeUsedBytesAndSet(data, this.byteArray);
        } catch (error) {
            throw new MyError(ERROR_CONFIG(`Failed to set new value: ${(error as Error)?.message}`));
        }
    }

    /**
     *
     * @param callback A callback function taking in the previous data and returning the new data to be written to memory.
     *
     * @example
     * memory.setWith((previous) => {
     *    return {
     *       ...previous,
     *       newProperty: 'foo',
     *    }
     * });
     */
    setWith<A extends T>(callback: (data: T) => A) {
        try {
            // Grab the previous state
            const prev = decodeBytes<T>(this.byteArray);

            // Run the callback
            const state = callback(prev);

            // Set the new state
            wipeUsedBytesAndSet(state, this.byteArray);
        } catch (error) {
            throw new MyError(ERROR_CONFIG(`Failed when setting state with previous: ${(error as Error)?.message}`));
        }
    }
}
