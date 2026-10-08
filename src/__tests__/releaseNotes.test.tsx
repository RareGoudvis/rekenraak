// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, fireEvent, screen, renderHook, act } from '@testing-library/react';
import { RELEASE_NOTES, KIND_ORDER } from '../config/releaseNotes';
import { RELEASE_VERSION, RELEASE_SUMMARY } from '../config/version';
import { flattenLeaves } from '../config/appstructure';
import { seedLeafConstraints } from '../config/baseSettings';
import { generateForBlock } from '../services/generateDispatch';
import { RELEASE_SEEN_KEY } from '../services/persistence';
import { makeBlock } from './helpers/makeBlock';
import ReleaseNotesModal from '../components/layout/ReleaseNotesModal';
import HelpModal from '../components/layout/HelpModal';
import SheetBanners from '../components/sheet/SheetBanners';
import { useOnboarding } from '../hooks/useOnboarding';
import { useBootLoad } from '../hooks/useBootLoad';

// The examples lazy-mount on scroll; jsdom has no IntersectionObserver, so this one reports
// every element as visible at once and the live previews really render.
class VisibleObserver {
    private cb: IntersectionObserverCallback;
    constructor(cb: IntersectionObserverCallback) { this.cb = cb; }
    observe(el: Element) { this.cb([{ isIntersecting: true, target: el } as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
    unobserve() { }
    disconnect() { }
}
const g = globalThis as unknown as Record<string, unknown>;
g.IntersectionObserver = VisibleObserver;

afterEach(cleanup);

const leafIds = new Set(flattenLeaves().map(l => l.id));
const examples = RELEASE_NOTES.flatMap(n => n.items.flatMap(it => (it.example ? [{ version: n.version, ...it.example }] : [])));

describe('release-notes data', () => {
    test('the newest entry drives the banner version and summary', () => {
        expect(RELEASE_VERSION).toBe(RELEASE_NOTES[0].version);
        expect(RELEASE_SUMMARY).toBe(RELEASE_NOTES[0].summary);
    });

    test('every entry is well-formed: unique version, a date, a summary, short items of a known kind', () => {
        expect(RELEASE_NOTES.length).toBeGreaterThan(0);
        expect(new Set(RELEASE_NOTES.map(n => n.version)).size).toBe(RELEASE_NOTES.length);
        for (const note of RELEASE_NOTES) {
            expect(note.date).toMatch(/^\d{4}-(0[1-9]|1[0-2])(-\d{2})?$/);
            expect(note.summary.trim().length).toBeGreaterThan(0);
            expect(note.items.length).toBeGreaterThan(0);
            for (const it of note.items) {
                expect(KIND_ORDER).toContain(it.kind);
                // "≤ 2 short lines" in the modal: keep every item skimmable.
                expect(it.text.length, it.text).toBeLessThanOrEqual(160);
            }
        }
    });

    test.each(examples)('$version example $leafId is a sidebar leaf that fills a block without a note', (ex) => {
        expect(leafIds.has(ex.leafId)).toBe(true);
        const seeded = seedLeafConstraints(ex.leafId, ex.grade ?? null, ex.constraints);
        expect(seeded).not.toBeNull();
        const block = makeBlock(seeded!.typeId, { constraints: seeded!.constraints, block: { numberOfExercises: ex.count ?? 1 } });
        const { items, note } = generateForBlock(block);
        expect(items.length).toBe(ex.count ?? 1);
        expect(note ?? null).toBeNull();
    });
});

describe('ReleaseNotesModal', () => {
    test('renders every item and a live preview for every example', () => {
        render(<ReleaseNotesModal onClose={() => { }} />);
        const dialog = screen.getByRole('dialog', { name: 'Wat is er nieuw' });
        for (const it of RELEASE_NOTES.flatMap(n => n.items)) expect(dialog.textContent).toContain(it.text);
        expect(dialog.textContent).not.toContain('Voorbeeld niet beschikbaar');
        expect(dialog.textContent?.match(/Voorbeeld:/g)?.length ?? 0).toBe(examples.length);
    });

    test('Escape closes it; Tab wraps inside it', () => {
        const onClose = vi.fn();
        render(<HelpModal onClose={onClose} onShowReleaseNotes={() => { }} />);
        const dialog = screen.getByRole('dialog');
        expect(dialog.contains(document.activeElement)).toBe(true);
        const buttons = [...dialog.querySelectorAll('button')];
        buttons[buttons.length - 1].focus();
        fireEvent.keyDown(dialog, { key: 'Tab' });
        expect(document.activeElement).toBe(buttons[0]);
        fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
        expect(document.activeElement).toBe(buttons[buttons.length - 1]);
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onClose).toHaveBeenCalled();
    });
});

// The app's wiring, minus the sheet: banner + Help both open the same modal.
function Harness() {
    const o = useOnboarding();
    return (
        <>
            <button onClick={o.openHelp}>Uitleg</button>
            <SheetBanners releaseVisible onDismissRelease={() => { }} onOpenReleaseNotes={o.openReleaseNotes} />
            {o.helpOpen && <HelpModal onClose={o.closeHelp} onShowReleaseNotes={o.showReleaseNotesFromHelp} />}
            {o.releaseNotesOpen && <ReleaseNotesModal onClose={o.closeReleaseNotes} />}
        </>
    );
}

describe('release banner', () => {
    test('shows the summary and opens "Wat is er nieuw" from "Meer info"; focus returns on close', () => {
        render(<Harness />);
        expect(screen.getByTestId('release-banner').textContent).toContain(RELEASE_SUMMARY);
        const more = screen.getByRole('button', { name: 'Meer info' });
        more.focus();
        fireEvent.click(more);
        expect(screen.getByRole('dialog', { name: 'Wat is er nieuw' })).toBeTruthy();
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(document.activeElement).toBe(more);
    });

    test('a click anywhere on the line opens it; the close button only dismisses', () => {
        const open = vi.fn();
        const dismiss = vi.fn();
        render(<SheetBanners releaseVisible onDismissRelease={dismiss} onOpenReleaseNotes={open} />);
        fireEvent.click(screen.getByTestId('release-banner'));
        expect(open).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByRole('button', { name: 'Verbergen' }));
        expect(dismiss).toHaveBeenCalledTimes(1);
        expect(open).toHaveBeenCalledTimes(1);
    });

    test('Help reopens the notes after the banner was dismissed', () => {
        render(<Harness />);
        fireEvent.click(screen.getByRole('button', { name: 'Uitleg' }));
        fireEvent.click(screen.getByRole('button', { name: 'Wat is er nieuw' }));
        expect(screen.getByRole('dialog', { name: 'Wat is er nieuw' })).toBeTruthy();
        expect(screen.queryByRole('dialog', { name: 'Hulp' })).toBeNull();
    });
});

describe('banner seen-key', () => {
    beforeEach(() => localStorage.clear());

    test('an older seen version shows the banner; dismissing stores the current one', () => {
        localStorage.setItem(RELEASE_SEEN_KEY, 'v0.5-2026-05-31');
        const { result } = renderHook(() => useBootLoad());
        expect(result.current.releaseBannerVisible).toBe(true);
        act(() => result.current.dismissReleaseBanner());
        expect(result.current.releaseBannerVisible).toBe(false);
        expect(localStorage.getItem(RELEASE_SEEN_KEY)).toBe(RELEASE_VERSION);
    });

    test('the current version, once seen, stays hidden', () => {
        localStorage.setItem(RELEASE_SEEN_KEY, RELEASE_VERSION);
        const { result } = renderHook(() => useBootLoad());
        expect(result.current.releaseBannerVisible).toBe(false);
    });
});
