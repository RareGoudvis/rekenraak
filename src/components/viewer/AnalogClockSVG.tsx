import React from 'react';

interface Props {
    hours: number;
    minutes: number;
    showHourHand: boolean;
    showMinuteHand: boolean;
    is24hour: boolean;
    size?: number;
    style?: React.CSSProperties;
}

// 13pt (the --sheet-size-math default) is 17.33 CSS px, so a figure sized `px / 17.33` em
// inside a `font-size: var(--sheet-size-math)` box reproduces today's pixels exactly and
// then follows the teacher's Lettergrootte slider. SYNC: same divisor in every viewer.
const PX_PER_EM_AT_DEFAULT = 17.33;

export default function AnalogClockSVG({ hours, minutes, showHourHand, showMinuteHand, is24hour, size = 130, style }: Props) {
    // In 24h mode the SVG canvas grows by 24px so the outer 13-24 ring fits without shrinking the clock circle.
    const svgSize = is24hour ? size + 24 : size;
    const cx = svgSize / 2;
    const cy = svgSize / 2;
    const r = size / 2 - 4; // clock circle is always the same radius
    const outerNumR = r + 10; // 13-24 labels sit just outside the circle

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const pointAt = (angleDeg: number, length: number) => ({
        x: cx + Math.sin(toRad(angleDeg)) * length,
        y: cy - Math.cos(toRad(angleDeg)) * length,
    });

    // Both 12h and 24h use the same hand angle (dual-ring 24h clock is still 12h-speed)
    const hourAngle = ((hours % 12) * 360 / 12) + (minutes * 360 / (12 * 60));
    const minuteAngle = minutes * 6;

    const hourEnd = pointAt(hourAngle, r * 0.58);
    const minuteEnd = pointAt(minuteAngle, r * 0.82);

    const hourFontSize = Math.max(9, size * 0.082);
    const smallFontSize = Math.max(6, size * 0.058);

    return (
        // `size` stays the internal viewBox geometry; only the rendered box follows the token,
        // so numerals, ticks and hand widths scale with it without any further arithmetic.
        <svg width={`${svgSize / PX_PER_EM_AT_DEFAULT}em`} height={`${svgSize / PX_PER_EM_AT_DEFAULT}em`} viewBox={`0 0 ${svgSize} ${svgSize}`} style={style}>
            <circle cx={cx} cy={cy} r={r} fill="white" stroke="#000" strokeWidth="2" />

            {is24hour ? (
                // 24h mode: same 60 minute ticks as 12h + 1-12 inside + 13-24 outside the rim
                <>
                    {Array.from({ length: 60 }, (_, i) => {
                        const angle = i * 6;
                        const isQuarter = i % 15 === 0;
                        const isHour = i % 5 === 0;
                        const outerEdge = pointAt(angle, r * 0.97);
                        const innerEdge = pointAt(angle, r * (isQuarter ? 0.82 : isHour ? 0.87 : 0.92));
                        return (
                            <line key={`tick-${i}`}
                                x1={innerEdge.x} y1={innerEdge.y}
                                x2={outerEdge.x} y2={outerEdge.y}
                                stroke="#000"
                                strokeWidth={isQuarter ? 2 : isHour ? 1.5 : 0.75}
                            />
                        );
                    })}
                    {Array.from({ length: 12 }, (_, i) => {
                        const angle = i * 30;
                        const label12 = i === 0 ? 12 : i;
                        const label24 = label12 + 12;
                        const numInner = pointAt(angle, r * 0.74);
                        const numOuter = pointAt(angle, outerNumR);
                        return (
                            <React.Fragment key={i}>
                                <text x={numInner.x} y={numInner.y} textAnchor="middle" dominantBaseline="central"
                                    fontSize={hourFontSize} fontFamily="Azeret Mono, monospace" fill="#000">
                                    {label12}
                                </text>
                                <text x={numOuter.x} y={numOuter.y} textAnchor="middle" dominantBaseline="central"
                                    fontSize={smallFontSize} fontFamily="Azeret Mono, monospace" fill="#000" fontWeight="bold">
                                    {label24}
                                </text>
                            </React.Fragment>
                        );
                    })}
                </>
            ) : (
                // 12h mode: 60 minute tick marks + 12 hour numbers
                <>
                    {Array.from({ length: 60 }, (_, i) => {
                        const angle = i * 6;
                        const isQuarter = i % 15 === 0;
                        const isHour = i % 5 === 0;
                        const outerEdge = pointAt(angle, r * 0.97);
                        const innerEdge = pointAt(angle, r * (isQuarter ? 0.82 : isHour ? 0.87 : 0.92));
                        return (
                            <line key={i}
                                x1={innerEdge.x} y1={innerEdge.y}
                                x2={outerEdge.x} y2={outerEdge.y}
                                stroke="#000"
                                strokeWidth={isQuarter ? 2 : isHour ? 1.5 : 0.75}
                            />
                        );
                    })}
                    {Array.from({ length: 12 }, (_, i) => {
                        const angle = i * 30;
                        const label = i === 0 ? 12 : i;
                        const numPos = pointAt(angle, r * 0.74);
                        return (
                            <text key={i}
                                x={numPos.x} y={numPos.y}
                                textAnchor="middle" dominantBaseline="central"
                                fontSize={hourFontSize} fontFamily="Azeret Mono, monospace" fill="#000">
                                {label}
                            </text>
                        );
                    })}
                </>
            )}

            {showHourHand && (
                <line
                    x1={cx} y1={cy} x2={hourEnd.x} y2={hourEnd.y}
                    stroke="#000" strokeWidth={Math.max(2.5, size * 0.022)} strokeLinecap="round"
                />
            )}
            {showMinuteHand && (
                <line
                    x1={cx} y1={cy} x2={minuteEnd.x} y2={minuteEnd.y}
                    stroke="#000" strokeWidth={Math.max(1.5, size * 0.015)} strokeLinecap="round"
                />
            )}
            <circle cx={cx} cy={cy} r={Math.max(2.5, size * 0.022)} fill="#000" />

        </svg>
    );
}
