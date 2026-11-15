// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, render, cleanup } from '@testing-library/react';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { skinById } from '../oefenen/spelen/skins/registry';
import type { SkinPhase } from '../oefenen/spelen/skins/types';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { useOefenStore } from '../oefenen/useOefenStore';
import { progressOf, useSpelStore } from '../oefenen/spelen/useSpelStore';
import Prent, { PrentEnding } from '../oefenen/spelen/skins/prent/Prent';
import { pictureFor } from '../oefenen/spelen/skins/prent/picture';
import { PRENTEN } from '../oefenen/spelen/skins/prent/prenten';
import { PRENT_KEY, fallbackFor, pickPrent } from '../oefenen/spelen/skins/prent/pick';
import { PRENT_PHOTOS, photoCredit, photoUrl } from '../oefenen/spelen/skins/prent/photos';
import { forgetPhotos } from '../oefenen/spelen/skins/prent/photoLoad';
import { resetKiosk } from './helpers/oefenKiosk';

// Verborgen prent with photos: the manifest matches the folder, the round loads only its own photo, a photo that
// will not load gives way to a drawn animal, and the reveal credits the photographer.

const dir = join(process.cwd(), 'public', 'spelen', 'prent');
const drawnIds = PRENTEN.map(p => p.id);

// The pixel size written in a WebP file's header (lossy VP8 or the extended VP8X form).
function webpSize(buf: Buffer): { w: number; h: number } {
    expect(buf.toString('ascii', 0, 4)).toBe('RIFF');
    expect(buf.toString('ascii', 8, 12)).toBe('WEBP');
    const kind = buf.toString('ascii', 12, 16);
    if (kind === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    if (kind === 'VP8X') return { w: buf.readUIntLE(24, 3) + 1, h: buf.readUIntLE(27, 3) + 1 };
    if (kind === 'VP8L') {
        const b = buf.readUInt32LE(21);
        return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
    }
    throw new Error(`unknown WebP chunk ${kind}`);
}

describe('The photo manifest', () => {
    test('twelve photos, every file there (≤ 250 KB, its real size in the manifest), credits filled', () => {
        expect(PRENT_PHOTOS).toHaveLength(12);
        expect(new Set(PRENT_PHOTOS.map(p => p.id)).size).toBe(PRENT_PHOTOS.length);
        for (const p of PRENT_PHOTOS) {
            const file = join(dir, p.file);
            expect(statSync(file).size, p.file).toBeLessThanOrEqual(250 * 1024);
            expect(webpSize(readFileSync(file)), p.file).toEqual({ w: p.w, h: p.h });
            expect(Math.max(p.w, p.h), p.file).toBeLessThanOrEqual(1200);
            for (const field of ['alt', 'photographer', 'title', 'source'] as const) expect(p[field].trim(), `${p.id} ${field}`).not.toBe('');
            expect(p.url, p.id).toMatch(/^https:\/\//);
            expect(p.year, p.id).toBeGreaterThanOrEqual(2015);
            if (p.fallback) expect(drawnIds, p.id).toContain(p.fallback);
            expect(photoUrl(p)).toBe(`/spelen/prent/${p.file}`);
            expect(photoCredit(p)).toBe(`Foto: ${p.photographer} / Comedy Wildlife Photography Awards`);
        }
    });

    test('no stray files; CREDITS.md and the about page name every photo', () => {
        const files = readdirSync(dir).filter(f => f !== 'CREDITS.md').sort();
        expect(files).toEqual(PRENT_PHOTOS.map(p => p.file).sort());
        const credits = readFileSync(join(dir, 'CREDITS.md'), 'utf8');
        const about = readFileSync(join(process.cwd(), 'about.html'), 'utf8');
        expect(about).toContain('href="/spelen/prent/CREDITS.md"');
        for (const p of PRENT_PHOTOS) {
            expect(credits, p.id).toContain(`| ${p.file} |`);
            expect(credits, p.id).toContain(p.photographer);
            expect(credits, p.id).toContain(p.title);
            expect(about, p.id).toContain(p.photographer);
        }
    });

    test('each photo has a drawn stand-in: the one it names, else a steady pick', () => {
        expect(fallbackFor({ id: 'x', fallback: 'kikker' }, drawnIds)).toBe('kikker');
        expect(fallbackFor({ id: 'x', fallback: 'weg' }, drawnIds)).toBe(fallbackFor({ id: 'x' }, drawnIds));
        for (const p of PRENT_PHOTOS) {
            const a = fallbackFor(p, drawnIds);
            expect(drawnIds).toContain(a);
            expect(fallbackFor(p, drawnIds)).toBe(a);
            expect(pictureFor(p.id)).toMatchObject({ photo: p, drawn: { id: a } });
        }
        // An id without a photo is a drawn animal (old device memory).
        expect(pictureFor('giraf')).toMatchObject({ photo: null, drawn: { id: 'giraf' } });
    });

    test('the pick draws from the photos, never the last one', () => {
        const ids = PRENT_PHOTOS.map(p => p.id);
        for (const last of ids) for (const r of [0, 0.3, 0.7, 0.999]) expect(pickPrent(ids, last, () => r)).not.toBe(last);
        expect(new Set(Array.from({ length: 48 }, (_, i) => pickPrent(ids, null, () => i / 48))).size).toBe(12);
    });
});

// A fake browser image: records what was asked and settles on demand.
const asked: { src: string; settle(ok: boolean): void }[] = [];
class FakeImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(v: string) { asked.push({ src: v, settle: ok => (ok ? this.onload : this.onerror)?.() }); }
}

let choice: ZelfChoice;
const sp = () => useSpelStore.getState();
const start = () => act(() => sp().start({ choice, grade: 2, topicId: 'Hoofdrekenen · Optellen', meta: skinById('prent')!.meta }));
const right = () => { act(() => sp().answer(sp().question!.answer)); act(() => sp().next()); };

function Wired() {
    const st = useSpelStore();
    if (!st.question || !st.meta) return null;
    const progress = progressOf(st);
    return (
        <Prent question={{ key: st.question.key, text: st.question.text, index: progress.answered }} choices={null}
            phase={st.phase as SkinPhase} feedback={st.feedback} onAnswer={st.answer} onHelp={() => st.openHelp()} onMiss={() => st.miss()}
            onFail={() => st.fail()} sound={() => { }} progress={progress} options={{}} events={st.events} reducedMotion={false}
            onFinish={st.finish} />
    );
}

describe('A round with a photo', () => {
    beforeAll(async () => {
        const data = await loadEenvoudigData();
        choice = choicesFor(data, 2, 'Hoofdrekenen · Optellen').find(c => c.label === 'Met brug')!;
    });
    beforeEach(() => {
        resetKiosk();
        useOefenStore.setState({ fixed: null });
        sp().otherGame();
        sp().takePickerAt();
        localStorage.removeItem(PRENT_KEY);
        forgetPhotos();
        asked.length = 0;
        vi.stubGlobal('Image', FakeImage);
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });
    afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

    test('only the round\'s own photo is fetched, when the round starts; the frame takes its shape', async () => {
        expect(asked).toHaveLength(0);
        start();
        const { container } = render(<Wired />);
        expect(asked).toHaveLength(1);
        const id = container.querySelector('[data-prent]')!.getAttribute('data-prent')!;
        const photo = PRENT_PHOTOS.find(p => p.id === id)!;
        expect(asked[0].src).toBe(photoUrl(photo));
        // Still loading: the tiles cover a plain fill, no image yet.
        expect(container.querySelector('image')).toBeNull();
        expect(container.querySelectorAll('.pr-tile')).toHaveLength(16);
        await act(async () => asked[0].settle(true));
        expect(container.querySelector('image')!.getAttribute('href')).toBe(photoUrl(photo));
        const [, , w, h] = container.querySelector('.pr-svg')!.getAttribute('viewBox')!.split(' ').map(Number);
        expect((w - 20) / (h - 22)).toBeCloseTo(photo.w / photo.h, 1);
    });

    test('the credit waits for the reveal, then names the photographer; the end screen shows it too', async () => {
        start();
        const { container } = render(<Wired />);
        await act(async () => asked[0].settle(true));
        const id = container.querySelector('[data-prent]')!.getAttribute('data-prent')!;
        const photo = PRENT_PHOTOS.find(p => p.id === id)!;
        const credit = () => container.querySelector('.pr-credit')!;
        expect(credit().textContent).toBe(photoCredit(photo));
        expect(credit().getAttribute('aria-hidden')).toBe('true');
        for (let i = 0; i < 15; i++) right();
        act(() => sp().answer(sp().question!.answer));
        expect(container.querySelector('.pr-root.is-done')).not.toBeNull();
        expect(credit().getAttribute('aria-hidden')).toBe('false');
        act(() => sp().next());
        const end = render(<PrentEnding outcome="won" progress={progressOf(sp())} options={{}} reducedMotion={false} />);
        // The end screen knows the photo loaded: no second fetch, the picture at once.
        expect(asked).toHaveLength(1);
        expect(end.container.querySelector('[role="img"]')!.getAttribute('aria-label')).toBe(`De prent: ${photo.alt}`);
        expect(end.container.querySelector('image')).not.toBeNull();
        expect(end.container.querySelector('.pr-credit')!.textContent).toBe(`Foto: ${photo.photographer} / Comedy Wildlife Photography Awards`);
        expect(end.container.querySelectorAll('.pr-tile')).toHaveLength(0);
    });

    test('a photo that will not load gives way to its drawn animal, in the game and on the end screen', async () => {
        start();
        const { container } = render(<Wired />);
        const id = container.querySelector('[data-prent]')!.getAttribute('data-prent')!;
        const photo = PRENT_PHOTOS.find(p => p.id === id)!;
        await act(async () => asked[0].settle(false));
        const drawn = fallbackFor(photo, drawnIds);
        expect(container.querySelector('.prent-art')!.getAttribute('data-prent')).toBe(drawn);
        expect(container.querySelector('image')).toBeNull();
        expect(container.querySelector('.pr-credit')).toBeNull();
        expect(container.querySelector('.pr-svg')!.getAttribute('viewBox')).toBe('-10 -10 420 322');
        // The game goes on as before: a tile per right answer.
        right();
        expect(container.querySelectorAll('.pr-tile.is-gone')).toHaveLength(1);
        const end = render(<PrentEnding outcome="won" progress={progressOf(sp())} options={{}} reducedMotion={false} />);
        expect(asked).toHaveLength(1);
        expect(end.container.querySelector('.prent-art')).not.toBeNull();
        expect(end.container.querySelector('.pr-credit')).toBeNull();
        expect(end.container.querySelector('[role="img"]')!.getAttribute('aria-label')).toBe(`De prent: ${PRENTEN.find(p => p.id === drawn)!.label}`);
    });

    test('a browser without Image still plays, on the drawn animal', async () => {
        vi.stubGlobal('Image', undefined);
        start();
        const { container } = render(<Wired />);
        await act(async () => { await Promise.resolve(); });
        expect(container.querySelector('.prent-art')).not.toBeNull();
        right();
        expect(container.querySelectorAll('.pr-tile.is-gone')).toHaveLength(1);
    });
});
