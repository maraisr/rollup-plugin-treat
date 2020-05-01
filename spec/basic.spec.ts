import { rollup } from 'rollup';
import fs from 'fs';
import { resolve } from 'path';

import { rollupPluginTreat } from '../lib';

const fixtureFolder = resolve(__dirname, './fixtures/');

const fixtureInputs = fs.readdirSync(fixtureFolder, {
	withFileTypes: false,
});

// @ts-ignore
test.each(fixtureInputs as any)('it should snapshot match %s', async (testFolder: string) => {
	const bundle = await rollup({
		input: resolve(fixtureFolder, testFolder, './main.js'),
		plugins: [
			rollupPluginTreat({}),
		],
	});

	const { output } = await bundle.generate({
		format: 'cjs',
	});

	output.forEach(item => {
		if (item.type === 'chunk') {
			expect(item.code).toMatchSnapshot(item.name);
		} else if (item.type === 'asset') {
			expect(item.source).toMatchSnapshot(item.fileName);
		}
	});
});
