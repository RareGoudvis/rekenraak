import { useState } from 'react';
import { Shuffle, Warning } from '@phosphor-icons/react';
import { loadNames, groepjesProps, makeGroups } from '../../widgetSizing';
import type { BoardWidget } from '../../boardTypes';

// Group maker: deals the class list (shared with the namenkiezer) into groups,
// honoring must-together / cannot-together rules from the settings panel.
export default function GroepjesWidget({ widget }: { widget: BoardWidget }) {
    const [result, setResult] = useState<{ groups: string[][]; ok: boolean } | null>(null);

    const make = () => {
        const names = loadNames();
        if (names.length < 2) { setResult({ groups: [[ 'Voeg namen toe via ⚙' ]], ok: true }); return; }
        setResult(makeGroups(names, groepjesProps(widget)));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px' }}>
            {result && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
                    {result.groups.map((g, i) => (
                        <div key={i} style={{
                            borderRadius: '10px', border: '1px solid rgba(30,64,175,0.3)', background: 'rgba(30,64,175,0.06)',
                            padding: '8px 10px', fontFamily: "'Azeret Mono', monospace",
                        }}>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e40af', marginBottom: '4px' }}>Groep {i + 1}</div>
                            {g.map(n => <div key={n} style={{ fontSize: '14px', color: '#111' }}>{n}</div>)}
                        </div>
                    ))}
                </div>
            )}
            {result && !result.ok && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b45309', fontSize: '12px', fontFamily: "'Azeret Mono', monospace" }}>
                    <Warning size={16} /> Niet alle regels konden gevolgd worden.
                </div>
            )}
            <button
                type="button" className="ui-hover" onPointerDown={(e) => e.stopPropagation()} onClick={make}
                style={{
                    alignSelf: 'center', display: 'inline-flex', alignItems: 'center', gap: '8px',
                    height: '44px', padding: '0 20px', borderRadius: '10px', cursor: 'pointer',
                    border: '1px solid var(--accent-purple)', background: 'var(--bg-active)',
                    color: 'var(--text-main)', fontSize: '14px', fontFamily: "'Azeret Mono', monospace",
                }}>
                <Shuffle size={18} /> {result ? 'Opnieuw verdelen' : 'Maak groepen'}
            </button>
        </div>
    );
}
