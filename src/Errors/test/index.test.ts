import chalk from 'chalk';
import { MyError } from '..';

describe('MyError', () => {
    const err = new MyError({ name: 'TestError', title: 'some error', message: 'oops!' });

    it('Should have the specified name.', () => {
        expect(err.name).toBe(chalk.red('TestError'));
    });

    it('Should have the specified title.', () => {
        expect(err.message.includes('some error')).toBeTruthy();
    });

    it('Should have the specified message.', () => {
        expect(err.message.includes('oops!')).toBeTruthy();
    });
});
