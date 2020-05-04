import type { ThemeOrAny } from 'treat/theme';
import type { ThemeRef, TreatTheme } from 'treat/lib/types/types';
import { d } from './util';

export const enum STYLE_TYPE {
	LOCAL = 'local',
	THEME = 'theme',
}

export type StyleItem =
	| { type: STYLE_TYPE.LOCAL; styles: object }
	| { type: STYLE_TYPE.THEME; styles: object; themeRef: ThemeRef };

export const store = () => {
	const themes = new Map<string, { theme: TreatTheme<ThemeOrAny> }>();
	const styleResources = new Map<string, Array<StyleItem>>();

	const getThemes = (): Array<TreatTheme<ThemeOrAny>> => {
		return Array.from(themes.values()).map(({ theme }) => theme);
	};

	const addTheme = (theme: TreatTheme<ThemeOrAny>) => {
		if (!themes.has(theme.themeRef))
			d('discovered theme %s', theme.themeRef);

		themes.set(theme.themeRef, {
			theme,
		});
	};

	const addStyleResource = (id: string, styleItems: Set<StyleItem>) => {
		const currentResource = styleResources.get(id) ?? [];

		styleResources.set(
			id,
			[...currentResource, ...styleItems].sort((a, b) => {
				if (a.type === b.type) {
					return 0;
				} else if (a.type === STYLE_TYPE.LOCAL) {
					return -1;
				} else {
					return 1;
				}
			}),
		);
	};

	const getStyleResource = (id: string) => styleResources.get(id);

	return {
		getThemes,
		addTheme,
		addStyleResource,
		getStyleResource,
	};
};
export type StoreType = ReturnType<typeof store>;
