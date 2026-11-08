import { useState } from 'react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { readDefaultMode, saveDefaultMode, type DefaultMode } from '../../services/eenvoudigMode';

const OPTIONS: { mode: DefaultMode; label: string; hint: string; detail: string; fit: string }[] = [
    {
        mode: 'eenvoudig', label: 'Eenvoudig', hint: 'Een kaart per oefening, één klik op het blad.',
        detail: 'Kies je leerjaar en een onderwerp, en klik op een kaart met een voorbeeld. De oefening staat meteen op je blad. Daarna pas je alleen de belangrijkste keuzes aan.',
        fit: 'Handig als je snel een blad wil of RekenRaak nog niet kent.',
    },
    {
        mode: 'oefeningen', label: 'Uitgebreid', hint: 'De volledige lijst met alle instellingen.',
        detail: 'Alle oefeningen staan per domein in één lijst, met elke instelling meteen bij de hand: getallen, bruggen, opmaak en differentiatie.',
        fit: 'Handig als je precies wil bepalen wat er op je blad komt.',
    },
];

// The teacher's default mode: saved and applied on click; the tab can still be switched any time.
export default function ModeChoice({ initial, detailed = false }: { initial?: DefaultMode; detailed?: boolean }) {
    const setSidebarTab = useWorksheetStore((s) => s.setSidebarTab);
    const [mode, setMode] = useState<DefaultMode>(() => initial ?? readDefaultMode());
    const pick = (m: DefaultMode) => { setMode(m); saveDefaultMode(m); setSidebarTab(m); };
    return (
        <div role="radiogroup" aria-label="Zo begin je" data-testid="mode-choice" style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', flexDirection: detailed ? 'column' : 'row' }}>
            {OPTIONS.map((o) => (
                <button key={o.mode} type="button" role="radio" aria-checked={mode === o.mode} onClick={() => pick(o.mode)} style={{
                    flex: detailed ? '0 0 auto' : '1 1 160px', textAlign: 'left', padding: detailed ? '12px 16px' : '8px 12px', cursor: 'pointer', fontFamily: 'inherit',
                    borderRadius: 'var(--radius-sm)', color: 'var(--text-main)',
                    border: mode === o.mode ? '2px solid var(--text-muted)' : '1px solid var(--border-color)',
                    background: mode === o.mode ? 'var(--bg-surface)' : 'var(--bg-input)',
                }}>
                    <strong style={{ display: 'block', fontSize: 'var(--text-sm)' }}>{o.label}</strong>
                    {detailed ? (<>
                        <span style={{ display: 'block', margin: '4px 0', fontSize: 'var(--text-sm)', lineHeight: 1.45, color: 'var(--text-main)' }}>{o.detail}</span>
                        <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{o.fit}</span>
                    </>) : <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{o.hint}</span>}
                </button>
            ))}
        </div>
    );
}
