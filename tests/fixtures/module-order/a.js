import * as styleRefs from './a.treat';

import './b';

import { resolveStyles } from 'treat';

console.log(
	resolveStyles(null, styleRefs),
);
