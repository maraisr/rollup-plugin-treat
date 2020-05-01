import * as styleRefs from './main.treat';
import { myTheme } from './theme.treat';

import { resolveStyles } from 'treat';

console.log(
	resolveStyles(myTheme, styleRefs),
);
