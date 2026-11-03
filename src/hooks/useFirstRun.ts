import { useCallback, useState } from 'react';

const keyOf = (key: string) => `rekenraak_firstrun_${key}_v1`;

export const betaStripKey = (m: string) => `rekenraak_betastrip_${m}_v1`;

export function resetBetaStrip(m: string) {
    try { localStorage.removeItem(betaStripKey(m)); } catch { /* ignore */ }
}

export function resetFirstRun(key: string) {
    try { localStorage.removeItem(keyOf(key)); } catch { /* storage blocked: card just shows again next time */ }
}

// True until dismissed once per key; storage failures fall back to "seen" so a card never nags.
export function useFirstRun(key: string): { show: boolean; dismiss: () => void } {
    const [show, setShow] = useState<boolean>(() => {
        try { return !localStorage.getItem(keyOf(key)); } catch { return false; }
    });
    const dismiss = useCallback(() => {
        try { localStorage.setItem(keyOf(key), '1'); } catch { /* ignore */ }
        setShow(false);
    }, [key]);
    return { show, dismiss };
}
