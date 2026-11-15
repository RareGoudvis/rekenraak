import { PRENTEN, prentById, type PrentEntry } from './prenten';
import { fallbackFor } from './pick';
import { PRENT_PHOTOS, photoById, type PrentPhoto } from './photos';

// Verborgen prent: which ids a round draws from, and what an id shows (its photo and the drawn animal behind it).

export const DRAWN_IDS = PRENTEN.map(p => p.id);

/** The round's pool: the photos, or the drawn animals when the photo folder is empty. */
export const poolIds = (): string[] => PRENT_PHOTOS.length ? PRENT_PHOTOS.map(p => p.id) : DRAWN_IDS;

/** The picture for an id: its photo (if any) and the drawn animal behind it; an unknown id draws the first animal. */
export function pictureFor(id: string | null): { photo: PrentPhoto | null; drawn: PrentEntry } {
    const photo = photoById(id);
    const drawn = prentById(photo ? fallbackFor(photo, DRAWN_IDS) : id) ?? PRENTEN[0];
    return { photo, drawn };
}

/** Dev builds: ?prent=<id> shows that picture (to check a new photo); never in production. */
export function devPrent(): string | null {
    if (!import.meta.env.DEV) return null;
    try {
        const id = new URLSearchParams(globalThis.location?.search ?? '').get('prent');
        return id && poolIds().includes(id) ? id : null;
    } catch {
        return null;
    }
}
