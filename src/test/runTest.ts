// runTest.ts (ESM-compatible)
import { fileURLToPath } from 'url';
import path from 'path';
import { runTests } from '@vscode/test-electron';

// ESM-safe __dirname replacement
const _filename = fileURLToPath(import.meta.url);
const _dirname = path.dirname(_filename);

async function main() {
	try {
		// The folder containing the Extension Manifest package.json
		const extensionDevelopmentPath = path.resolve(_dirname, '../../');

		// The path to the test runner
		const extensionTestsPath = path.resolve(_dirname, './suite/index');

		// Download VS Code, unzip it and run the integration test
		await runTests({ extensionDevelopmentPath, extensionTestsPath });
	} catch (err) {
		console.error('Failed to run tests');
		console.error(err);
		process.exit(1);
	}
}

main();
