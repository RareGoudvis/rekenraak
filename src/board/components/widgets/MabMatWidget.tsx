import { useEffect, useRef, useState } from 'react';
import { Plus, Minus, ArrowFatLineLeft, ArrowFatLineRight } from '@phosphor-icons/react';
import { MabPlaceColumn, type MabPlace } from '../../../components/viewer/MabBlocksSVG';
import { formatMathNumber } from '../../../services/math/formatters';
import { useSetProps, fontScale, widgetAccent } from '../../settings/baseProps';
import { mabmatProps, wisselUp, wisselDown, expandedForm, MAB_KEYS, MAB_LABEL, MAB_VALUE, MAB_MAX, type MabKey } from '../../mathTools/mabmat';
import type { BoardWidget } from '../../boardTypes';

const PLACE: Record<MabKey, MabPlace> = { d: 'thousands', h: 'hundreds', t: 'tens', e: 'units' };
const MONO = "'Azeret Mono', monospace";
// How long the "wissel" pulse plays on the columns that changed.
const FLASH_MS = 700;

// Loose MAB manipulative: build any number by adding/removing Dienes blocks per place, and
// exchange ten of a place for one of the next (inwisselen) or back (ontbinden).
export default function MabMatWidget({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const p = mabmatProps(widget);
    // Self-scaled: the baseline Tekstgrootte multiplies the type sizes, never the block columns.
    const fs = (px: number) => `${px * fontScale(widget)}px`;
    // Accentkleur inks the labels, the expanded form and the total; none = the black of before.
    const ink = widgetAccent(widget) ?? '#111';
    const [flash, setFlash] = useState<MabKey[]>([]);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

    const write = (counts: Record<MabKey, number>, changed: MabKey[] = []) => {
        set(counts);
        if (!changed.length) return;
        setFlash(changed);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setFlash([]), FLASH_MS);
    };
    const bump = (key: MabKey, delta: number) => {
        const counts = { ...p.counts, [key]: Math.min(MAB_MAX, Math.max(0, p.counts[key] + delta)) };
        const i = MAB_KEYS.indexOf(key);
        const up = MAB_KEYS[i - 1];
        // Auto-wissel only when the next place is on the mat, else the blocks would vanish.
        if (p.autoWissel && delta > 0 && counts[key] >= 10 && up && p.places.includes(up)) {
            const next = wisselUp(counts, key);
            if (next) { write(next, [key, up]); return; }
        }
        write(counts);
    };
    const exchange = (key: MabKey, dir: 'up' | 'down') => {
        const next = dir === 'up' ? wisselUp(p.counts, key) : wisselDown(p.counts, key);
        const other = MAB_KEYS[MAB_KEYS.indexOf(key) + (dir === 'up' ? -1 : 1)];
        if (next) write(next, [key, other]);
    };

    const shown = p.places;
    const total = shown.reduce((s, k) => s + p.counts[k] * MAB_VALUE[k], 0);
    const btn: React.CSSProperties = {
        width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid rgba(0,0,0,0.25)', background: 'rgba(0,0,0,0.03)', color: '#111',
    };
    const canUp = (k: MabKey) => { const i = MAB_KEYS.indexOf(k); return i > 0 && shown.includes(MAB_KEYS[i - 1]) && wisselUp(p.counts, k) !== null; };
    const canDown = (k: MabKey) => { const i = MAB_KEYS.indexOf(k); return i < MAB_KEYS.length - 1 && shown.includes(MAB_KEYS[i + 1]) && wisselDown(p.counts, k) !== null; };

    return (
        <div style={{ padding: '12px 14px' }}>
            <style>{'@keyframes board-mab-wissel{0%{transform:scale(1);background:rgba(250,204,21,0)}35%{transform:scale(1.06);background:rgba(250,204,21,0.35)}100%{transform:scale(1);background:rgba(250,204,21,0)}}'}</style>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${shown.length}, 1fr)`, gap: '10px' }}>
                {shown.map(k => (
                    <div key={k} data-mab-place={k} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', borderRadius: '10px',
                        animation: flash.includes(k) ? `board-mab-wissel ${FLASH_MS}ms ease-out` : undefined,
                    }}>
                        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: fs(15), color: ink }}>{MAB_LABEL[k]}</div>
                        <div
                            data-mab-column={k}
                            onPointerDown={p.tapAdds ? (e) => e.stopPropagation() : undefined}
                            onClick={p.tapAdds ? () => bump(k, 1) : undefined}
                            style={{
                                minHeight: `${120 * p.size}px`, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                                alignSelf: 'stretch', cursor: p.tapAdds ? 'pointer' : undefined,
                                // Glyphs are em-sized, so one font-size scales every block in the column.
                                ...(p.size !== 1 ? { fontSize: `${p.size}em` } : {}),
                            }}
                        >
                            <MabPlaceColumn count={p.counts[k]} place={PLACE[k]} style={p.mabStyle}
                                fill={p.colorScheme === 'eigen' ? p.placeColors[k] : undefined} />
                        </div>
                        {p.showButtons && (
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }} onPointerDown={(e) => e.stopPropagation()}>
                                <button type="button" style={btn} aria-label={`${MAB_LABEL[k]} erbij`} onClick={() => bump(k, 1)}><Plus size={16} /></button>
                                <span style={{ fontFamily: MONO, fontSize: fs(15), minWidth: '20px', textAlign: 'center' }}>{p.counts[k]}</span>
                                <button type="button" style={btn} aria-label={`${MAB_LABEL[k]} eraf`} onClick={() => bump(k, -1)}><Minus size={16} /></button>
                            </div>
                        )}
                        {p.showWissel && (canUp(k) || canDown(k)) && (
                            <div style={{ display: 'flex', gap: '6px' }} onPointerDown={(e) => e.stopPropagation()}>
                                {canUp(k) && (
                                    <button type="button" style={{ ...btn, width: 'auto', padding: '0 8px', gap: '4px', fontSize: '12px', fontFamily: MONO }}
                                        aria-label={`10 ${MAB_LABEL[k]} inwisselen`} title="10 inwisselen voor 1 van de volgende plaats" onClick={() => exchange(k, 'up')}>
                                        <ArrowFatLineLeft size={14} />10
                                    </button>
                                )}
                                {canDown(k) && (
                                    <button type="button" style={{ ...btn, width: 'auto', padding: '0 8px', gap: '4px', fontSize: '12px', fontFamily: MONO }}
                                        aria-label={`1 ${MAB_LABEL[k]} ontbinden`} title="1 ontbinden in 10 van de vorige plaats" onClick={() => exchange(k, 'down')}>
                                        1<ArrowFatLineRight size={14} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {p.expanded !== 'geen' && (
                <div data-mab-expanded style={{ textAlign: 'center', marginTop: '10px', fontFamily: MONO, fontWeight: 600, fontSize: fs(18), color: ink }}>
                    {expandedForm(Object.fromEntries(shown.map(k => [k, p.counts[k]])) as Record<MabKey, number>, p.expanded)}
                </div>
            )}
            {p.showTotal && (
                <div style={{ textAlign: 'center', marginTop: '10px', fontFamily: MONO, fontWeight: 800, fontSize: fs(26), color: ink }}>
                    {formatMathNumber(total)}
                </div>
            )}
        </div>
    );
}
