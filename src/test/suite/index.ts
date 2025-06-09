import Mocha from 'mocha';
import { glob } from 'glob';
import path from 'path';

export async function run(): Promise<void> {
    const mocha = new Mocha({ ui: 'tdd', color: true });
    const testsRoot = path.resolve(__dirname, '..');
    const files = await glob('**/*.test.js', { cwd: testsRoot });

    for (const file of files) {
        const fullPath = path.resolve(testsRoot, file);
        mocha.addFile(fullPath);
    }

    return new Promise((resolve, reject) => {
        mocha.run(failures => {
            if (failures > 0) {
                reject(new Error(`${failures} tests failed.`));
            } else {
                resolve();
            }
        });
    });
}
