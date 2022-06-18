import { SharedMemory } from '../SharedMemory';
import { SharedMemoryTransferObject } from '../types';

describe('SharedMemory', () => {
    describe('from', () => {
        it('Should throw if nothing is provided.', () => {
            // @ts-ignore
            expect(() => SharedMemory.from()).toThrow();
        });

        it('Should return a new SharedMemory instance when provided a state and options.', () => {
            const instance = SharedMemory.from('test', { sizeMb: 0.5 });

            expect(instance).toBeInstanceOf(SharedMemory);
            expect(instance.byteLength).toBe(5e5);
        });

        it('Should return a SharedMemory instance when provided a SharedMemoryTransferObject.', () => {
            const mem = SharedMemory.from('hello world');
            const instance = SharedMemory.from(mem.transfer());

            expect(instance).toBeInstanceOf(SharedMemory);
            expect(instance.byteLength).toBe(mem.byteLength);
        });

        it('Should return the same SharedMemory instance passed into it.', () => {
            const mem = SharedMemory.from('hello world');
            const instance = SharedMemory.from(mem);

            expect(instance).toBeInstanceOf(SharedMemory);
            expect(instance).toEqual(mem);
        });

        it('Should have a default SharedArrayBuffer size of 0.001MB.', () => {
            expect(SharedMemory.from({ abc: 'test' }).byteLength).toBe(1e3);
        });
    });

    describe('transfer', () => {
        const instance = SharedMemory.from({ hello: 'world' });

        it('Should return a SharedMemoryTransferObject.', () => {
            expect(instance.transfer()).toHaveProperty('_sharedMemoryByteArray');
            expect(instance.transfer()._sharedMemoryByteArray).toBeInstanceOf(Uint8Array);
        });

        it('The SharedMemoryTransferObject should be immutable.', () => {
            const mock = jest.fn((obj: SharedMemoryTransferObject) => (obj._sharedMemoryByteArray = new Uint8Array()));

            expect(() => mock(instance.transfer())).toThrowError();
        });
    });

    describe('get', () => {
        const instance = SharedMemory.from({ hello: 'world' });

        it('Should return the current state.', () => {
            expect(instance.get()).toEqual({ hello: 'world' });
        });

        it('Should return a promise when provided "true" parameter.', () => {
            expect(instance.get(true)).toBeInstanceOf(Promise);
        });

        it('Should run as a microtask and return the current state at the end of the event loop.', async () => {
            const data = await instance.get(true);

            expect(data).toEqual({ hello: 'world' });
        });
    });

    describe('wipe', () => {
        const instance = SharedMemory.from({ hello: 'world' });

        it('Should completely wipe the state.', () => {
            instance.wipe();

            expect(instance.get()).toBe('empty');
        });

        it('Should return a promise when provided "true" parameter.', () => {
            expect(instance.wipe(true)).toBeInstanceOf(Promise);
        });
    });

    describe('set', () => {
        const instance = SharedMemory.from<Record<string, string>>({ hello: 'world' });

        it('Should set the state to be the new specified value.', () => {
            instance.set({ hello: 'johnny' });
            expect(instance.get()).toEqual({ hello: 'johnny' });

            instance.set({ hello: 'a' });
            expect(instance.get()).toEqual({ hello: 'a' });
        });

        it('Should return a promise when called with the microtask parameter set to "true".', () => {
            expect(instance.set({ hey: 'bro' }, true)).toBeInstanceOf(Promise);
        });

        it('Should have set the value once the promise has resolved.', async () => {
            await instance.set({ johnny: 'heyooooo' }, true);

            expect(instance.get()).toEqual({ johnny: 'heyooooo' });
        });
    });

    describe('setWith', () => {
        const instance = SharedMemory.from([1, 2, 3]);

        it('Should call the callback function.', () => {
            const mock = jest.fn((data: number[]) => [...data, 4, 5]);

            instance.setWith(mock);

            expect(mock).toHaveBeenCalled();
        });

        it("Should set the state based on the callback function's return value.", () => {
            expect(instance.get()).toEqual([1, 2, 3, 4, 5]);
        });
    });
});
