import { MessagePort } from 'worker_threads';

export type WorkerData = {
    name: string;
    location: string;
    args: unknown[];
    port?: MessagePort;
    type: 'BACKGROUND' | 'REGULAR';
};

export type WorkerMessagePayload<T = unknown> = {
    done: boolean;
    success?: boolean;
    aborted?: boolean;
    error?: string;
    data?: T;
    messageData?: T;
};
