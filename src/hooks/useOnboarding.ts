import { useState } from 'react';

const TOUR_SEEN_KEY = 'rekenraak_tour_seen_v1';

// Welcome modal, interactive tour, Help modal, the demo video opened from Help and the
// "Wat is er nieuw" notes (from the release banner or from Help).
export function useOnboarding() {
  const [helpOpen, setHelpOpen] = useState(false);
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false);
  const [helpVideoOpen, setHelpVideoOpen] = useState(false);
  // First-run welcome (tour / demo video / skip) replaces auto-opening the tour. Shown once;
  // the tour itself stays replayable from Help regardless.
  const [welcomeOpen, setWelcomeOpen] = useState<boolean>(() => {
    try { return !localStorage.getItem(TOUR_SEEN_KEY); } catch { return false; }
  });
  const markTourSeen = () => {
    try { localStorage.setItem(TOUR_SEEN_KEY, '1'); } catch { /* ignore */ }
  };
  const closeWelcome = () => {
    markTourSeen();
    setWelcomeOpen(false);
  };
  // First-run interactive tour (replaces the old AlphaPopup). Shown once; replayable from Help.
  const [tourOpen, setTourOpen] = useState(false);
  const startTourFromWelcome = () => {
    markTourSeen();
    setWelcomeOpen(false);
    setTourOpen(true);
  };
  const closeTour = () => {
    markTourSeen();
    setTourOpen(false);
  };

  return {
    welcomeOpen, closeWelcome, startTourFromWelcome,
    tourOpen, closeTour,
    helpOpen, openHelp: () => setHelpOpen(true), closeHelp: () => setHelpOpen(false),
    startTourFromHelp: () => { setHelpOpen(false); setTourOpen(true); },
    showVideoFromHelp: () => { setHelpOpen(false); setHelpVideoOpen(true); },
    helpVideoOpen, closeHelpVideo: () => setHelpVideoOpen(false),
    startTourFromVideo: () => { setHelpVideoOpen(false); setTourOpen(true); },
    releaseNotesOpen, openReleaseNotes: () => setReleaseNotesOpen(true), closeReleaseNotes: () => setReleaseNotesOpen(false),
    showReleaseNotesFromHelp: () => { setHelpOpen(false); setReleaseNotesOpen(true); },
  };
}
