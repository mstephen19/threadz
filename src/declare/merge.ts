import { MyError } from '../Errors/index.js';
import { ThreadzAPI } from '../ThreadzAPI/index.js';
import { ERROR_CONFIG } from './consts.js';
import type { UnionToIntersection } from './types.js';

type DeclarationType<T extends any> = T extends ThreadzAPI<infer D> ? D : never;
type DeclarationsMap<T extends ThreadzAPI[]> = [...{ [K in keyof T]: DeclarationType<T[K]> }];

/**
 *  Merge the declarations of **n** number of ThreadsAPI instances. Returns a Declarations object to be re-declared.
 *
 * @param rest An array of ThreadzAPI instances
 * @returns The declarations from each instance merged into one set of declarations.
 *
 * **NOTE:** Does not return a ThreadzAPI instance! Returns a merged set of declarations to be used within the `declare()` function.
 *
 * @example
 * const declarations1 = declare({ add5: { worker: (x) => x + 5 } })
 * const declarations2 = declare({ add10: { worker: (x) => x + 10 } })
 *
 * export default declare(merge([declarations1, declarations2]))
 */
export const merge = <T extends ThreadzAPI[]>(rest: [...{ [K in keyof T]: T[K] }]) => {
    if (rest.some((item) => !(item instanceof ThreadzAPI))) {
        throw new MyError(ERROR_CONFIG('All items to be merged must be ThreadzAPI instances.'));
    }

    const mergedDeclarations = rest.map((api) => api.declarations) as DeclarationsMap<T>;
    const merged = mergedDeclarations.reduce((acc, curr) => ({ ...acc, ...curr })) as UnionToIntersection<DeclarationsMap<T>[number]>;

    return merged;
};
