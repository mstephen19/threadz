export interface CommunicateEvents {
    message: (data: { portNumber: 1 | 2; data: unknown }) => void;
}
