import { style } from 'treat';

export const themedClass = style(theme => ({
	color: theme.myColourToken,
}));

export const plainClass = style({
	color: 'pink',
});
