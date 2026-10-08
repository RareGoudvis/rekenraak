import type { ClockExercise } from '../../services/math/types';
import { formatTimeText } from '../../services/clock/clockTypes';
import { klokDragHands, klokFace, klokHourTo, klokMinuteTo, klokStep, type KlokHand } from '../../services/clock/clockDrag';
import AnalogClockSVG from './AnalogClockSVG';
import type { ViewerInteraction } from './ViewerInteractionContext';
import { clockAngle, dragHandleProps, dragSurfaceProps, dragValuesOf } from './kioskDrag';

interface Props {
    ex: ClockExercise;
    c: Record<string, unknown>;
    ctx: ViewerInteraction;
    is24hour: boolean;
    size: number;
}

// Fractions of the face radius. SYNC: AnalogClockSVG r = size / 2 − 4, hourEnd 0.58, minuteEnd 0.82.
// Where the knobs sit: the hour knob on its hand's tip (inside the numerals at 0.74), the
// minute knob just past its tip on the minute ticks, so it never covers the numeral aimed at.
const KNOB_AT: Record<KlokHand, number> = { h: 0.58, m: 0.92 };
const HAND_NAME: Record<KlokHand, string> = { h: 'kleine wijzer (uren)', m: 'grote wijzer (minuten)' };

const INNER_RING = (KNOB_AT.h + KNOB_AT.m) / 2;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** The kiosk's analoge klok for "zet de wijzers": the pupil drags the hands they would draw on paper. */
export default function ClockDragFace({ ex, c, ctx, is24hour, size }: Props) {
    const drag = dragValuesOf(ctx);
    const hands = klokDragHands(ex, c);
    const { h, m } = klokFace(ex, c, drag);
    const svgSize = is24hour ? size + 24 : size;
    const cx = svgSize / 2, cy = svgSize / 2, r = size / 2 - 4;
    // Only the minute hand set: the printed kleine wijzer stays where the exercise's time puts it.
    const hourAngle = hands.includes('h') ? h * 30 + m / 2 : (ex.hours % 12) * 30 + ex.minutes / 2;
    const angleOf: Record<KlokHand, number> = { h: hourAngle, m: m * 6 };

    const surface = dragSurfaceProps(ctx, {
        width: svgSize, height: svgSize,
        // Both hands: the inner ring (up to midway between the knobs) is the kleine wijzer, the
        // rim the grote one. A ring, not the nearest hand: a hand not placed yet has no spot to be
        // near, and a press where the other hand happens to lie must still place this one.
        pick: (p) => (hands.length === 1 ? hands[0] : Math.hypot(p.x - cx, p.y - cy) < r * INNER_RING ? 'h' : 'm'),
        move: (key, p, from) => (key === 'h' ? klokHourTo : klokMinuteTo)(ex, c, from, clockAngle(p, cx, cy)),
    });

    return (
        // A hand the pupil sets is not drawn until placed (like the empty face on paper); its knob
        // waits hollow at 12 meanwhile, so no starting position looks like an answer.
        <AnalogClockSVG hours={h} minutes={m} hourAngleDeg={hourAngle} is24hour={is24hour} size={size}
            showHourHand={!hands.includes('h') || drag.h !== undefined} showMinuteHand={!hands.includes('m') || drag.m !== undefined}
            surfaceProps={surface}>
            {hands.map(k => {
                const len = r * KNOB_AT[k];
                const placed = drag[k] !== undefined;
                const x = cx + Math.sin(rad(angleOf[k])) * len, y = cy - Math.cos(rad(angleOf[k])) * len;
                return (
                    <g key={k} {...dragHandleProps(ctx, k, {
                        label: HAND_NAME[k], valueText: formatTimeText(h === 0 ? 12 : h, m, false),
                        value: k === 'h' ? h : m, min: 0, max: k === 'h' ? 11 : 59,
                        step: (dir, from) => klokStep(ex, c, from, k, dir),
                    })}>
                        {/* The knob marks what can be dragged; the whole face takes the press (kioskDrag pick). */}
                        <circle cx={x} cy={y} r={k === 'm' ? 4.5 : 5.5} className={`kiosk-knob is-${k}${placed ? '' : ' is-unset'}`} />
                    </g>
                );
            })}
        </AnalogClockSVG>
    );
}
