import { Options } from '../runWorker/types';

export type APIFunction = Function & { _name: string, _options: Options, _path: string }