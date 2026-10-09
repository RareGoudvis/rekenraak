import { useEffect, useRef, useState } from 'react';
import { Shuffle, ArrowCounterClockwise } from '@phosphor-icons/react';
import { useBoardStore } from '../../useBoardStore';
import { namenProps, pickNames, namePool, useClassList, cleanNames } from '../../settings/namenModel';
import { fontScale, widgetAccent } from '../../settings/baseProps';
import type { BoardWidget } from '../../boardTypes';

// Wheel segment fills (widget ink, cycled); the accent leads when the teacher picked one.
const WHEEL = ['#1e40af', '#166534', '#9a3412', '#6b21a8', '#0f766e', '#be185d', '#374151', '#b45309'];
const SPIN_MS = 2600;

// Random name picker: flash one or more names, or spin a wheel. The class list is app-wide
// (shared with the groepjesmaker); a card can also keep its own list. Picked names are
// skipped until everyone had a turn, and the pick + who had a turn survive a reload.
export default function NamenWidget({ widget, dark }: { widget: BoardWidget; dark: boolean }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const p = namenProps(widget);
    const classList = useClassList();
    const all = cleanNames(p.source === 'eigen' ? p.names : classList);
    const fs = fontScale(widget);
    const accent = widgetAccent(widget);
    const [flash, setFlash] = useState<string | null>(null);
    const [spinning, setSpinning] = useState(false);
    const [rot, setRot] = useState(0);
    const timer = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

    const pool = namePool(all, p.picked, p.noRepeat);
    const commit = (chosen: string[], picked: string[]) =>
        updateWidget(widget.id, { props: { ...widget.props, current: chosen, picked } });

    const pick = () => {
        if (spinning || !all.length) return;
        const { chosen, picked } = pickNames(all, p.picked, p.mode === 'rad' ? 1 : p.count, p.noRepeat);
        if (p.mode === 'rad') {
            // Land the chosen segment's centre under the pointer at the top, after a few turns.
            const seg = 360 / all.length;
            const centre = (all.indexOf(chosen[0]) + 0.5) * seg;
            const target = Math.ceil(rot / 360) * 360 + (p.animate ? 360 * 4 : 0) + (360 - centre);
            setRot(target);
            if (!p.animate) { commit(chosen, picked); return; }
            setSpinning(true);
            setTimeout(() => { setSpinning(false); commit(chosen, picked); }, SPIN_MS);
            return;
        }
        if (!p.animate) { commit(chosen, picked); return; }
        // Tiny roulette: flash a few random names before settling.
        setSpinning(true);
        let ticks = 0;
        timer.current = setInterval(() => {
            setFlash(all[Math.floor(Math.random() * all.length)]);
            if (++ticks >= 8) {
                clearInterval(timer.current!);
                setFlash(null); setSpinning(false); commit(chosen, picked);
            }
        }, 70);
    };

    const restart = () => updateWidget(widget.id, { props: { ...widget.props, picked: [], current: [] } });

    const textColor = dark ? '#fff' : '#111';
    const shown = flash ? [flash] : p.current;
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '16px',
            background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(30,64,175,0.06)',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.2)' : 'rgba(30,64,175,0.25)'}`, borderRadius: '10px',
        }}>
            {p.mode === 'rad' && all.length > 0 && (
                <Wheel names={all} out={all.filter(n => !pool.includes(n))} rot={rot} animate={p.animate} accent={accent} fs={fs} />
            )}
            <div style={{
                minHeight: `${52 * fs}px`, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '4px 18px', textAlign: 'center',
                fontFamily: "'Azeret Mono', monospace", fontWeight: 700, fontSize: `${(shown.length > 1 ? 26 : 34) * fs}px`,
                color: accent && !dark ? accent : textColor,
                opacity: spinning && p.mode === 'een' ? 0.55 : 1,
            }}>
                {!all.length ? 'Voeg namen toe via ⚙' : spinning && p.mode === 'rad' ? '…' : shown.length ? shown.map((n, i) => <span key={i}>{n}</span>) : '…'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
                <button
                    type="button" className="ui-hover" onPointerDown={(e) => e.stopPropagation()} onClick={pick} disabled={spinning}
                    style={btn}>
                    <Shuffle size={18} /> {p.mode === 'rad' ? 'Draai het rad' : p.count > 1 ? `Kies ${p.count} namen` : 'Kies een naam'}
                </button>
                {p.noRepeat && p.picked.length > 0 && (
                    <button type="button" className="ui-hover" onPointerDown={(e) => e.stopPropagation()} onClick={restart} style={{ ...btn, borderColor: 'var(--separator)', background: 'transparent' }}>
                        <ArrowCounterClockwise size={18} /> Opnieuw
                    </button>
                )}
            </div>
            {p.showPicked && p.picked.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }} aria-label="Al gekozen">
                    {p.picked.map((n, i) => (
                        <span key={i} style={{ fontFamily: "'Azeret Mono', monospace", fontSize: `${13 * fs}px`, color: textColor, opacity: 0.6, textDecoration: 'line-through' }}>{n}</span>
                    ))}
                </div>
            )}
        </div>
    );
}

// The wheel keeps every name (stable segments); names that already had a turn are dimmed.
function Wheel({ names, out, rot, animate, accent, fs }: { names: string[]; out: string[]; rot: number; animate: boolean; accent: string | null; fs: number }) {
    const R = 120, n = names.length, seg = 360 / n;
    const colors = accent ? [accent, ...WHEEL.filter(c => c !== accent)] : WHEEL;
    const pt = (deg: number, r: number) => [R + r * Math.sin(deg * Math.PI / 180), R - r * Math.cos(deg * Math.PI / 180)];
    return (
        <div style={{ position: 'relative', width: `${2 * R * fs}px`, height: `${2 * R * fs}px` }} data-namen-wheel>
            <svg viewBox={`0 0 ${2 * R} ${2 * R}`} width="100%" height="100%"
                style={{ transform: `rotate(${rot}deg)`, transition: animate ? `transform ${SPIN_MS}ms cubic-bezier(.17,.67,.21,1)` : 'none' }}>
                {names.map((name, i) => {
                    const a0 = i * seg, a1 = (i + 1) * seg, mid = a0 + seg / 2;
                    const [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R), [tx, ty] = pt(mid, R * 0.62);
                    const d = n === 1 ? `M ${R} 0 A ${R} ${R} 0 1 1 ${R - 0.01} 0 Z` : `M ${R} ${R} L ${x0} ${y0} A ${R} ${R} 0 ${seg > 180 ? 1 : 0} 1 ${x1} ${y1} Z`;
                    return (
                        <g key={i}>
                            <path d={d} fill={colors[i % colors.length]} fillOpacity={out.includes(name) ? 0.25 : 1} stroke="#fff" strokeWidth={1.5} />
                            <text x={tx} y={ty} fill="#fff" fontSize={Math.max(7, Math.min(16, 220 / n))} fontFamily="Azeret Mono, monospace" fontWeight={700}
                                textAnchor="middle" dominantBaseline="central" transform={`rotate(${mid > 180 ? mid + 90 : mid - 90} ${tx} ${ty})`}>
                                {name.length > 12 ? `${name.slice(0, 11)}…` : name}
                            </text>
                        </g>
                    );
                })}
                <circle cx={R} cy={R} r={10} fill="#fff" stroke="#111" strokeWidth={2} />
            </svg>
            {/* Fixed pointer at the top: the segment under it is the pick. */}
            <svg viewBox="0 0 20 20" width={22 * fs} height={22 * fs} style={{ position: 'absolute', left: '50%', top: -6 * fs, transform: 'translateX(-50%)' }}>
                <path d="M 2 2 L 18 2 L 10 18 Z" fill="#111" />
            </svg>
        </div>
    );
}

const btn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '8px', height: '44px', padding: '0 18px',
    borderRadius: '10px', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--accent-purple)', background: 'var(--bg-active)',
    color: 'var(--text-main)', fontSize: '14px', cursor: 'pointer', fontFamily: "'Azeret Mono', monospace", whiteSpace: 'nowrap',
};
