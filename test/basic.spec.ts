import fs from 'fs';
import { resolve } from 'path';
import { rollup } from 'rollup';
import { test } from 'uvu';

import { rollupPluginTreat } from '../lib';

const fixtureFolder = resolve(__dirname, './fixtures/');

const fixtureInputs = fs.readdirSync(fixtureFolder, {
	withFileTypes: false,
	encoding: 'utf8',
});

const build = (options: any, testFolder: string) =>
	rollup({
		input: resolve(fixtureFolder, testFolder, './main.js'),
		external: ['treat'],
		plugins: [rollupPluginTreat(options)],
	});

test.before(() => {
	process.env.ROLLUP_WATCH = 'true';
});

fixtureInputs.forEach(testFolder => {
	if (!/multiple-themes/.test(testFolder)) return;

	test(`should output css for ${testFolder}`, async () => {
		const bundle = await build(
			{
				outputCSS: 'bundle.css',
			},
			testFolder,
		);

		const { output } = await bundle.generate({
			hoistTransitiveImports: true,
			format: 'esm',
		});

		output.forEach((item) => {
			debugger;
			if (item.type === 'chunk') {

			} else if (item.type === 'asset') {

			}
		});
	});
});

test.run();
