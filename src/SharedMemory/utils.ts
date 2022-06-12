import { TextEncoder, TextDecoder } from 'util';
import { AcceptableDataType, SharedMemoryTransferObject } from './types';

/**
 * Checks if the item passed in is a SharedMemoryTransferObject.
 */
export const isSharedMemoryTransferObject = (item: any): item is SharedMemoryTransferObject => {
    return item?._sharedMemoryByteArray && item._sharedMemoryByteArray instanceof Uint8Array;
};

/**
 * Convert megabytes to bytes.
 */
export const megabytesToBytes = (mb: number) => Math.floor(mb * 1e6);

/**
 * Does not modify the original array. Returns new array with zeros removed.
 */
export const removeZeros = (array: Uint8Array) => array.join('!').replace(/!0/g, '').split('!');

/**
 * Get a Uint8Array of bytes from a JSON serializable value.
 */
export const getEncodedBytes = (item: AcceptableDataType) => {
    const serialized = JSON.stringify(item);
    const encoded = new TextEncoder().encode(serialized);

    return encoded;
};

/**
 * Encode a JSON serializable value into bytes, then write it to a Uint8Array.
 */
export const encodeBytes = (item: AcceptableDataType, array: Uint8Array) => {
    const encoded = getEncodedBytes(item);

    encoded.forEach((num, i) => Atomics.store(array, i, num));
};

/**
 * Decode a JSON serialized value from bytes and return the parsed value.
 */
export const decodeBytes = <T extends AcceptableDataType>(array: Uint8Array): T => {
    // Early return 'empty' if there is absolutely nothing there
    const set = [...new Set(array)];
    if (set[0] === 0 && set.length === 1) return 'empty' as T;

    const decoded = new TextDecoder().decode(array);

    const parsed = JSON.parse(decoded.trim().replace(/\0/g, ''));

    return parsed;
};

/**
 * Clear out all used slots in a Uint8Array.
 */
export const wipeUsedBytes = (array: Uint8Array) => {
    const base = removeZeros(array);

    base.forEach((_, i) => Atomics.store(array, i, 0));
};

/**
 * Set a new value in a Uint8Array. If the byteLength of the used values in the Uint8Array
 * is larger than the new value, the Uint8Array will be wiped prior to setting the new value
 * to avoid potential future parsing issues.
 */
export const wipeUsedBytesAndSet = <T extends AcceptableDataType>(data: T, array: Uint8Array) => {
    const encoded = getEncodedBytes(data);
    // Accurately replaces all zeros and returns an array of only used bytes.
    const base = removeZeros(array);

    if (encoded.length < base.length) {
        base.forEach((_, i) => Atomics.store(array, i, 0));
    }

    encodeBytes(data, array);
};
