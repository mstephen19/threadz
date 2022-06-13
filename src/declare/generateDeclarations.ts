// import { MyError } from '../Errors';
// import { ERROR_CONFIG } from './consts';

// import type { DeclarationFunction, UnionToIntersection } from './types';

// export const generateDeclarations = <T extends DeclarationFunction[]>(funcs: [...{ [K in keyof T]: T[K] }]) => {
//     funcs.forEach((func) => {
//         if (typeof func !== 'function') {
//             throw new MyError(ERROR_CONFIG(`Can only pass an array of functions into the generate function. Received ${typeof func} for one value.`));
//         }
//     });

//     const map = {} as {
//         [K in keyof T]: {
//             worker: T[K];
//         };
//     };

//     funcs.forEach((func) => (map[func.name] = { worker: func }));

//     return map;
// };
