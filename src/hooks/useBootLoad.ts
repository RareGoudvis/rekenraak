import { useEffect, useState } from 'react';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { loadAutosave, decodeShareHash, RELEASE_SEEN_KEY } from '../services/persistence';
import { RELEASE_VERSION } from '../config/version';

// Boot-time hooks: share-link, autosave-restore offer, release-banner check.
// Each runs exactly once. Order matters — a shared link wins over an autosave.
export function useBootLoad(): { releaseBannerVisible: boolean; dismissReleaseBanner: () => void } {
  const loadWorksheet = useWorksheetStore((state) => state.loadWorksheet);
  const [releaseBannerVisible, setReleaseBannerVisible] = useState(false);

  useEffect(() => {
    // 1. Shared link in URL hash.
    const shared = decodeShareHash(window.location.hash);
    if (shared) {
      const isTemplate = shared.mode === 'template';
      const isCurriculum = !!shared.curriculum?.locked;
      const msg = isCurriculum
        ? 'Vergrendelde werkbundel laden? Je kan enkel oefeningen uit de gekozen lijst toevoegen, het aantal aanpassen en opnieuw genereren. Huidige werkbundel wordt vervangen.'
        : isTemplate
        ? 'Sjabloon gedeeld via link laden? Bevat enkel instellingen — klik daarna op "Genereer alles" om oefeningen te maken. Huidige werkbundel wordt vervangen.'
        : 'Werkbundel gedeeld via link laden? Huidige werkbundel wordt vervangen.';
      if (window.confirm(msg)) {
        loadWorksheet(shared);
      }
      window.history.replaceState(null, '', window.location.pathname);
      return;
    }
    // 2. Auto-resume: silently restore the last session on a fresh tab so the user
    // picks up where they left off. "Nieuw blad" (TopBar) clears it to start over.
    const auto = loadAutosave();
    if (auto && useWorksheetStore.getState().blocks.length === 0) {
      loadWorksheet(auto.payload);
    }
    // 3. Release banner: shown until user dismisses this exact version.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time boot init
      if (localStorage.getItem(RELEASE_SEEN_KEY) !== RELEASE_VERSION) setReleaseBannerVisible(true);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissReleaseBanner = () => {
    try { localStorage.setItem(RELEASE_SEEN_KEY, RELEASE_VERSION); } catch { /* ignore */ }
    setReleaseBannerVisible(false);
  };

  return { releaseBannerVisible, dismissReleaseBanner };
}
