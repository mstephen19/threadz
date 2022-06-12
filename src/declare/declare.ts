import caller from 'caller-callsite';
import { MyError } from '../Errors';
import { ThreadzAPI } from '../ThreadzAPI';
import { ERROR_CONFIG } from './consts';

import type { Declarations } from './types';

/**
 *
 * Declare your workers within this function, and make its return value the default export of the current file.
 * 
 * @param declarations Declarations
 * @returns ThreadzAPI
 * 
 * **NOTE:** The return value of the declaration function _MUST_ be the default export of the file!
 * 
 * @example export default declare({ add5: { worker: (x) => x + 5 } })
 *
 */
export const declare = <T extends Declarations>(declarations: T) => {
    // If declarations are undefined, an array, or not an object
    const isNotObject = !declarations || Array.isArray(declarations) || typeof declarations !== 'object';

    if (isNotObject) throw new MyError(ERROR_CONFIG('Declarations must be defined, and must be an object.'));

    const values = Object.values(declarations);

    const isNotValidDeclarations = values.some((declaration) => !declaration?.worker || typeof declaration.worker !== 'function') || !values.length;

    // If any declarations don't have a "worker" key, or the "worker" isn't a function
    if (isNotValidDeclarations) {
        throw new MyError(ERROR_CONFIG('Each declaration must have a "worker" property which is a function.'));
    }

    const location = caller().getFileName();

    return new ThreadzAPI({ location, declarations });
};
