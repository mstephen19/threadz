export type UnPromisify<T> = T extends Promise<infer U> ? U : T;

export type DeepUnPromisify<T> = UnPromisify<T> extends Promise<infer U> ? DeepUnPromisify<U> : UnPromisify<T>;

export interface InteractEvents {
    workerFinished: () => void;
}
