import { MoneyFigure } from '../../../../components/viewer/GeldViewer';
import { formatSpelNumber } from '../../spelFormat';
import './beeld.css';

// The pictures a game question reads off (owner 2026-11-18): the coins and notes to count, a thermometer to read and a
// getallenlijn with one tick to name. The answer is a number the pupil types or taps; the pictures only ask.

/** The coins and notes of a Geld tellen exercise, as the sheet and the kiosk draw them (largest first). */
export function SpelGeld({ coins }: { coins: readonly number[] }) {
    return (
        <span className="spel-geld" role="img" aria-label={`geld: ${coins.length} munten en biljetten`}>
            {coins.map((c, i) => <MoneyFigure key={i} valueCents={c} />)}
        </span>
    );
}

// The thermometer's geometry in viewBox units: one degree = DEG, a big tick and its number every 5 degrees.
const DEG = 11;
const BULB = 17;
const TUBE = 15;

/** A thermometer lying down (it reads like a getallenlijn on a wide sign): the mercury up to t, min … max in degrees. */
export function SpelThermo({ t, min, max }: { t: number; min: number; max: number }) {
    const x0 = BULB * 2 + 6;
    const x = (deg: number) => x0 + (deg - min) * DEG;
    const w = x(max) + 14;
    const cy = BULB + 4;
    const ticks = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    return (
        <svg className="spel-thermo" viewBox={`0 0 ${w} ${cy + BULB + 32}`} role="img" aria-label={`thermometer op ${String(t).replace('-', 'min ')} graden`}>
            <rect className="spel-thermo-glass" x={BULB} y={cy - TUBE / 2} width={w - BULB - 4} height={TUBE} rx={TUBE / 2} />
            <circle className="spel-thermo-glass" cx={BULB + 2} cy={cy} r={BULB} />
            <circle className="spel-thermo-merc" cx={BULB + 2} cy={cy} r={BULB - 5} />
            <rect className="spel-thermo-merc" x={BULB + 2} y={cy - TUBE / 2 + 3} width={x(t) - BULB - 2} height={TUBE - 6} rx={(TUBE - 6) / 2} />
            {ticks.map(d => {
                const big = d % 5 === 0;
                return (
                    <g key={d}>
                        <line className="spel-thermo-tick" x1={x(d)} x2={x(d)} y1={cy + TUBE / 2 + 2} y2={cy + TUBE / 2 + (big ? 11 : 6)} strokeWidth={big ? 2 : 1.2} />
                        {big && <text className="spel-thermo-num" x={x(d)} y={cy + TUBE / 2 + 30} textAnchor="middle">{formatSpelNumber(String(d))}</text>}
                    </g>
                );
            })}
        </svg>
    );
}

/** A getallenlijn: evenly spaced ticks with their numbers, '?' the one to name; long numbers take turns above and below. */
export function SpelAs({ items }: { items: readonly string[] }) {
    const chars = Math.max(...items.map(s => s.length));
    // Room per tick for the longest number ("717 000 000"), so the numbers never touch; above and below share it.
    const stagger = chars > 5;
    const room = chars * 11 + 14;
    const step = Math.max(44, stagger ? room / 2 + 8 : room);
    const pad = Math.max(step, room) / 2;
    const w = pad * 2 + step * (items.length - 1);
    const y = stagger ? 44 : 18;
    return (
        <svg className="spel-as" viewBox={`0 0 ${w + 16} ${y + 46}`} role="img" aria-label={`getallenlijn: ${items.join(', ')}`}>
            <line className="spel-as-line" x1={4} x2={w + 8} y1={y} y2={y} />
            <path className="spel-as-arrow" d={`M ${w + 14} ${y} l -10 -6 v 12 z`} />
            {items.map((s, i) => {
                const cx = pad + i * step;
                const open = s === '?';
                const up = stagger && i % 2 === 1;
                const ty = up ? y - 18 : y + 36;
                return (
                    <g key={i}>
                        <line className="spel-as-tick" x1={cx} x2={cx} y1={y - 8} y2={y + 8} />
                        {open && <rect className="spel-as-open" x={cx - 24} y={ty - 23} width={48} height={30} rx={6} />}
                        <text className={`spel-as-num${open ? ' is-open' : ''}`} x={cx} y={ty} textAnchor="middle">{open ? '?' : s}</text>
                    </g>
                );
            })}
        </svg>
    );
}
