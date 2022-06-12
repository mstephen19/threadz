export type FromOptions = { sizeMb?: number };

export type FromArgumentType = SharedMemoryTransferObject | AcceptableDataType | AcceptableObject;

export type SharedMemoryTransferObject<T extends AcceptableDataType = AcceptableDataType> = {
    _sharedMemoryByteArray: Uint8Array;
};

export type AcceptableObject = {
    [key: string | number | symbol]: unknown;
} & { _sharedMemoryByteArray?: never };

export type AcceptableDataType = AcceptableObject | string | number | unknown[];
