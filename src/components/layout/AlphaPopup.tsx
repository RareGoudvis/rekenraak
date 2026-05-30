import { useState } from 'react';

const STORAGE_KEY = 'enderklas_alpha_seen_v1';

export default function AlphaPopup() {
    // Lazy init reads localStorage once at mount — no effect needed.
    const [visible, setVisible] = useState(() => !localStorage.getItem(STORAGE_KEY));

    const dismiss = () => {
        localStorage.setItem(STORAGE_KEY, '1');
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="no-print" style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <div style={{
                backgroundColor: '#16161a', border: '1px solid #3a3a48', borderRadius: '12px',
                padding: '32px', maxWidth: '560px', width: '90%',
                fontFamily: "'Azeret Mono', monospace",
            }}>
                <h2 style={{ color: '#ac29e9', margin: '0 0 20px', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    ⚠ Alpha versie
                </h2>
                <p style={{ fontSize: '13px', lineHeight: 1.7, color: '#b8b8c8', margin: '0 0 12px' }}>
                    Deze tool bevindt zich momenteel in <strong style={{ color: '#fff' }}>alpha</strong>. Functies kunnen op elk moment veranderen, verdwijnen of worden toegevoegd zonder voorafgaande kennisgeving.
                </p>
                <p style={{ fontSize: '13px', lineHeight: 1.7, color: '#b8b8c8', margin: '0 0 28px' }}>
                    Het afdrukken werkt mogelijk niet volledig. Hetzelfde geldt voor andere opties en instellingen. Gebruik deze tool met dat in het achterhoofd.
                </p>
                <button
                    onClick={dismiss}
                    style={{
                        width: '100%', padding: '14px 16px', backgroundColor: '#ac29e9',
                        border: 'none', borderRadius: '8px', color: '#fff',
                        fontFamily: "'Azeret Mono', monospace", fontSize: '11px',
                        cursor: 'pointer', fontWeight: 'bold', lineHeight: 1.5,
                    }}
                >
                    Ik heb dit gelezen en begrepen. Ik beloof niet te zagen over zaken die nog niet werken.
                </button>
            </div>
        </div>
    );
}
