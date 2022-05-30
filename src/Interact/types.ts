import { Options } from '../runWorker/types';
import SharedMemory from '../SharedMemory';

// export type OnParentMessageCallback<T = unknown, A = unknown> = (data: T, memory: SharedMemory<A>) => any

export type APIFunction = Function & { _name: string, _options: Options, _path: string }