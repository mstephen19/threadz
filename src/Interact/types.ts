export type UnPromisify<T> = T extends Promise<infer U> ? U : T;

// ? Will this work?
export type DeepUnPromisify<T> = UnPromisify<T> extends Promise<infer U> ? UnPromisify<U> : T;

export interface InteractEvents {
    workerFinished: () => void;
}
