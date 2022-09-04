export type BackgroundWorkerCallPayload = {
    name: string;
    id: string;
    args: unknown[];
    terminate?: boolean;
};

export type BackgroundWorkerCallResponse = {
    name: string;
    id: string;
    payload: unknown;
    error?: string;
};
