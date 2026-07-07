import { useRef, useState } from 'react';
import { dobbelProps } from '../../widgetSizing';
import type { BoardWidget } from '../../boardTypes';

// Pip layout per value 1-6 on a 3×3 grid (indices row-major).
const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

function Die({ value, text }: { value: number; text?: string }) {
    const size = 92;
    return (
        <div style={{
            width: size, height: size, borderRadius: '16px', background: '#fff',
            border: '2px solid #111', boxShadow: '0 3px 8px rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', boxSizing: 'border-box',
        }}>
            {text !== undefined ? (
                <span style={{ fontFamily: "'Azeret Mono', monospace", fontWeight: 800, fontSize: text.length > 3 ? '18px' : '32px', textAlign: 'center', color: '#111', wordBreak: 'break-word' }}>{text}</span>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: 'repeat(3,1fr)', width: '100%', height: '100%' }}>
                    {Array.from({ length: 9 }, (_, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {PIPS[value]?.includes(i) && <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#111' }} />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Dice roller: 6-sided shows pips, other side-counts / custom lists show text faces.
export default function DobbelsteenWidget({ widget }: { widget: BoardWidget }) {
    const p = dobbelProps(widget);
    const [faces, setFaces] = useState<string[] | number[]>(() => Array(p.count).fill(p.custom.length ? p.custom[0] : 1));
    const [rolling, setRolling] = useState(false);
    const ivRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const oneRoll = (): string | number => p.custom.length
        ? p.custom[Math.floor(Math.random() * p.custom.length)]
        : 1 + Math.floor(Math.random() * p.sides);

    const roll = () => {
        if (rolling) return;
        setRolling(true);
        let ticks = 0;
        ivRef.current = setInterval(() => {
            setFaces(Array.from({ length: p.count }, oneRoll) as string[] | number[]);
            if (++ticks >= 9) { if (ivRef.current) clearInterval(ivRef.current); setRolling(false); }
        }, 80);
    };

    const usePips = !p.custom.length && p.sides === 6;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', padding: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', opacity: rolling ? 0.7 : 1 }}>
                {Array.from({ length: p.count }, (_, i) => {
                    const f = faces[i] ?? (p.custom.length ? p.custom[0] : 1);
                    return usePips
                        ? <Die key={i} value={Number(f)} />
                        : <Die key={i} value={0} text={String(f)} />;
                })}
            </div>
            <button
                type="button" className="ui-hover" onPointerDown={(e) => e.stopPropagation()} onClick={roll}
                style={{
                    height: '44px', padding: '0 20px', borderRadius: '10px', cursor: 'pointer',
                    border: '1px solid var(--accent-purple)', background: 'var(--bg-active)',
                    color: 'var(--text-main)', fontSize: '14px', fontFamily: "'Azeret Mono', monospace",
                }}>
                🎲 Rol
            </button>
        </div>
    );
}
