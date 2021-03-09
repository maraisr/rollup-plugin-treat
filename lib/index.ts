import type { FilterPattern } from '@rollup/pluginutils';
import { createFilter, dataToEsm } from '@rollup/pluginutils';
import crypto from 'crypto';
import eval from 'eval';
import path from 'path';
import { TransformResult } from 'rollup';
import type { Plugin } from 'rollup';
import { Adapter } from 'treat/dist/declarations/src/types';
import type { StoreType, StyleItem } from './store';
import { store, STYLE_TYPE } from './store';
import { childCompile, d } from './util';
import {walk} from 'astray';

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
	d('version %s', version);
	d('environment %s', isProduction ? 'production' : 'development');

	const options = defaultOptions(passedOptions);
	const shouldProcessAsTreat = createFilter(options.include, options.exclude);

	const treatStore = store();

	const treats = new Map,
		parents = new Map;

	return {
		name: 'TreatPlugin',

		async resolveId( importee, importer) {
			// TODO: Use shouldProcessAsTreat here
			if (/\.treat/.test(importee)) {
				let entry = parents.get(importer) || { ref: null, order: new Set };
				let absolute = await this.resolve(importee, importer, {skipSelf: true});
				if (absolute) entry.order.add(absolute);
				parents.set(importer, entry);
				debugger;
			}

			return null;
		},

		async transform(_code: string, id) {
			if (shouldProcessAsTreat(id)) {

			}

			const entry = parents.get(id);
			debugger;
		},

		async generateBundle(_outputOptions, _bundle) {
			if (!options.outputCSS) return;

			let output = '';

			for await (const moduleId of this.getModuleIds()) {
				const maybeResource = treatStore.getStyleResource(
					moduleId
				);
				debugger;
			}
			/*const modules = this.getModuleIds().map((m) =>
				this.getModuleInfo(m),
			);*/

			debugger;

			/*for (const module of modules) {
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
			});*/
		},
	};
};

const processTreatFile = (
	sourceCode: string,
	context: { id: string; options: Options; store: StoreType },
) => {
	const trackingStyles = new Set<StyleItem>();

	const __store__:Adapter = {
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
	debugger;
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
