import { useEffect, useLayoutEffect, useState } from 'react';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { loadAutosave, decodeShareHash, RELEASE_SEEN_KEY, UPGRADE_SEEN_KEY } from '../services/persistence';
import { TOUR_SEEN_KEY } from './useOnboarding';
import { isBordPage } from '../bootEntry';
import { RELEASE_VERSION } from '../config/version';
import { readDefaultMode } from '../services/eenvoudigMode';

// Boot-time hooks: share-link, autosave-restore offer, release-banner check.
// Each runs exactly once. Order matters — a shared link wins over an autosave.
export function useBootLoad(): { releaseBannerVisible: boolean; dismissReleaseBanner: () => void; upgradeVisible: boolean; closeUpgrade: () => void } {
  const loadWorksheet = useWorksheetStore((state) => state.loadWorksheet);
  const [releaseBannerVisible, setReleaseBannerVisible] = useState(false);
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const setSidebarTab = useWorksheetStore((state) => state.setSidebarTab);

  // Layout effect so the first paint already shows the teacher's own tab (no Uitgebreid flash).
  useLayoutEffect(() => {
    setSidebarTab(readDefaultMode());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      loadWorksheet(auto.payload, auto.presetId);
    }
    // 3. Release banner: shown until user dismisses this exact version.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time boot init
      if (localStorage.getItem(RELEASE_SEEN_KEY) !== RELEASE_VERSION) setReleaseBannerVisible(true);
    } catch { /* ignore */ }
    // 4. Upgrade modal: returning teachers only (tour key set), once per release, never on bord.html.
    try {
      const returning = !!localStorage.getItem(TOUR_SEEN_KEY);
      const unseen = localStorage.getItem(RELEASE_SEEN_KEY) !== RELEASE_VERSION && localStorage.getItem(UPGRADE_SEEN_KEY) !== RELEASE_VERSION;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time boot init
      if (returning && unseen && !isBordPage()) setUpgradeVisible(true);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissReleaseBanner = () => {
    try { localStorage.setItem(RELEASE_SEEN_KEY, RELEASE_VERSION); } catch { /* ignore */ }
    setReleaseBannerVisible(false);
  };

  const closeUpgrade = () => {
    try { localStorage.setItem(UPGRADE_SEEN_KEY, RELEASE_VERSION); } catch { /* ignore */ }
    setUpgradeVisible(false);
  };

  return { releaseBannerVisible, dismissReleaseBanner, upgradeVisible, closeUpgrade };
}
