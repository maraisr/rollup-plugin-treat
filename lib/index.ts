import type { OutputChunk, Plugin, PluginContext } from 'rollup';
import { rollup } from 'rollup';
import type { FilterPattern } from '@rollup/pluginutils';
import { createFilter, dataToEsm } from '@rollup/pluginutils';
import crypto from 'crypto';
import path from 'path';
import type { WebpackTreat as TreatStoreInterface } from 'treat/lib/types/types';
import { TreatTheme } from 'treat/lib/types/types';
import processCss from 'treat/webpack-plugin/processCss';
import eval from 'eval';

import debugLib from 'debug';
import { ThemeOrAny } from 'treat/theme';

const debug = debugLib('rollupPluginTreat');

const THEMED = Symbol('themed treat style');
const LOCAL = Symbol('local treat style');

const treatStoreCache = new WeakMap<PluginContext, TreatStore>(); // TODO: Type me

interface FilterOptions {
	include?: FilterPattern;
	exclude?: FilterPattern;
}

interface Options extends FilterOptions {
	localIdentName?: string;
	themeIdentName?: (() => string) | string;
	outputCSS?: boolean;
}

const isWatchMode = process.env.ROLLUP_WATCH !== 'true'; // TODO: Confirm this is how we check?

const defaultOptions = (options: Partial<Options>): Required<Options> => {
	const {
		exclude = null,
		outputCSS = true,
		include = /\.treat\.(ts|js)$/,
		localIdentName = isWatchMode
			? '[name]-[local]_[hash:base64:5]'
			: '[hash:base64:5]',
		themeIdentName = isWatchMode
			? '_[name]-[local]_[hash:base64:4]'
			: '[hash:base64:4]',
	} = options;

	return {
		exclude,
		localIdentName,
		themeIdentName,
		include,
		outputCSS,
	};
};

export const rollupPluginTreat = (passedOptions: Options): Plugin => {
	const options = defaultOptions(passedOptions);
	const shouldProcessAsTreat = createFilter(options.include, options.exclude);

	return {
		name: 'rollupPluginTreat',

		async transform(code: string, id) {
			if (!shouldProcessAsTreat(id)) return null;

			if (this.cache.has(id)) return this.cache.get(id);

			const sourceCompiled = await childCompile(id);

			let __treat_store__ = treatStoreCache.get(this);

			if (!__treat_store__) {
				__treat_store__ = new TreatStore(options, code, id);
				treatStoreCache.set(this, __treat_store__);
			}

			let result;
			try {
				result = eval(
					`
					require('treat/lib/commonjs/webpackTreat').setWebpackTreat(__treat_store__);
					${sourceCompiled.code}
				`,
					id,
					{
						console,
						__treat_store__,
					},
					true,
				);
			} catch (e) {
				throw e;
			}

			if (options.outputCSS) {
				const cssValue = await processCss(
					{
						'.test': {
							color: 'red',
						},
					},
					{
						browsers: [],
						minify: false,
						from: id,
					},
				);

				this.emitFile({
					type: 'asset',
					source: cssValue,
				});
			}

			return dataToEsm(result, {
				namedExports: true,
				preferConst: true,
			});
		},
	};
};

const childCompile = async (id: string): Promise<OutputChunk> => {
	const fileBundle = await rollup({
		input: id,
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

class TreatStore implements TreatStoreInterface {
	constructor(
		private options: ReturnType<typeof defaultOptions>,
		private sourceCode: string,
		private id: string,
	) {}

	themeIdentFn = processIdent(
		this.options.themeIdentName,
		this.sourceCode,
		this.id,
	);
	localIdentFn = processIdent(
		this.options.localIdentName,
		this.sourceCode,
		this.id,
	);

	themes: Array<TreatTheme<ThemeOrAny>> = [];

	styles = new Set();

	addLocalCss(css) {}

	addThemedCss(themeRef, css) {}

	getIdentName(local, scopeId, theme) {
		return theme !== undefined
			? this.themeIdentFn(local, scopeId, theme)
			: this.localIdentFn(local, scopeId);
	}

	addTheme(theme) {
		this.themes.push(theme);
	}

	getThemes() {
		return this.themes;
	}
}

const processIdent = (identFn, sourceCode: string, id: string) => {
	return (localName: string, scopeId: string, theme?: string): string => {
		const identName =
			typeof identFn === 'function' ? identFn(theme) : identFn;

		return identName
			.replace(
				/\[(?:([^:\]]+):)?(?:hash|contenthash)(?::([a-z]+\d*))?(?::(\d+))?\]/gi,
				(_all, hashType = 'md5', digestType, maxLength = 10) =>
					crypto
						.createHash(hashType)
						.update(`${sourceCode}${scopeId}`)
						.digest(digestType)
						.slice(0, maxLength),
			)
			.replace(/\[local]/gi, localName)
			.replace(/\[name]/gi, path.basename(id, path.extname(id)))
			.replace('treat-', '')
			.replace(new RegExp('[^a-zA-Z0-9\\-_\u00A0-\uFFFF]', 'g'), '-')
			.replace(/^((-?[0-9])|--)/, '_$1');
	};
};
