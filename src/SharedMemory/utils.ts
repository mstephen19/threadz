import { TextEncoder, TextDecoder } from 'util';

export const stringifyJSON = <T>(item: T): Promise<string> => {
    return new Promise((resolve) => {
        const stringified = JSON.stringify(item);
        resolve(stringified);
    });
};
export const parseJSON = <T>(str: string): Promise<T> => {
    return new Promise((resolve) => {
        const parsed = JSON.parse(str.trim().replace(/\0/g, ''));
        resolve(parsed);
    });
};

export const atomicStore = (arr: Uint8Array, index: number, value: number): Promise<boolean> => {
    return new Promise((resolve) => {
        Atomics.store(arr, index, value);
        resolve(true);
    });
};

export const encodeText = (text: string): Promise<Uint8Array> => {
    return new Promise((resolve) => {
        const encoded = new TextEncoder().encode(text);
        resolve(encoded);
    });
};

export const decodeUint8Array = (arr: Uint8Array): Promise<string> => {
    return new Promise((resolve) => {
        const decoded = new TextDecoder().decode(arr);
        resolve(decoded);
    });
};
