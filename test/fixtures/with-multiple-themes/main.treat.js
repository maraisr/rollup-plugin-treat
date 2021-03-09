import { style } from 'treat';

export const themedClass = style(theme => ({
	color: theme.colour,
}));

export const nonThemedStyle = style({color: 'orange'});
