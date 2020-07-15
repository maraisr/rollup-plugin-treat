# `rollup-plugin-treat`

# WIP

A [Rollup] plugin for [treat].

## Install

```shell
    yarn add rollup-plugin-treat@alpha
```

## Setup

```js
import { rollupPluginTreat } from 'rollup-plugin-treat';

export default {
	input: './myThing.js',

	plugins: [
		rollupPluginTreat({
			/* options */
		}),
	],
};
```

### Options

| name                                         | default                             |
| :------------------------------------------- | :---------------------------------- |
| include?: FilterPattern;                     | /\\.treat\\.(ts&#124;js)\$/         |
| exclude?: FilterPattern;                     | undefined                           |
| localIdentName: string;                      | as per treat docs                   |
| themeIdentName: (() => string)               | default: as per treat docs          |
| outputCSS: boolean                           | true &#124; (string means filename) |
| onCSSOutput(source: string): Promise<string> | optional hook                       |
| minify: boolean;                             | isProduction                        |
| browsers: Array<string>;                     | []                                  |

## Outstanding

-   [ ] unused treat modules
-   [ ] allow for code-split generated css
-   [ ] ... stuff as I start using it

[rollup]: https://github.com/rollup/rollup
[treat]: https://github.com/seek-oss/treat
