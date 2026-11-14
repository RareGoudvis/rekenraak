import AnalogClockSVG from '../../../../components/viewer/AnalogClockSVG';
import './klok.css';

// The sheet's clock face (AnalogClockSVG: rim, ticks, numerals) with game-weight hands on top, so a face on a
// balloon or a mole reads at a glance. Fills its box; the skin sets the size.

// The face's viewBox geometry. SYNC: AnalogClockSVG (12-hour: canvas = size, r = size / 2 − 4).
const SIZE = 100;
const C = SIZE / 2;
const R = SIZE / 2 - 4;

const at = (deg: number, len: number) => ({ x: C + Math.sin((deg * Math.PI) / 180) * len, y: C - Math.cos((deg * Math.PI) / 180) * len });

interface Props {
    h: number;
    m: number;
    // The help: the grote wijzer and the cijfer it points at stand out.
    mark?: boolean;
}

export default function KlokFace({ h, m, mark = false }: Props) {
    const hourEnd = at((h % 12) * 30 + m / 2, R * 0.55);
    const minuteEnd = at(m * 6, R * 0.8);
    const ring = at(Math.round(m / 5) * 30, R * 0.74);
    return (
        <AnalogClockSVG hours={h} minutes={m} showHourHand={false} showMinuteHand={false} is24hour={false} size={SIZE}
            style={{ width: '100%', height: '100%' }}
            surfaceProps={{ className: `spel-klok${mark ? ' is-mark' : ''}`, role: 'img', 'aria-label': `klok op ${(h % 12) || 12}:${String(m).padStart(2, '0')}` }}>
            {mark && m % 5 === 0 && <circle className="spel-klok-ring" cx={ring.x} cy={ring.y} r={8} />}
            <line className="spel-klok-hour" x1={C} y1={C} x2={hourEnd.x} y2={hourEnd.y} />
            <line className="spel-klok-minute" x1={C} y1={C} x2={minuteEnd.x} y2={minuteEnd.y} />
            <circle className="spel-klok-pin" cx={C} cy={C} r={3.5} />
        </AnalogClockSVG>
    );
}

// A digitale klok display: the time in a dark screen.
export function DigitaalFace({ text }: { text: string }) {
    return <span className="spel-digi kiosk-math" role="img" aria-label={`digitale klok ${text}`}>{text}</span>;
}
