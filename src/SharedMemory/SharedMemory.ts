import { TypedEmitter } from 'tiny-typed-emitter';
import { TextEncoder, TextDecoder } from 'util';
import { ThreadzError } from '../utils';

interface SharedMemoryEvents {
    change: <T>(data: any) => T | void;
}

export default class SharedMemory<T extends unknown = {}> extends TypedEmitter<SharedMemoryEvents> {
    shared: Uint8Array;

    constructor({ initialState = {} as T, sizeMb, uInt8Array }: { initialState?: T; sizeMb?: number; uInt8Array?: Uint8Array }) {
        super();
        try {
            if (!initialState && !uInt8Array) throw new ThreadzError('must provide either an initial state or a Uint8Array');

            if (uInt8Array) {
                this.shared = uInt8Array;
                return;
            }

            const shared = new SharedArrayBuffer(sizeMb ? Math.floor(sizeMb * 1e6) : 1e6);
            this.shared = new Uint8Array(shared);

            this.state = initialState;
        } catch (err) {
            throw new ThreadzError('failed when creating shared memory: ' + (err as Error).message);
        }
    }

    static from<T extends unknown>(arr: Uint8Array) {
        return new SharedMemory<T>({ uInt8Array: arr });
    }

    //@ts-ignore
    get state(): string {
        try {
            return new TextDecoder().decode(this.shared);
        } catch (err) {
            throw new ThreadzError('failed when grabbing shared memory: ' + (err as Error).message);
        }
    }

    set state(newState: T) {
        try {
            const encoded = new TextEncoder().encode(JSON.stringify(newState));
            encoded.forEach((num, i) => Atomics.store(this.shared, i, num));
        } catch (err) {
            throw new ThreadzError('failed when setting shared memory: ' + (err as Error).message);
        }
    }
}
