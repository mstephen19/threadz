export interface WorkerArgs {
    name: string;
    args: unknown[];
    declarationsPath: string;
    memory: Uint8Array;
}
