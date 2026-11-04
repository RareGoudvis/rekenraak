import { useEffect, useState } from 'react';

// What the sheet can actually render with: the faces that finished loading. A loadingdone
// event alone is not news — Playwright's element screenshot fires one per shot without
// loading anything, and each spurious epoch wiped every intrinsic width mid-measure.
export function loadedFacesSignature(fonts: Iterable<FontFace>): string {
    const faces: string[] = [];
    for (const f of fonts) {
        if (f.status === 'loaded') faces.push(`${f.family}|${f.weight}|${f.style}|${f.stretch}|${f.unicodeRange}`);
    }
    return faces.sort().join(';');
}

/** Bumps when the set of loaded web-font faces changes, never on a no-op loadingdone. */
export function useFontEpoch(): number {
    const [epoch, setEpoch] = useState(0);
    useEffect(() => {
        const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
        if (!fonts?.addEventListener) return;
        let last = loadedFacesSignature(fonts);
        const onDone = () => {
            const sig = loadedFacesSignature(fonts);
            if (sig === last) return;
            last = sig;
            setEpoch(e => e + 1);
        };
        fonts.addEventListener('loadingdone', onDone);
        return () => fonts.removeEventListener('loadingdone', onDone);
    }, []);
    return epoch;
}
