import { useRef, useState } from 'react';
import { LockSimple } from '@phosphor-icons/react';
import { useBoardStore } from '../../useBoardStore';
import { dobbelProps, faceKind, faceCount, faceText, inkOn, MAX_HISTORY, type DobbelModel } from '../../settings/dobbelModel';
import type { BoardWidget } from '../../boardTypes';

// Pip layout per value 1-6 on a 3×3 grid (indices row-major).
const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const DIE_PX = 92;

function Die({ m, idx, color, locked, onTap }: { m: DobbelModel; idx: number; color: string; locked: boolean; onTap?: () => void }) {
    const kind = faceKind(m);
    const ink = inkOn(color);
    const txt = faceText(m, idx);
    return (
        <div
            data-die role={onTap ? 'button' : undefined} aria-pressed={onTap ? locked : undefined}
            aria-label={onTap ? `Dobbelsteen ${txt}${locked ? ' (vast)' : ''}` : undefined}
            onClick={onTap} onPointerDown={onTap ? (e) => e.stopPropagation() : undefined}
            style={{
                position: 'relative', width: DIE_PX, height: DIE_PX, borderRadius: '16px', background: color,
                border: locked ? '4px solid var(--accent-purple)' : '2px solid #111', boxShadow: '0 3px 8px rgba(0,0,0,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: kind === 'image' ? '6px' : '10px', boxSizing: 'border-box',
                cursor: onTap ? 'pointer' : undefined, overflow: 'hidden',
            }}>
            {kind === 'image' ? (
                <img src={m.faceImages[idx % m.faceImages.length]} alt={txt} draggable={false} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            ) : kind === 'pips' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: 'repeat(3,1fr)', width: '100%', height: '100%' }}>
                    {Array.from({ length: 9 }, (_, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {PIPS[idx + 1]?.includes(i) && <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: ink }} />}
                        </div>
                    ))}
                </div>
            ) : (
                <span style={{ fontFamily: "'Azeret Mono', monospace", fontWeight: 800, fontSize: txt.length > 3 ? '18px' : '32px', textAlign: 'center', color: ink, wordBreak: 'break-word' }}>{txt}</span>
            )}
            {locked && <LockSimple size={16} weight="fill" style={{ position: 'absolute', top: 3, right: 3, color: 'var(--accent-purple)' }} />}
        </div>
    );
}

// Dice roller: pips, numbers, custom labels or pictures; per-die colour, lockable dice, sum and
// roll history. The final faces persist in props; the shuffle animation is card-local.
export default function DobbelsteenWidget({ widget }: { widget: BoardWidget }) {
    const m = dobbelProps(widget);
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const n = faceCount(m);
    const settled = Array.from({ length: m.count }, (_, i) => (m.values[i] ?? 0) % n);
    const [spin, setSpin] = useState<number[] | null>(null);
    const ivRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const shown = spin ?? settled;
    const isLocked = (i: number) => m.allowLock && m.locked[i] === true;

    const rollOnce = () => settled.map((v, i) => (isLocked(i) ? v : Math.floor(Math.random() * n)));
    const commit = (vals: number[]) => {
        const history = m.showHistory || m.history.length
            ? [...m.history, vals.map(v => faceText(m, v))].slice(-MAX_HISTORY) : m.history;
        updateWidget(widget.id, { props: { ...widget.props, values: vals, history } });
    };

    const roll = () => {
        if (spin) return;
        if (!m.animate) { commit(rollOnce()); return; }
        let ticks = 0;
        setSpin(rollOnce());
        ivRef.current = setInterval(() => {
            const vals = rollOnce();
            if (++ticks >= 9) {
                if (ivRef.current) clearInterval(ivRef.current);
                setSpin(null);
                commit(vals);
                return;
            }
            setSpin(vals);
        }, 80);
    };

    const toggleLock = (i: number) => {
        const locked = Array.from({ length: m.count }, (_, k) => m.locked[k] === true);
        locked[i] = !locked[i];
        updateWidget(widget.id, { props: { ...widget.props, locked } });
    };

    const numeric = faceKind(m) === 'pips' || faceKind(m) === 'number';
    const sum = shown.reduce((a, v) => a + v + 1, 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', padding: '16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', maxWidth: `${DIE_PX * 3 + 24}px`, opacity: spin ? 0.7 : 1 }}>
                {shown.map((v, i) => (
                    <Die key={i} m={m} idx={v} color={m.dieColors[i] ?? '#ffffff'} locked={isLocked(i)}
                        onTap={m.allowLock && m.count > 1 ? () => toggleLock(i) : undefined} />
                ))}
            </div>
            {m.showSum && numeric && m.count > 1 && (
                <div data-dobbel-sum style={{ fontFamily: "'Azeret Mono', monospace", fontWeight: 800, fontSize: '26px', color: '#111' }}>
                    Som: {spin ? '…' : sum}
                </div>
            )}
            <button
                type="button" className="ui-hover" onPointerDown={(e) => e.stopPropagation()} onClick={roll}
                style={{
                    height: '44px', padding: '0 20px', borderRadius: '10px', cursor: 'pointer',
                    border: '1px solid var(--accent-purple)', background: 'var(--bg-active)',
                    color: 'var(--text-main)', fontSize: '14px', fontFamily: "'Azeret Mono', monospace",
                }}>
                🎲 Rol
            </button>
            {m.showHistory && m.history.length > 0 && (
                <ol data-dobbel-history reversed style={{ margin: 0, padding: '0 0 0 28px', width: '100%', boxSizing: 'border-box', maxHeight: '150px', overflowY: 'auto', fontFamily: "'Azeret Mono', monospace", fontSize: '14px', color: '#111' }}>
                    {[...m.history].reverse().map((r, i) => (
                        <li key={i} style={{ padding: '2px 0', opacity: i ? 0.65 : 1 }}>
                            {r.join(' · ')}{numeric && r.length > 1 ? ` = ${r.reduce((a, s) => a + Number(s), 0)}` : ''}
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}
