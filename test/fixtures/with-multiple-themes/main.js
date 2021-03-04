import themeA from './themes/theme-a.treat';
import themeB from './themes/theme-b.treat';

import * as styleRefs from './main.treat';

import { resolveStyles } from 'treat';

console.log(
	resolveStyles(themeA, styleRefs),
	resolveStyles(themeB, styleRefs),
);
