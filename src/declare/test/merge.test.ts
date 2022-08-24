import { declare } from '../declare.js';
import { merge } from '../merge.js';

describe('merge', () => {
    const decs1 = declare({
        foo: {
            worker: () => 'hi',
        },
    });

    const decs2 = declare({
        bar: {
            worker: () => 'hi',
        },
    });

    it("should throw an error if any of the items in the array aren't a ThreadzAPI instance", () => {
        // @ts-ignore
        expect(() => merge([decs1, decs2, 'foo'])).toThrow();
    });

    it('should return a new declarations object when provided the correct parameters', () => {
        const merged = merge([decs1, decs2]);

        expect(merged).toHaveProperty('foo');
        expect(merged).toHaveProperty('bar');
    });
});
