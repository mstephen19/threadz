import { MyError } from '../Errors/index.js';

export interface ThreadzWorkerEvents<T = unknown, B = unknown> {
    error: (error: MyError) => void;
    success: (data: T) => void;
    message: (messageData: B) => void;
    aborted: (abortMessage: string) => void;
    started: () => void;
}
