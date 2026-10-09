import { useState } from 'react';
import { getallenlijnProps, numberLineTicks, tickLabel, type GetallenlijnProps } from '../../mathTools/getallenlijn';
import { clean } from '../../mathTools/shared';
import { useSetProps, fontScale, widgetAccent } from '../../settings/baseProps';
import type { BoardWidget } from '../../boardTypes';

// Length of the drawn axis in the 600-wide drawing (also the vertical line's height).
const W = 600, PAD = 30;
const MONO = "'Azeret Mono', monospace";

const signed = (d: number, g: GetallenlijnProps): string => {
    const t = tickLabel(Math.abs(d), g);
    return (d > 0 ? '+' : '−') + (Array.isArray(t) ? `${t[0]}/${t[1]}` : t);
};

// Number line manipulative: axis + ticks with labels, and per setting tap-to-mark, jump arcs
// ("sprongen") and blanked labels for an invul-oefening. Teachers still write on it with the pen.
export default function GetallenlijnWidget({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const g = getallenlijnProps(widget);
    const ticks = numberLineTicks(g);
    // springen: the tick the next jump starts from (chains: every landing is the next start).
    const [jumpFrom, setJumpFrom] = useState<number | null>(null);

    const vertical = g.orientation === 'verticaal';
    const span = g.max - g.min;
    const along = (v: number) => PAD + ((v - g.min) / span) * (W - 2 * PAD);
    const stepPx = (W - 2 * PAD) / Math.max(1, ticks.length - 1);
    const isFraction = g.numberType === 'breuk';
    // 14px = the label size before settings existed; the baseline Tekstgrootte multiplies it here
    // (self-scaled kind: a frame zoom would push the fixed 600px drawing out of the card).
    const fs = 14 * fontScale(widget);
    // Accentkleur inks the axis, ticks and numbers; none = the black of before.
    const ink = widgetAccent(widget) ?? '#000';
    const textInk = widgetAccent(widget) ?? '#111';
    // Room above the axis for jump arcs and their "+n" labels; none when nothing is drawn there.
    const arcRoom = g.jumps.length || g.tapMode === 'springen' ? 64 : 0;
    const axis = 34 + arcRoom;
    const labelGap = 16 + fs;
    const H = vertical ? W : axis + labelGap + (isFraction ? fs * 1.6 : 0) + 14;
    const SVG_W = W;
    // Horizontal: s runs left→right on y = axis. Vertical: bottom→top, a little left of centre
    // (jump arcs bulge left, labels sit right).
    const ax = vertical ? 280 : 0;
    const pt = (s: number, off = 0): [number, number] => (vertical ? [ax + off, W - s] : [s, axis + off]);

    const showLabel = (i: number) =>
        g.labels === 'alles' ? i % g.labelEvery === 0 || i === ticks.length - 1
            : g.labels === 'uiteinden' && (i === 0 || i === ticks.length - 1);
    const major = (i: number) => g.labelEvery > 1 && i % g.labelEvery === 0;

    const onTick = (v: number) => {
        if (g.tapMode === 'markeren') {
            const has = g.markers.some(m => m.value === v);
            set({ markers: has ? g.markers.filter(m => m.value !== v) : [...g.markers, { value: v, color: g.inkColor }] });
        } else if (g.tapMode === 'verbergen') {
            set({ hidden: g.hidden.includes(v) ? g.hidden.filter(h => h !== v) : [...g.hidden, v] });
        } else if (g.tapMode === 'springen') {
            if (jumpFrom === null || jumpFrom === v) { setJumpFrom(jumpFrom === v ? null : v); return; }
            set({ jumps: [...g.jumps, { from: jumpFrom, to: v, color: g.inkColor }] });
            setJumpFrom(v);
        }
    };

    const [x1, y1] = pt(PAD - 14);
    const [x2, y2] = pt(W - PAD + 14);
    const arrow = (s: number, dir: 1 | -1) => {
        // Triangle tip at s, pointing along the axis direction.
        const [tx, ty] = pt(s);
        const [bx1, by1] = pt(s - dir * 9, -6);
        const [bx2, by2] = pt(s - dir * 9, 6);
        return <polygon points={`${tx},${ty} ${bx1},${by1} ${bx2},${by2}`} fill={ink} />;
    };

    const label = (v: number, i: number) => {
        const [lx, ly] = pt(along(v), vertical ? 18 : 0);
        const text = tickLabel(v, g);
        const anchor = vertical ? 'start' : 'middle';
        if (g.hidden.includes(v)) {
            const bw = Math.max(28, fs * 2.4), bh = fs * (isFraction ? 2.6 : 1.5);
            const bx = vertical ? lx : lx - bw / 2, by = vertical ? ly - bh / 2 : ly + 14;
            return <rect key={`h${i}`} x={bx} y={by} width={bw} height={bh} rx={4} fill="none" stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="4 3" data-hidden-label />;
        }
        if (Array.isArray(text)) {
            const cy = vertical ? ly : ly + 16 + fs * 0.9;
            return (
                <g key={`l${i}`} fontFamily={MONO} fontSize={fs} fill={textInk} textAnchor={anchor}>
                    <text x={lx + (vertical ? 4 : 0)} y={cy - 4}>{text[0]}</text>
                    <line x1={lx - (vertical ? -2 : fs * 0.6)} x2={lx + (vertical ? fs * 1.4 : fs * 0.6)} y1={cy} y2={cy} stroke={textInk} strokeWidth={1.4} />
                    <text x={lx + (vertical ? 4 : 0)} y={cy + fs}>{text[1]}</text>
                </g>
            );
        }
        return (
            <text key={`l${i}`} x={lx} y={vertical ? ly + fs * 0.35 : ly + 30 - 14 + fs} textAnchor={anchor} fontFamily={MONO} fontSize={fs} fill={textInk}>
                {text}
            </text>
        );
    };

    const jumpArc = (j: { from: number; to: number; color: string }, k: number) => {
        const s1 = along(j.from), s2 = along(j.to);
        const h = Math.min(arcRoom - 22, 16 + Math.abs(s2 - s1) * 0.35);
        const [ax1, ay1] = pt(s1, -6);
        const [ax2, ay2] = pt(s2, -6);
        // The control point sits "above" the axis: up when horizontal, left when vertical.
        const [cx, cy] = vertical ? [ax - 6 - h * 2, (ay1 + ay2) / 2] : [(ax1 + ax2) / 2, axis - 6 - h * 2];
        const [lx, ly] = vertical ? [ax - 10 - h, (ay1 + ay2) / 2] : [(ax1 + ax2) / 2, axis - 10 - h];
        return (
            <g key={`j${k}`} data-jump>
                <path d={`M ${ax1} ${ay1} Q ${cx} ${cy} ${ax2} ${ay2}`} fill="none" stroke={j.color} strokeWidth={2.5} markerEnd={`url(#gl-arrow-${widget.id}-${k})`} />
                <defs>
                    <marker id={`gl-arrow-${widget.id}-${k}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill={j.color} />
                    </marker>
                </defs>
                <text x={lx} y={ly} textAnchor={vertical ? 'end' : 'middle'} fontFamily={MONO} fontWeight={700} fontSize={fs} fill={j.color}>
                    {signed(clean(j.to - j.from), g)}
                </text>
            </g>
        );
    };

    const interactive = g.tapMode !== 'geen';
    return (
        <div style={{ padding: '10px 8px' }}>
            <svg width={SVG_W} height={H} viewBox={`0 0 ${SVG_W} ${H}`} style={{ display: 'block' }}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={ink} strokeWidth="2" />
                {g.arrows !== 'geen' && arrow(W - PAD + 14, 1)}
                {g.arrows === 'beide' && arrow(PAD - 14, -1)}
                {ticks.map((v, i) => {
                    const t = major(i) ? 12 : g.labelEvery > 1 ? 6 : 9;
                    const [tx1, ty1] = pt(along(v), -t);
                    const [tx2, ty2] = pt(along(v), t);
                    return (
                        <g key={i}>
                            <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke={ink} strokeWidth="2" />
                            {showLabel(i) && label(v, i)}
                        </g>
                    );
                })}
                {g.jumps.map(jumpArc)}
                {g.markers.map((m, k) => {
                    const [mx, my] = pt(along(m.value));
                    return <circle key={`m${k}`} cx={mx} cy={my} r={8} fill={m.color} stroke="#fff" strokeWidth={2} data-marker />;
                })}
                {jumpFrom !== null && g.tapMode === 'springen' && (() => {
                    const [fx, fy] = pt(along(jumpFrom));
                    return <circle cx={fx} cy={fy} r={12} fill="none" stroke={g.inkColor} strokeWidth={2.5} strokeDasharray="4 3" />;
                })()}
                {interactive && ticks.map((v, i) => {
                    // One transparent hit band per tick: no client→SVG coordinate maths under the CSS zoom.
                    const s = along(v);
                    const [hx, hy] = vertical ? [ax - 120, W - s - stepPx / 2] : [s - stepPx / 2, 0];
                    return (
                        <rect key={`hit${i}`} x={hx} y={hy} width={vertical ? 240 : stepPx} height={vertical ? stepPx : H}
                            fill="transparent" style={{ cursor: 'pointer' }} data-tick={clean(v)}
                            onPointerDown={(e) => e.stopPropagation()} onClick={() => onTick(clean(v))} />
                    );
                })}
            </svg>
        </div>
    );
}
