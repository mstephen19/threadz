import type { ResourceLimits } from 'worker_threads';

export interface GoArguments {
    name: string;
    args: unknown[];
    declarationsPath: string;
}

export interface Options {
    /**
     * An optional set of resource limits for the new JS engine instance. Reaching these limits leads to termination of the `Worker` instance. These limits only affect the JS engine, and no external data, including no `ArrayBuffer`s. Even if these limits are set, the process may still abort if it encounters a global out-of-memory situation.
     */
    resourceLimits?: ResourceLimits;
    /**
     * List of arguments which would be stringified and appended to `process.argv` in the worker. This is mostly similar to passing arguments to the worker, but the values are available on the global `process.argv` as if they were passed as CLI options to the script.
     */
    argv?: any[];
    /**
     * If this is set to `true`, then `worker.stdin` provides a writable stream whose contents appear as `process.stdin` inside the Worker. By default, no data is provided.
     */
    stdin?: boolean;
    /**
     * If this is set to `true`, then `worker.stdout` is not automatically piped through to `process.stdout` in the parent.
     */
    stdout?: boolean;
    /**
     * If this is set to `true`, then `worker.stderr` is **not** automatically piped through to `process.stderr` in the parent.
     */
    stderr?: boolean;
    /**
     * List of node CLI options passed to the worker. V8 options (such as `--max-old-space-size`) and options that affect the process (such as `--title`) are not supported. If set, this is provided as `process.execArgv` inside the worker. By default, options are inherited from the parent thread.
     */
    execArgv?: string[];
    /**
     * If this is set to `true`, then the Worker tracks raw file descriptors managed through `fs.open()` and `fs.close()`, and closes them when the Worker exits, similar to other resources like network sockets or file descriptors managed through the `FileHandle` API. This option is automatically inherited by all nested workers. Default: `true`.
     */
    trackUnmanagedFds?: boolean;
}
