import { MessagePort } from 'worker_threads';
import { WorkerType } from '../ThreadzWorker/consts.js';

export type WorkerData = {
    name: string;
    location: string;
    args: unknown[];
    port?: MessagePort;
    type: WorkerType;
};

export type WorkerMessagePayload<T = unknown> = {
    done: boolean;
    success?: boolean;
    aborted?: boolean;
    error?: string;
    data?: T;
    messageData?: T;
};
