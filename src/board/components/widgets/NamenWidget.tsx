import { useRef, useState } from 'react';
import { Shuffle } from '@phosphor-icons/react';
import { loadNames } from '../../widgetSizing';

// Random name picker. The class list lives in localStorage (edited via the
// settings panel, one name per line) so it survives boards and sessions.
// Picks without repeats until the whole list has had a turn, then reshuffles.
export default function NamenWidget({ dark }: { dark: boolean }) {
    const [current, setCurrent] = useState<string | null>(null);
    const [spinning, setSpinning] = useState(false);
    const remaining = useRef<string[]>([]);

    const pick = () => {
        const names = loadNames();
        if (!names.length) { setCurrent('Voeg namen toe via ⚙'); return; }
        if (!remaining.current.length) remaining.current = [...names];
        const idx = Math.floor(Math.random() * remaining.current.length);
        const chosen = remaining.current.splice(idx, 1)[0];
        // Tiny roulette: flash a few random names before settling.
        setSpinning(true);
        let ticks = 0;
        const iv = setInterval(() => {
            setCurrent(names[Math.floor(Math.random() * names.length)]);
            if (++ticks >= 8) { clearInterval(iv); setCurrent(chosen); setSpinning(false); }
        }, 70);
    };

    const textColor = dark ? '#fff' : '#111';
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '16px',
            background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(30,64,175,0.06)',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.2)' : 'rgba(30,64,175,0.25)'}`, borderRadius: '10px',
        }}>
            <div style={{
                minHeight: '52px', display: 'flex', alignItems: 'center', textAlign: 'center',
                fontFamily: "'Azeret Mono', monospace", fontWeight: 700, fontSize: '34px', color: textColor,
                opacity: spinning ? 0.55 : 1,
            }}>
                {current ?? '…'}
            </div>
            <button
                type="button" className="ui-hover" onPointerDown={(e) => e.stopPropagation()} onClick={pick}
                style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px', height: '44px', padding: '0 18px',
                    borderRadius: '10px', border: '1px solid var(--accent-purple)', background: 'var(--bg-active)',
                    color: 'var(--text-main)', fontSize: '14px', cursor: 'pointer', fontFamily: "'Azeret Mono', monospace",
                }}>
                <Shuffle size={18} /> Kies een naam
            </button>
        </div>
    );
}
