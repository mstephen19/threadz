import { Options } from '../runWorker/types';

export type OnWorkerMessageCallback<T = unknown> = (data: T) => any

export type APIFunction = Function & { _name: string, _options: Options, _path: string }