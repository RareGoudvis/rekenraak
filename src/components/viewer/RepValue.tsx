import type { Fraction } from '../../services/math/types';
import VerticalFraction from './VerticalFraction';
import { asFraction, repText, type RepKind } from '../../services/vergelijken/representations';

const mono = "'Azeret Mono', monospace";

// One value rendered in a chosen representation (breuk / kommagetal / plaatswaarde / woorden).
// `frac` overrides the breuk rendering with an explicit fraction (teller/noemer getalopbouw).
// `fit` shrinks a code-like text (plaatswaarde 1H2T7E5t, kommagetal) in em so it never runs out of a narrow cell.
export default function RepValue({ value, rep, color, frac, fit = 1 }: { value: number; rep: RepKind; color?: string; frac?: Fraction; fit?: number }) {
    if (rep === 'breuk') {
        return <VerticalFraction value={frac ?? asFraction(value)} color={color} fontSize={15} mono />;
    }
    // 'woorden' is a sentence and wraps; every other text is one unbreakable code.
    const code = rep !== 'woorden';
    return <span style={{ fontFamily: mono, color: color ?? 'inherit', ...(code ? { whiteSpace: 'nowrap', fontSize: fit < 1 ? `${fit}em` : undefined } : {}) }}>{repText(value, rep)}</span>;
}
