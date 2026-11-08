import { useState } from 'react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { readDefaultMode, saveDefaultMode, type DefaultMode } from '../../services/eenvoudigMode';

const OPTIONS: { mode: DefaultMode; label: string; hint: string }[] = [
    { mode: 'eenvoudig', label: 'Eenvoudig', hint: 'Een kaart per oefening, één klik op het blad.' },
    { mode: 'oefeningen', label: 'Uitgebreid', hint: 'De volledige lijst met alle instellingen.' },
];

// The teacher's default mode: saved and applied on click; the tab can still be switched any time.
export default function ModeChoice({ initial }: { initial?: DefaultMode }) {
    const setSidebarTab = useWorksheetStore((s) => s.setSidebarTab);
    const [mode, setMode] = useState<DefaultMode>(() => initial ?? readDefaultMode());
    const pick = (m: DefaultMode) => { setMode(m); saveDefaultMode(m); setSidebarTab(m); };
    return (
        <div role="radiogroup" aria-label="Zo begin je" data-testid="mode-choice" style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
            {OPTIONS.map((o) => (
                <button key={o.mode} type="button" role="radio" aria-checked={mode === o.mode} onClick={() => pick(o.mode)} style={{
                    flex: '1 1 160px', textAlign: 'left', padding: '8px 12px', cursor: 'pointer', fontFamily: 'inherit',
                    borderRadius: 'var(--radius-sm)', color: 'var(--text-main)',
                    border: mode === o.mode ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                    background: mode === o.mode ? 'var(--bg-surface)' : 'var(--bg-input)',
                }}>
                    <strong style={{ display: 'block', fontSize: 'var(--text-sm)' }}>{o.label}</strong>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{o.hint}</span>
                </button>
            ))}
        </div>
    );
}
