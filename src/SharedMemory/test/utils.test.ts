import { getEncodedBytes, isSharedMemoryTransferObject, megabytesToBytes, removeZeros } from '../utils';

describe('isSharedMemoryTransferObject', () => {
    it('Should return true if the object passes the condition.', () => {
        expect(isSharedMemoryTransferObject({ _sharedMemoryByteArray: new Uint8Array() })).toBeTruthy();
    });

    it("Should return false when the object doesn't pass the condition", () => {
        expect(isSharedMemoryTransferObject({ _sharedMemoryByteArray: 'someString' })).toBeFalsy();
    });
});

describe('megabytesToBytes', () => {
    it('Should convert megabytes to bytes.', () => {
        expect(megabytesToBytes(10)).toBe(1e7);
    });
});

describe('removeZeros', () => {
    it('Should remove all zeros from a Uint8Array', () => {
        const cleaned = removeZeros(Uint8Array.from([1, 2, 0, 0, 0]));

        expect(cleaned.length).toBe(2);
        expect([...cleaned]).toEqual(['1', '2']);
    });
});

describe('getEncodedBytes', () => {
    it('Should return a Uint8Array', () => {
        expect(getEncodedBytes('hello world')).toBeInstanceOf(Uint8Array);
    });
});
