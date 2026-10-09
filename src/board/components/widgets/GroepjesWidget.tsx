import { useEffect, useRef, useState } from 'react';
import { Shuffle, Warning, LockSimple, LockSimpleOpen } from '@phosphor-icons/react';
import { useBoardStore } from '../../useBoardStore';
import { makeGroups } from '../../widgetSizing';
import { groepjesModel, dealGroups, groupLabel, GROUP_COLORS } from '../../settings/groepjesModel';
import { useClassList, cleanNames } from '../../settings/namenModel';
import { fontScale, widgetAccent } from '../../settings/baseProps';
import type { BoardWidget } from '../../boardTypes';

// Group maker: deals the class list (shared with the namenkiezer) or the card's own list into
// groups, honouring must-together / cannot-together rules; groups can be locked before a
// re-deal and the result survives a reload.
export default function GroepjesWidget({ widget }: { widget: BoardWidget }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const m = groepjesModel(widget);
    const classList = useClassList();
    const names = cleanNames(m.source === 'eigen' ? m.names : classList);
    const fs = fontScale(widget);
    const accent = widgetAccent(widget);
    const [preview, setPreview] = useState<string[][] | null>(null);
    const [ok, setOk] = useState(true);
    const timer = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

    const save = (patch: Record<string, unknown>) => updateWidget(widget.id, { props: { ...widget.props, ...patch } });

    const make = () => {
        if (names.length < 2) return;
        const final = dealGroups(names, m);
        const commit = () => { setPreview(null); setOk(final.ok); save({ result: final.groups, locked: final.locked }); };
        if (!m.animate) { commit(); return; }
        // A few quick rule-free deals flash by before the real one lands.
        let ticks = 0;
        timer.current = setInterval(() => {
            setPreview(makeGroups(names, { ...m, mustTogether: '', cannotTogether: '' }).groups);
            if (++ticks >= 6) { clearInterval(timer.current!); commit(); }
        }, 90);
    };

    const toggleLock = (i: number) => save({ locked: m.locked.includes(i) ? m.locked.filter(x => x !== i) : [...m.locked, i] });

    const groups = preview ?? m.result;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px' }}>
            {names.length < 2 && (
                <div style={{ textAlign: 'center', fontFamily: "'Azeret Mono', monospace", fontSize: `${14 * fs}px`, color: '#444' }}>Voeg namen toe via ⚙</div>
            )}
            {groups && (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${120 * fs}px, 1fr))`, gap: '10px', opacity: preview ? 0.6 : 1 }}>
                    {groups.map((g, i) => {
                        const c = m.colored ? GROUP_COLORS[i % GROUP_COLORS.length] : (accent ?? GROUP_COLORS[0]);
                        const locked = !preview && m.locked.includes(i);
                        const label = groupLabel(m, i);
                        return (
                            <div key={i} style={{
                                position: 'relative', borderRadius: '10px', padding: '8px 10px', fontFamily: "'Azeret Mono', monospace",
                                border: `${locked ? 2 : 1}px solid color-mix(in srgb, ${c} ${locked ? 70 : 30}%, transparent)`,
                                background: `color-mix(in srgb, ${c} ${m.colored ? 12 : 6}%, transparent)`,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', minHeight: '22px' }}>
                                    {label && <span style={{ fontWeight: 700, fontSize: `${13 * fs}px`, color: c, flex: 1 }}>{label}</span>}
                                    {!preview && (
                                        <button type="button" aria-pressed={locked} aria-label={`${label || `Groep ${i + 1}`} ${locked ? 'ontgrendelen' : 'vastzetten'}`}
                                            title={locked ? 'Vast: blijft bij opnieuw verdelen' : 'Vastzetten'}
                                            onPointerDown={(e) => e.stopPropagation()} onClick={() => toggleLock(i)}
                                            style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px', color: locked ? c : 'rgba(0,0,0,0.35)', display: 'inline-flex' }}>
                                            {locked ? <LockSimple size={16 * fs} weight="fill" /> : <LockSimpleOpen size={16 * fs} />}
                                        </button>
                                    )}
                                </div>
                                {g.map(n => <div key={n} style={{ fontSize: `${14 * fs}px`, color: '#111' }}>{n}</div>)}
                            </div>
                        );
                    })}
                </div>
            )}
            {!ok && !preview && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b45309', fontSize: '12px', fontFamily: "'Azeret Mono', monospace" }}>
                    <Warning size={16} /> Niet alle regels konden gevolgd worden.
                </div>
            )}
            <button
                type="button" className="ui-hover" onPointerDown={(e) => e.stopPropagation()} onClick={make} disabled={!!preview}
                style={{
                    alignSelf: 'center', display: 'inline-flex', alignItems: 'center', gap: '8px',
                    height: '44px', padding: '0 20px', borderRadius: '10px', cursor: 'pointer',
                    border: '1px solid var(--accent-purple)', background: 'var(--bg-active)',
                    color: 'var(--text-main)', fontSize: '14px', fontFamily: "'Azeret Mono', monospace",
                }}>
                <Shuffle size={18} /> {m.result ? 'Opnieuw verdelen' : 'Maak groepen'}
            </button>
        </div>
    );
}
