import type { CSSProperties } from 'react';
import { formatMathNumber } from '../../services/math/formatters';

// A thousands-grouped number ("9 029") must never break at its group space: formatMathNumber
// joins the groups with a plain space, which is a legal line break. Viewers print a number
// that sits in wrappable text through this span; the text itself stays byte-identical.
export default function NumberText({ value, style }: { value: number | string; style?: CSSProperties }) {
    return <span style={{ whiteSpace: 'nowrap', ...style }}>{typeof value === 'number' ? formatMathNumber(value) : value}</span>;
}
