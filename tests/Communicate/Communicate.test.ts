import { MessageChannel } from 'worker_threads';
import { Communicate } from '../../src/Communicate/Communicate';
import { declare } from '../../src/declare';

describe('Communicate', () => {
    describe('newMessageChannel', () => {
        it('Should return a MessageChannel instance', () => {
            const channel = Communicate.newMessageChannel();

            expect(channel).toBeInstanceOf(MessageChannel);
        });
    });

    describe('between', () => {
        it('Should add both worker instances to the API', () => {
            const api = declare({
                test: {
                    worker: () => 'abc',
                },
            });

            const instance = Communicate.between([api.interactWith('test'), api.interactWith('test')]);

            expect(instance.totalWorkers).toEqual(2);
        });
    });
});
