import chalk from 'chalk';

export class ThreadzError extends Error {
    constructor(msg: string) {
        const colored = `${chalk.blueBright('[threadz]')} ${chalk.grey(msg)}`;
        super(colored);
    }
}
