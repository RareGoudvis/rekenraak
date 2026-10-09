import { Fragment } from 'react';
import type { FaceStyle } from '../../settings/klokModel';

interface Props {
    hours: number;
    minutes: number;
    seconds: number | null;    // null = no seconds hand
    showHourHand: boolean;
    showMinuteHand: boolean;
    ring24: boolean;
    minuteNumbers: boolean;
    faceStyle: FaceStyle;
    size: number;
    accent: string | null;
}

// SYNC: 'klassiek' at the default options draws AnalogClockSVG's geometry exactly (radius,
// ticks, numerals, hands, em sizing), so a board klok made before the face options looks
// the same; the board draws its own face to add styles, rings and a seconds hand without
// touching the sheet's clock.
const PX_PER_EM_AT_DEFAULT = 17.33;

// Classroom clock ink: blue kleine wijzer + red grote wijzer is the usual leerklok colouring.
const INK = '#000';
const BLUE = '#1e40af';
const RED = '#dc2626';
const KID_FACE = '#fef9c3';
const KID_RIM = '#ea580c';
const KID_DOTS = ['#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0f766e', '#1d4ed8', '#7c3aed', '#be185d', '#dc2626', '#ea580c', '#16a34a', '#1d4ed8'];

export default function BoardClockFace({ hours, minutes, seconds, showHourHand, showMinuteHand, ring24, minuteNumbers, faceStyle, size, accent }: Props) {
    // Two-digit minute labels need a little more room than the sheet's 13-24 ring.
    const svgSize = size + (minuteNumbers ? 30 : ring24 ? 24 : 0);
    const cx = svgSize / 2, cy = svgSize / 2;
    const r = size / 2 - 4;
    const outerNumR = r + 10;
    const kid = faceStyle === 'kinder', color = faceStyle === 'kleur';
    const rim = accent ?? (kid ? KID_RIM : color ? BLUE : INK);

    const pt = (deg: number, len: number) => ({ x: cx + Math.sin(deg * Math.PI / 180) * len, y: cy - Math.cos(deg * Math.PI / 180) * len });
    const hourAngle = ((hours % 12) * 30) + minutes * 0.5;
    const hourEnd = pt(hourAngle, r * (kid ? 0.5 : 0.58));
    const minuteEnd = pt(minutes * 6 + (seconds ?? 0) * 0.1, r * (kid ? 0.78 : 0.82));
    const hourFont = Math.max(9, size * (kid ? 0.11 : 0.082));
    const smallFont = Math.max(6, size * 0.058);
    // With both rings on, the minutes take the outside and 13-24 move inside the 1-12.
    const ring24R = minuteNumbers ? r * 0.5 : outerNumR;
    const hourColor = (i: number) => (kid ? KID_DOTS[i] : color ? BLUE : INK);

    return (
        <svg width={`${svgSize / PX_PER_EM_AT_DEFAULT}em`} height={`${svgSize / PX_PER_EM_AT_DEFAULT}em`} viewBox={`0 0 ${svgSize} ${svgSize}`} data-face-style={faceStyle}>
            <circle cx={cx} cy={cy} r={r} fill={kid ? KID_FACE : 'white'} stroke={rim} strokeWidth={kid ? 6 : color ? 3 : 2} />
            {Array.from({ length: 60 }, (_, i) => {
                const isQuarter = i % 15 === 0, isHour = i % 5 === 0;
                if (kid && isHour) {
                    const c = pt(i * 6, r * 0.9);
                    return <circle key={i} cx={c.x} cy={c.y} r={isQuarter ? 5 : 3.5} fill={KID_DOTS[i / 5]} />;
                }
                const o = pt(i * 6, r * 0.97), n = pt(i * 6, r * (isQuarter ? 0.82 : isHour ? 0.87 : 0.92));
                return <line key={i} x1={n.x} y1={n.y} x2={o.x} y2={o.y} stroke={color && !isHour ? RED : INK} strokeWidth={isQuarter ? 2 : isHour ? 1.5 : 0.75} />;
            })}
            {Array.from({ length: 12 }, (_, i) => {
                const label = i === 0 ? 12 : i;
                const p = pt(i * 30, r * (kid ? 0.7 : 0.74));
                const p24 = pt(i * 30, ring24R);
                const pm = pt(i * 30, outerNumR);
                return (
                    <Fragment key={i}>
                        <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={hourFont} fontFamily="Azeret Mono, monospace"
                            fontWeight={kid ? 800 : undefined} fill={hourColor(i)}>{label}</text>
                        {ring24 && (
                            <text x={p24.x} y={p24.y} textAnchor="middle" dominantBaseline="central" fontSize={smallFont} fontFamily="Azeret Mono, monospace" fill={INK} fontWeight="bold">
                                {label + 12}
                            </text>
                        )}
                        {minuteNumbers && (
                            <text x={pm.x} y={pm.y} textAnchor="middle" dominantBaseline="central" fontSize={smallFont} fontFamily="Azeret Mono, monospace" fill={color || kid ? RED : INK}>
                                {i === 0 ? 60 : i * 5}
                            </text>
                        )}
                    </Fragment>
                );
            })}
            {showHourHand && <line x1={cx} y1={cy} x2={hourEnd.x} y2={hourEnd.y} stroke={color || kid ? BLUE : INK} strokeWidth={kid ? size * 0.045 : Math.max(2.5, size * 0.022)} strokeLinecap="round" />}
            {showMinuteHand && <line x1={cx} y1={cy} x2={minuteEnd.x} y2={minuteEnd.y} stroke={color || kid ? RED : INK} strokeWidth={kid ? size * 0.03 : Math.max(1.5, size * 0.015)} strokeLinecap="round" />}
            {seconds !== null && (() => {
                const tip = pt(seconds * 6, r * 0.88), tail = pt(seconds * 6 + 180, r * 0.15);
                return <line x1={tail.x} y1={tail.y} x2={tip.x} y2={tip.y} stroke={kid ? INK : RED} strokeWidth={Math.max(1, size * 0.008)} strokeLinecap="round" data-seconds-hand />;
            })()}
            <circle cx={cx} cy={cy} r={Math.max(2.5, size * (kid ? 0.04 : 0.022))} fill={kid ? rim : INK} />
        </svg>
    );
}
