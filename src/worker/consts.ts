import type { WorkerMessagePayload } from './types.js';

export const SUCCESS_PAYLOAD = <T = unknown>(data: T): WorkerMessagePayload<T> => ({ done: true, success: true, data });

export const ERROR_PAYLOAD = (message: string): WorkerMessagePayload => ({ done: true, success: false, error: message });

export const MESSAGE_PAYLOAD = <T extends unknown>(messageData: T): WorkerMessagePayload<T> => ({ done: false, messageData });
