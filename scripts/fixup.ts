import * as fs from 'fs/promises';
import path from 'path';

(async () => {
    await Promise.all([
        fs.writeFile(
            path.join(__dirname, '../dist/cjs/package.json'),
            JSON.stringify(
                {
                    type: 'commonjs',
                },
                null,
                2
            )
        ),
        fs.writeFile(
            path.join(__dirname, '../dist/mjs/package.json'),
            JSON.stringify(
                {
                    type: 'module',
                },
                null,
                2
            )
        ),
    ]);

    const content = `import * as url from 'url';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));`;

    const filePath = path.join(__dirname, '../dist/mjs/ThreadzWorker/ThreadzWorker.js');

    const file = Buffer.from(await fs.readFile(filePath)).toString('utf-8');
    const modified = file.split(/\n/);
    const index = modified.findIndex((val) => val === '');

    modified.splice(5, 0, content);

    await fs.writeFile(filePath, modified.join('\n'));
})();
