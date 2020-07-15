import { rollup } from 'rollup';
import fs from 'fs';
import { resolve } from 'path';

import { rollupPluginTreat } from '../lib';

const fixtureFolder = resolve(__dirname, './fixtures/');

const fixtureInputs = fs.readdirSync(fixtureFolder, {
	withFileTypes: false,
});

const build = (options, testFolder) =>
	rollup({
		input: resolve(fixtureFolder, testFolder, './main.js'),
		external: ['treat'],
		plugins: [rollupPluginTreat(options)],
	});

// @ts-ignore
test.each(fixtureInputs as any)(
	'it should snapshot match %s',
	async (testFolder: string) => {
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
			if (item.type === 'chunk') {
				expect(item.code).toMatchSnapshot(item.name);
			} else if (item.type === 'asset') {
				expect(item.source).toMatchSnapshot(item.fileName);
			}
		});
	},
);

// @ts-ignore
test.each(fixtureInputs as any)(
	'it should not output css %s',
	async (testFolder: string) => {
		const onCSSOutputSpy = jest.fn();

		const bundle = await build(
			{
				outputCSS: false,
				onCSSOutput: onCSSOutputSpy,
			},
			testFolder,
		);

		const { output } = await bundle.generate({
			hoistTransitiveImports: true,
			format: 'esm',
		});

		expect(output.length).toBeGreaterThan(0);
		expect(onCSSOutputSpy).toHaveBeenCalledTimes(0);
	},
);
