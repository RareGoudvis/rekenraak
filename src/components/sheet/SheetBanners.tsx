import { useState } from 'react';
import { Sparkle, Flask } from '@phosphor-icons/react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { TRYOUT_SEEN_KEY } from '../../services/persistence';
import { TRYOUT_TYPE_IDS, RELEASE_SUMMARY } from '../../config/version';

// The screen-only notices above the first page: the "Nieuw" release line and the tryout warning.
export default function SheetBanners({ releaseVisible, onDismissRelease, onOpenReleaseNotes }: { releaseVisible: boolean; onDismissRelease: () => void; onOpenReleaseNotes: () => void }) {
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
        // The whole line opens the notes; "Meer info" is the keyboard/screen-reader handle.
        <div className="no-print" data-testid="release-banner" onClick={(e) => { e.stopPropagation(); onOpenReleaseNotes(); }} style={{ ...bannerStyles.release, cursor: 'pointer' }}>
          <Sparkle size={16} style={{ flexShrink: 0 }} aria-hidden="true" />
          <span><strong style={bannerStyles.lead}>Nieuw:</strong> {RELEASE_SUMMARY} <button onClick={(e) => { e.stopPropagation(); onOpenReleaseNotes(); }} style={bannerStyles.inlineLink}>Meer info</button></span>
          <button onClick={(e) => { e.stopPropagation(); onDismissRelease(); }} style={bannerStyles.bannerClose} title="Verbergen" aria-label="Verbergen">×</button>
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
  lead: { color: 'var(--text-main)', fontWeight: 600 } as React.CSSProperties,
  inlineLink: {
    background: 'none', border: 'none', padding: 0, color: 'var(--accent-purple)',
    textDecoration: 'underline', cursor: 'pointer', font: 'inherit', whiteSpace: 'nowrap',
  } as React.CSSProperties,
};
