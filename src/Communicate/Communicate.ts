import { TypedEmitter } from 'tiny-typed-emitter';
import { MessageChannel } from 'worker_threads';
import { MyError } from '../Errors';
import { Interact } from '../Interact';
import { ERROR_CONFIG } from './consts';

import type { MessagePort } from 'worker_threads';
import type { CommunicateEvents } from './types';

export class Communicate extends TypedEmitter<CommunicateEvents> {
    private messageChannel: MessageChannel;
    readonly port1: MessagePort;
    readonly port2: MessagePort;
    protected totalWorkers: number;
    protected finishedWorkers: number;

    private constructor(
        { port1: port1Workers, port2: port2Workers }: { port1: Interact[]; port2: Interact[] },
        { autoClosePorts }: { autoClosePorts: boolean }
    ) {
        super();

        this.messageChannel = new MessageChannel();

        const { port1, port2 } = this.messageChannel;

        this.totalWorkers = port1Workers.length + port2Workers.length;

        const addPorts = (port: MessagePort) => {
            return (api: Interact) => {
                api.addMessagePort(port);

                if (autoClosePorts) {
                    api.on('workerFinished', () => {
                        this.finishedWorkers += 1;
                        if (this.finishedWorkers >= this.totalWorkers) this.closePorts();
                    });
                }
            };
        };

        port1Workers.forEach(addPorts(port1));
        port2Workers.forEach(addPorts(port2));

        port1.on('message', (data) => this.emit('message', data as unknown));
        port2.on('message', (data) => this.emit('message', data as unknown));

        this.port1 = port1;
        this.port2 = port2;
        this.finishedWorkers = 0;
    }

    /**
     *
     * @param instances Two Interact API instances
     * @param options If `autoClosePorts` is set to `false`, the ports will not automatically be closed after the workers finish.
     */
    static between(instances: [Interact, Interact], { autoClosePorts }?: { autoClosePorts?: boolean }): Communicate;
    static between(instances: { port1: Interact[]; port2: Interact[] }, { autoClosePorts }?: { autoClosePorts?: boolean }): Communicate;
    static between(
        instances: { port1: Interact[]; port2: Interact[] } | [Interact, Interact],
        { autoClosePorts }: { autoClosePorts?: boolean } = {}
    ): Communicate {
        // If it's not even an object, throw error
        if (typeof instances !== 'object') {
            throw new MyError(ERROR_CONFIG('Must pass in an object or an array!'));
        }

        if (Array.isArray(instances)) {
            // If it's an array but not a tuple with length of 2, throw
            if (instances.length !== 2) throw new MyError(ERROR_CONFIG('If you provide an array, it must have a length of two!'));

            // Make sure they're passing in Interact API instances
            if (instances.some((item) => !(item instanceof Interact))) {
                throw new MyError(ERROR_CONFIG('Each item in the array must be an Interact API instance!'));
            }

            return new Communicate({ port1: [instances[0]], port2: [instances[1]] }, { autoClosePorts: autoClosePorts ?? true });
        }

        // If the object doesn't have both of these properties, throw an error
        if (!instances?.port1 || !instances?.port2) {
            throw new MyError(ERROR_CONFIG('Options object must contain both port1 and port2 properties!'));
        }

        // Each property's array must have at least on item
        if (!instances.port1.length || !instances.port2.length) {
            throw new MyError(ERROR_CONFIG('Must provide at least one Interact API instance in both the port1 and port2 arrays!'));
        }

        return new Communicate(instances, { autoClosePorts: autoClosePorts ?? true });
    }

    closePorts() {
        this.port1.close();
        this.port2.close();
    }
}
