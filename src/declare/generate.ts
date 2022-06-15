// import { MyError } from '../Errors';
// import { ERROR_CONFIG } from './consts';

// import type { DeclarationFunction, UnionToIntersection } from './types';

// export const generate = <T extends DeclarationFunction[]>(funcs: [...{ [K in keyof T]: T[K] }]) => {
//     funcs.forEach((func) => {
//         if (typeof func !== 'function') {
//             throw new MyError(ERROR_CONFIG(`Can only pass an array of functions into the generate function. Received ${typeof func} for one value.`));
//         }
//     });

//     const entries = funcs.map((func) => [func.name, { worker: func }] as [typeof func['name'], { worker: typeof func }]);

//     return Object.fromEntries(entries);
// };

// export const generate = <T extends DeclarationFunction>(func: T) => {
//     return {
//         [func.name]: {
//             worker: func,
//         },
//     };
// };
