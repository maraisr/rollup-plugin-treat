import type { FilterPattern } from '@rollup/pluginutils';
import { createFilter, dataToEsm } from '@rollup/pluginutils';
import crypto from 'crypto';
import eval from 'eval';
import path from 'path';
import type { Plugin } from 'rollup';
import type { StoreType, StyleItem } from './store';
import { store, STYLE_TYPE } from './store';
import { childCompile, d } from './util';

const { version } = require('../package.json');

interface FilterOptions {
	include?: FilterPattern;
	exclude?: FilterPattern;
}

interface Options extends FilterOptions {
	localIdentName: string;
	themeIdentName: (() => string) | string;
	outputCSS: boolean | string;
	minify: boolean;
	browsers: Array<string>;

	onCSSOutput(source: string): Promise<string> | string;
}

const isProduction = !process.env.ROLLUP_WATCH;

const defaultOptions = (options: Partial<Options>): Options => {
	const {
		exclude = null,
		outputCSS = true,
		include = /\.treat\.(ts|js)$/,
		localIdentName = !isProduction
			? '[name]-[local]_[hash:base64:5]'
			: '[hash:base64:5]',
		themeIdentName = !isProduction
			? '_[name]-[local]_[hash:base64:4]'
			: '[hash:base64:4]',
		minify = isProduction,
		browsers = [],
		onCSSOutput = (source) => source,
	} = options;

	return {
		exclude,
		localIdentName,
		themeIdentName,
		include,
		outputCSS,
		onCSSOutput,
		minify,
		browsers,
	};
};

export const rollupPluginTreat = (passedOptions: Partial<Options>): Plugin => {
	const options = defaultOptions(passedOptions);
	const shouldProcessAsTreat = createFilter(options.include, options.exclude);

	d('version %s', version);
	d('environment %s', isProduction ? 'production' : 'development');

	const treatStore = store();

	return {
		name: 'TreatPlugin',

		async transform(_code: string, id) {
			if (!shouldProcessAsTreat(id)) return null;

			if (this.cache.has(id)) return this.cache.get(id);

			const compiledTreatFile = await childCompile(id);

			const styleRefs = processTreatFile(compiledTreatFile.code, {
				id,
				options,
				store: treatStore,
			});

			const code = dataToEsm(styleRefs, {
				namedExports: true,
				preferConst: true,
			});

			return {
				code,
				moduleSideEffects: true,
				syntheticNamedExports: false,
				map: { mappings: '' },
			};
		},

		async generateBundle(_outputOptions, _bundle) {
			if (options.outputCSS) {
				let output = '';
				const modules = [...this.moduleIds].map((m) =>
					this.getModuleInfo(m),
				);

				for (const module of modules) {
					const maybeResource = treatStore.getStyleResource(
						module.id,
					);

					if (maybeResource) {
						const one_object = maybeResource.reduce(
							(result, item) => {
								return {
									...result,
									...item.styles,
								};
							},
							{},
						);

						const css =
							(await processCss(one_object, {
								browsers: options.browsers,
								minify: options.minify,
								from: module.id,
							})) ?? '';

						output += css;
					}
				}

				const passedCss = await options.onCSSOutput(output);

				this.emitFile({
					type: 'asset',
					source: passedCss,
					fileName:
						typeof options.outputCSS === 'string'
							? options.outputCSS
							: undefined,
				});
			}
		},
	};
};

const processTreatFile = (
	sourceCode: string,
	context: { id: string; options: Options; store: StoreType },
) => {
	const trackingStyles = new Set<StyleItem>();

	const __store__ = {
		addTheme(theme) {
			context.store.addTheme(theme);
		},
		getThemes: () => context.store.getThemes(),

		addLocalCss(styles) {
			trackingStyles.add({
				type: STYLE_TYPE.LOCAL,
				styles,
			});
		},
		addThemedCss(themeRef, styles) {
			trackingStyles.add({
				type: STYLE_TYPE.THEME,
				themeRef,
				styles,
			});
		},

		getIdentName(localName, scopeId, theme) {
			return typeof theme === 'undefined'
				? processIdent(context.options.localIdentName, context.id)(
					localName,
					scopeId,
					theme,
				)
				: processIdent(context.options.themeIdentName, context.id)(
					localName,
					scopeId,
					theme,
				);
		},
	};

	let result;
	try {
		result = eval(`require('treat/adapter').setAdapter(__store__);\n${sourceCode}`,
			context.id,
			{ console, __store__ },
			true,
		);
	} catch (e) {
		throw e;
	}
	context.store.addStyleResource(context.id, trackingStyles);

	return result;
};

const processIdent = (identFn: ((theme: string) => string) | string, id: string) => {
	return (localName: string, scopeId: number, theme?: string): string => {
		const identName =
			typeof identFn === 'function' ? identFn(theme) : identFn;

		return identName
			.replace(
				/\[(?:([^:\]]+):)?(?:hash|contenthash)(?::([a-z]+\d*))?(?::(\d+))?\]/gi,
				(_all, hashType = 'md5', digestType, maxLength = 10) =>
					crypto
						.createHash(hashType)
						.update(`${id}${scopeId}`)
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
