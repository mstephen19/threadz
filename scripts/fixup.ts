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
})();
