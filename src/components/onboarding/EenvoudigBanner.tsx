import { useState } from 'react';
import { Cards } from '@phosphor-icons/react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { effectiveSidebarTab } from '../../services/eenvoudigMode';

export const EENVOUDIG_BANNER_KEY = 'rekenraak_eenvoudig_banner_seen_v1';

// Shown only while the teacher is on the Eenvoudig tab (where the explanation helps); screen-only.
export default function EenvoudigBanner() {
    // Effective tab: a locked curriculum hides Eenvoudig, so the banner must not explain it there.
    const onEenvoudig = useWorksheetStore((s) => effectiveSidebarTab(s.sidebarTab, !!s.curriculum?.locked) === 'eenvoudig');
    const [dismissed, setDismissed] = useState(() => {
        try { return localStorage.getItem(EENVOUDIG_BANNER_KEY) === '1'; } catch { return false; }
    });
    if (!onEenvoudig || dismissed) return null;
    const dismiss = () => {
        try { localStorage.setItem(EENVOUDIG_BANNER_KEY, '1'); } catch { /* ignore */ }
        setDismissed(true);
    };
    return (
        <div className="no-print" data-testid="eenvoudig-banner" onClick={(e) => e.stopPropagation()} style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', marginBottom: '12px',
            backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '8px',
            fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)',
        }}>
            <Cards size={16} style={{ flexShrink: 0 }} aria-hidden="true" />
            <span><strong style={{ color: 'var(--text-main)', fontWeight: 600 }}>Eenvoudig:</strong> kies een oefening op een kaart en ze staat meteen op je blad. Wil je alle instellingen? Wissel bovenaan links naar Uitgebreid. Onder Werkblad zie je alle blokken op een rij.</span>
            <button onClick={dismiss} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }} title="Verbergen" aria-label="Verbergen">×</button>
        </div>
    );
}
