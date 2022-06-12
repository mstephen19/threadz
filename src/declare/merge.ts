import { ThreadzAPI } from '../ThreadzAPI';

type DeclarationType<T extends any> = T extends ThreadzAPI<infer D> ? D : never;
type DeclarationsMap<T extends ThreadzAPI[]> = [...{ [K in keyof T]: DeclarationType<T[K]> }];

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

/**
 *  Merge the declarations of **n** number of ThreadsAPI instances. Returns a Declarations object to be re-declared.
 *
 * @param rest An array of ThreadzAPI instances
 * @returns The declarations from each instance merged into one set of declarations.
 * 
 * **NOTE:** Does not return a ThreadzAPI instance! Returns a merged set of declarations to be used within the `declare()` function.
 */
export const merge = <T extends ThreadzAPI[]>(rest: [...{ [K in keyof T]: T[K] }]) => {
    const mergedDeclarations = rest.map((api) => api.declarations) as DeclarationsMap<T>;
    const merged = mergedDeclarations.reduce((acc, curr) => ({ ...acc, ...curr })) as UnionToIntersection<DeclarationsMap<T>[number]>;

    return merged;
};
