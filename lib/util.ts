import type { OutputChunk } from 'rollup';
import { rollup } from 'rollup';
import resolve from '@rollup/plugin-node-resolve';
import builtins from 'builtin-modules';

import debug from 'debug';

export const d = debug('rollup-plugin-treat');

export const childCompile = async (id: string): Promise<OutputChunk> => {
	const fileBundle = await rollup({
		input: id,
		external: [...builtins, 'treat'],
		plugins: [resolve()],
	});

	const { output } = await fileBundle.generate({
		format: 'cjs',
	});

	if (output.length > 1)
		throw new Error(
			"Didnt expect child compiler to produce more than 1 file. Perhaps you're using async imports?",
		);

	return output[0];
};
