import path from 'path';
import { ThreadzAPI } from '../../ThreadzAPI/index.js';
import { declare } from '../declare.js';

describe('declare', () => {
    it('Should throw an error if no declarations have been passed in.', () => {
        // @ts-ignore
        expect(() => declare()).toThrow();
    });

    it('Should throw an error if any invalid datatypes are passed in.', () => {
        // @ts-ignore
        expect(() => declare(1)).toThrow();
        // @ts-ignore
        expect(() => declare([])).toThrow();
        // @ts-ignore
        expect(() => declare('abc')).toThrow();
    });

    it('Should throw an error if any declarations are missing a "worker" property.', () => {
        expect(() =>
            declare({
                test: {
                    worker: (num1: number) => num1 + 10,
                },
                test2: {
                    // @ts-ignore
                    hi: 'string',
                },
            })
        ).toThrow();
    });

    it('Should throw an error if any declarations\' "worker" properties aren\'t functions.', () => {
        expect(() =>
            declare({
                test: {
                    worker: (num1: number) => num1 + 10,
                },
                test2: {
                    // @ts-ignore
                    worker: 'string',
                },
            })
        ).toThrow();
    });

    it('Should return a ThreadzAPI instance when passed a correct declarations object.', () => {
        const api = declare({
            test: {
                worker: (num1: number) => num1 + 10,
            },
        });

        expect(api).toBeInstanceOf(ThreadzAPI);
    });
});
