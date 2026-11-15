import { useEffect, useState } from 'react';

// Verborgen prent: fetch the round's photo only when the round starts; remember per URL how it went, so the end
// screen (another mount) knows at once and a broken file falls back to a drawn picture without a second try.
export type PhotoStatus = 'loading' | 'ready' | 'failed';

const known = new Map<string, Exclude<PhotoStatus, 'loading'>>();

export function photoStatusOf(url: string | null): PhotoStatus {
    if (!url) return 'failed';
    return known.get(url) ?? 'loading';
}

/** Load an image through the browser (cached for the <image> that shows it); resolves to its outcome. */
export function loadPhoto(url: string): Promise<Exclude<PhotoStatus, 'loading'>> {
    const done = known.get(url);
    if (done) return Promise.resolve(done);
    return new Promise(resolve => {
        const settle = (s: Exclude<PhotoStatus, 'loading'>) => { known.set(url, s); resolve(s); };
        try {
            const img = new Image();
            img.onload = () => settle('ready');
            img.onerror = () => settle('failed');
            img.src = url;
        } catch {
            settle('failed');
        }
    });
}

export function usePhotoStatus(url: string | null): PhotoStatus {
    // The outcome lives in the module cache; the tick only re-renders once it is known.
    const [, tick] = useState(0);
    useEffect(() => {
        if (!url || known.has(url)) return;
        let live = true;
        void loadPhoto(url).then(() => { if (live) tick(n => n + 1); });
        return () => { live = false; };
    }, [url]);
    return photoStatusOf(url);
}

/** Tests only: forget what loaded. */
export function forgetPhotos(): void {
    known.clear();
}
