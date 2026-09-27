import { useState } from 'react';
import { Hand, Flask } from '@phosphor-icons/react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { TRYOUT_SEEN_KEY } from '../../services/persistence';
import { TRYOUT_TYPE_IDS } from '../../config/version';

// The screen-only notices above the first page: the release welcome and the tryout warning.
export default function SheetBanners({ releaseVisible, onDismissRelease, onOpenHelp }: { releaseVisible: boolean; onDismissRelease: () => void; onOpenHelp: () => void }) {
  const hasTryout = useWorksheetStore((state) => state.blocks.some(b => TRYOUT_TYPE_IDS.has(b.typeId)));
  // "Nog in proef" notice for the July exercise types. Dismissal is per browser and sticky;
  // the banner itself only renders while such a block is actually on the sheet.
  const [tryoutDismissed, setTryoutDismissed] = useState(() => {
    try { return localStorage.getItem(TRYOUT_SEEN_KEY) === '1'; } catch { return false; }
  });
  const dismissTryoutBanner = () => {
    try { localStorage.setItem(TRYOUT_SEEN_KEY, '1'); } catch { /* ignore */ }
    setTryoutDismissed(true);
  };

  return (
    <>
      {releaseVisible && (
        <div className="no-print" onClick={(e) => e.stopPropagation()} style={bannerStyles.release}>
          <Hand size={16} style={{ flexShrink: 0 }} aria-hidden="true" />
          <span>Welkom bij Rekenraak! Stel links je oefenblad samen, pas het rechts aan en druk af als PDF. Nieuw hier? <button onClick={onOpenHelp} style={bannerStyles.inlineLink}>Lees de uitleg</button>.</span>
          <button onClick={onDismissRelease} style={bannerStyles.bannerClose} title="Verbergen">×</button>
        </div>
      )}

      {!tryoutDismissed && hasTryout && (
        <div className="no-print" onClick={(e) => e.stopPropagation()} style={bannerStyles.release}>
          <Flask size={16} style={{ flexShrink: 0 }} aria-hidden="true" />
          <span>Enkele oefeningen op dit blad zijn nieuw en nog in proef. Kijk het afgedrukte blad even na voor je het uitdeelt.</span>
          <button onClick={dismissTryoutBanner} style={bannerStyles.bannerClose} title="Verbergen">×</button>
        </div>
      )}
    </>
  );
}

const bannerStyles = {
  release: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '8px 16px', marginBottom: '12px',
    backgroundColor: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    fontSize: '12px', color: 'var(--text-muted)',
    fontFamily: "'Azeret Mono', monospace",
  } as React.CSSProperties,
  bannerClose: {
    marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)',
    fontSize: '18px', cursor: 'pointer', padding: '0 4px', lineHeight: 1,
  } as React.CSSProperties,
  inlineLink: {
    background: 'none', border: 'none', padding: 0, color: 'var(--accent-purple)',
    textDecoration: 'underline', cursor: 'pointer', font: 'inherit',
  } as React.CSSProperties,
};
