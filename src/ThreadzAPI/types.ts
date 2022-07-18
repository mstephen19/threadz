import type { Declarations, DeclarationFunction, WorkerOptions } from '../declare/types';
import type { DeepUnPromisify } from '../Interact/types';

export type ThreadzAPIConstructorOptions<T extends Declarations> = {
    readonly location: string;
    readonly declarations: T;
};

export interface ThreadzAPIEvents {
    workerQueued: ({ name, args }: { name: string; args: any[] }) => void;
    workerDone: ({ name, args }: { name: string; args: any[] }) => void;
}

export type MappedWorkers<T extends Declarations> = Readonly<{
    [K in keyof T]: MappedWorkerFunction<T[K]['worker']>;
}>;

export type MappedWorkerFunction<T extends DeclarationFunction = DeclarationFunction> = (
    ...args: Parameters<T>
) => Promise<DeepUnPromisify<ReturnType<T>>>;

export type ModifiedMappedWorkerFunction<T extends MappedWorkerFunction> = T & {
    _name: string;
    _location: string;
    _options: WorkerOptions;
    _priority: boolean;
};
