import { ThreadzAPI } from '../ThreadzAPI.js';
import { ThreadzWorkerPool } from '../../ThreadzWorkerPool/ThreadzWorkerPool.js';
import { Interact } from '../../Interact/index.js';

import type { ModifiedMappedWorkerFunction } from '../types';

describe('ThreadzAPI', () => {
    const location = __dirname;
    const declarations = {
        test: {
            worker: (num1: number) => num1 + 10,
        },
    };

    describe('constructor', () => {
        it('should not throw an error when instantiated', () => {
            expect(() => new ThreadzAPI({ location, declarations })).not.toThrow();
        });

        const api = new ThreadzAPI({ location, declarations });

        it('should generate a map of workers based on the declarations provided', () => {
            expect(api.workers).toHaveProperty('test');
            expect(typeof api.workers.test).toBe('function');
        });

        it('should add extra properties to each function in the workers map', () => {
            const mapped = api.workers.test as ModifiedMappedWorkerFunction<typeof api.workers.test>;

            expect(mapped).toHaveProperty('_name');
            expect(mapped._name).toBe('test');

            expect(mapped).toHaveProperty('_location');
            expect(mapped._location).toBe(location);

            expect(mapped).toHaveProperty('_options');
            expect(mapped._options).toEqual({});

            expect(mapped).toHaveProperty('_priority');
            expect(mapped._priority).toBeFalsy();
        });

        it('should freeze the mapped workers object', () => {
            expect(() => {
                // @ts-ignore
                api.workers.test = 'hi';
            }).toThrow();
        });

        it('should freeze the original declarations object', () => {
            expect(() => {
                // @ts-ignore
                api.declarations.test = 'hi';
            }).toThrow();
        });
    });

    const api = new ThreadzAPI({ location, declarations });

    describe('declarationCount', () => {
        it('should accurately state how many declarations are on the instance', () => {
            expect(api.declarationCount).toBe(1);
        });
    });

    describe('threadzPool', () => {
        it('should return an instance of ThreadzWorkerPool', () => {
            expect(api.threadzPool).toBeInstanceOf(ThreadzWorkerPool);
        });
    });

    describe('interactWith', () => {
        it('should return an instance of Interact', () => {
            expect(api.interactWith('test')).toBeInstanceOf(Interact);
        });
    });
});
