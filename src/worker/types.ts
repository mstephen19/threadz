export type WorkerData = {
    name: string;
    location: string;
    args: unknown[];
};

export type WorkerMessagePayload<T = unknown> = {
    done: boolean;
    success?: boolean;
    aborted?: boolean;
    error?: string;
    data?: T;
    messageData?: T;
};
