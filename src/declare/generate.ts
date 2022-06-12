import type { DeclarationFunction } from './types';

export const generate = <T extends DeclarationFunction>(func: T) => {
    return {
        [func.name]: {
            worker: func,
        },
    };
};
