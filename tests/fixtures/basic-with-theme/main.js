import { myTheme } from './theme.treat';

import * as styleRefs from './main.treat';

import { resolveStyles } from 'treat';

console.log(
	resolveStyles(myTheme, styleRefs),
);
