export interface WorkerArgs {
    name: string;
    args: unknown[];
    declarationsPath: string;
    memory: Uint8Array;
}

export interface MemoryArgument {
    _isSharedMemory: Uint8Array;
}
