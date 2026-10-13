// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import OefenBuilderModal from '../components/oefenen/OefenBuilderModal';
import { listOefenLeaves } from '../components/oefenen/oefenBuild';
import { loadOefenSessies } from '../services/persistence';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { decodeSessie } from '../services/oefenen/session';

// One session id per content in the builder: pupils' runs are stored per id with per-slot stats,
// so a composer that ships other content must ship it under another id; reverting finds the old one.

class VisibleObserver {
    private cb: IntersectionObserverCallback;
    constructor(cb: IntersectionObserverCallback) { this.cb = cb; }
    observe(el: Element) { this.cb([{ isIntersecting: true, target: el } as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
    unobserve() { }
    disconnect() { }
}
class NoopResize { observe() { } unobserve() { } disconnect() { } }
const g = globalThis as unknown as Record<string, unknown>;
g.IntersectionObserver = VisibleObserver;
g.ResizeObserver = NoopResize;

beforeEach(() => {
    localStorage.clear();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillRect: vi.fn(), fillStyle: '' } as unknown as CanvasRenderingContext2D);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); useWorksheetStore.getState().clearDraftBlocks(); });

const footerBtn = (name: string) => screen.getAllByRole('button', { name }).at(-1) as HTMLButtonElement;
const addBtn = (id: string) => {
    const leaves = listOefenLeaves();
    const { label } = leaves.find(l => l.id === id)!;
    const rank = leaves.filter(l => l.label === label).findIndex(l => l.id === id);
    return screen.getAllByRole('button', { name: (name: string) => name.replace(/\d+×$/, '') === label })[rank];
};
const removeOnly = () => fireEvent.click(screen.getByRole('button', { name: 'Verwijderen' }));
const setLimit = (v: number) => fireEvent.change(screen.getByLabelText(/^Aantal:/), { target: { value: String(v) } });

// Delen, read the id the link carries, close the share modal again.
function sharedId(): string {
    fireEvent.click(footerBtn('Delen'));
    const id = decodeSessie(screen.getByRole('link').getAttribute('href')!.split('#oefen=')[1]).id;
    fireEvent.click(screen.getAllByRole('button', { name: 'Sluiten' }).at(-1)!);
    expect(screen.queryByRole('link')).toBeNull();
    return id;
}

describe('a new composer', () => {
    test('Delen twice unchanged is one id; swapping the type is a new id; swapping back is the first id again', () => {
        render(<OefenBuilderModal onClose={() => { }} />);
        fireEvent.click(addBtn('procenten-nemen'));
        const first = sharedId();
        expect(sharedId()).toBe(first);

        removeOnly();
        fireEvent.click(addBtn('hr-std-optellen-nat'));
        const swapped = sharedId();
        expect(swapped).not.toBe(first);

        removeOnly();
        fireEvent.click(addBtn('procenten-nemen'));
        expect(sharedId()).toBe(first);
    });

    test('the title is not content: renaming between two Delen keeps the id', () => {
        render(<OefenBuilderModal onClose={() => { }} />);
        fireEvent.click(addBtn('procenten-nemen'));
        const first = sharedId();
        fireEvent.change(screen.getByLabelText('Titel'), { target: { value: 'Procenten week 2' } });
        expect(sharedId()).toBe(first);
    });
});

describe('Bewerken a saved session', () => {
    function savedOriginal() {
        const first = render(<OefenBuilderModal onClose={() => { }} />);
        fireEvent.click(addBtn('procenten-nemen'));
        fireEvent.change(screen.getByLabelText('Titel'), { target: { value: 'Procenten' } });
        fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }));
        first.unmount();
        return loadOefenSessies()[0].sessie;
    }

    test('an edit is a new id, a revert the original id, two different edits two ids', () => {
        const original = savedOriginal();
        render(<OefenBuilderModal onClose={() => { }} initial={original} />);
        expect(sharedId()).toBe(original.id);
        setLimit(12);
        const twelve = sharedId();
        expect(twelve).not.toBe(original.id);
        setLimit(7);
        const seven = sharedId();
        expect(seven).not.toBe(original.id);
        expect(seven).not.toBe(twelve);
        setLimit(12);
        expect(sharedId()).toBe(twelve);
        // The right end of the slider = unlimited, as the original.
        setLimit(51);
        expect(sharedId()).toBe(original.id);
    });

    test('Opslaan keeps one library row through edits and a revert, under the content shown', () => {
        const original = savedOriginal();
        render(<OefenBuilderModal onClose={() => { }} initial={original} />);
        // The button reads "Opgeslagen" for a moment after each save.
        const save = () => fireEvent.click(screen.getByRole('button', { name: /^(Opslaan|Opgeslagen)$/ }));
        setLimit(12);
        save();
        setLimit(7);
        save();
        let lib = loadOefenSessies();
        expect(lib).toHaveLength(1);
        expect(lib[0].sessie.types[0].limit).toBe(7);
        expect(lib[0].sessie.id).not.toBe(original.id);
        setLimit(51);
        save();
        lib = loadOefenSessies();
        expect(lib.map(e => [e.id, e.sessie.id])).toEqual([[original.id, original.id]]);
    });
});
