export type UnPromisify<T> = T extends Promise<infer U> ? U : T;

export type DeepUnPromisify<T> = UnPromisify<UnPromisify<UnPromisify<UnPromisify<T>>>>;
