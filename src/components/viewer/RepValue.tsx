import type { Fraction } from '../../services/math/types';
import VerticalFraction from './VerticalFraction';
import { asFraction, repText, type RepKind } from '../../services/vergelijken/representations';

const mono = "'Azeret Mono', monospace";

// One value rendered in a chosen representation (breuk / kommagetal / plaatswaarde / woorden).
// `frac` overrides the breuk rendering with an explicit fraction (teller/noemer getalopbouw).
export default function RepValue({ value, rep, color, frac }: { value: number; rep: RepKind; color?: string; frac?: Fraction }) {
    if (rep === 'breuk') {
        return <VerticalFraction value={frac ?? asFraction(value)} color={color} fontSize={15} mono />;
    }
    return <span style={{ fontFamily: mono, color: color ?? 'inherit' }}>{repText(value, rep)}</span>;
}
