import { MyError } from '../Errors';

export interface ThreadzWorkerEvents<T = unknown> {
    error: (error: MyError) => void;
    success: (data: T) => void;
    message: (messageData: unknown) => void;
    aborted: (abortMessage: string) => void;
}
