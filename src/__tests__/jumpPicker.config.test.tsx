// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { useWorksheetStore } from '../store/useWorksheetStore';
import GetallenasConfig from '../components/configurator/plugins/GetallenasConfig';
import GetallenrijenConfig from '../components/configurator/plugins/GetallenrijenConfig';
import { applyJumps } from '../components/configurator/plugins/shared/jumpSelection';

class NoopObserver { observe() {} unobserve() {} disconnect() {} }
vi.stubGlobal('IntersectionObserver', NoopObserver);

const blockNow = () => useWorksheetStore.getState().blocks[0];
const cons = () => blockNow().constraints as Record<string, unknown>;

function mount(typeId: 'getallenas' | 'getallenrijen', constraints: Record<string, unknown> = {}) {
    useWorksheetStore.getState().clearBlocks();
    useWorksheetStore.getState().addBlockFromType(typeId, 'Test');
    useWorksheetStore.getState().updateBlockSettings(blockNow().id, { constraints: { numberType: 'natural', maxGetal: 1000, step: 5, ...constraints } as never });
    // Re-render against the live block so the picker sees each store write.
    const Comp = typeId === 'getallenas' ? GetallenasConfig : GetallenrijenConfig;
    const Live = () => { const b = useWorksheetStore((s) => s.blocks[0]); return <Comp block={b} />; };
    return render(<Live />);
}
const chip = (n: number) => screen.getByRole('button', { name: `+${n.toLocaleString('nl-BE')}` });
const on = (n: number) => chip(n).getAttribute('aria-pressed') === 'true';

afterEach(cleanup);

describe.each(['getallenas', 'getallenrijen'] as const)('%s jump multi-select', (typeId) => {
    beforeEach(() => mount(typeId));

    test('a single jump leaves no jumps key and step is that jump', () => {
        expect(on(5)).toBe(true);
        fireEvent.click(chip(10));
        fireEvent.click(chip(5));
        expect(cons().step).toBe(10);
        expect('jumps' in cons()).toBe(false);
    });

    test('two jumps write jumps in click order and keep step = the first chosen', () => {
        fireEvent.click(chip(10));
        expect(on(5) && on(10)).toBe(true);
        expect(cons().jumps).toEqual([5, 10]);
        expect(cons().step).toBe(5);
    });

    test('the last remaining jump cannot be switched off', () => {
        fireEvent.click(chip(5));
        expect(on(5)).toBe(true);
        expect(cons().step).toBe(5);
    });

    test('the Moeilijkheid options are renamed', () => {
        expect(screen.getByRole('button', { name: 'Minder lege vakjes' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Meer lege vakjes' })).toBeTruthy();
    });
});

describe('Per rij / In één rij switch', () => {
    test('rijen shows it only with 2+ jumps and writes jumpMode', () => {
        mount('getallenrijen');
        expect(screen.queryByRole('button', { name: 'In één rij' })).toBeNull();
        fireEvent.click(chip(10));
        expect(screen.getByRole('button', { name: 'Per rij' }).getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(screen.getByRole('button', { name: 'In één rij' }));
        expect(cons().jumpMode).toBe('in-rij');
        fireEvent.click(chip(10));
        expect(screen.queryByRole('button', { name: 'In één rij' })).toBeNull();
        expect('jumpMode' in cons()).toBe(false);
    });

    test('getallenas never shows it', () => {
        mount('getallenas');
        fireEvent.click(chip(10));
        expect(screen.queryByRole('button', { name: 'In één rij' })).toBeNull();
    });
});

describe('custom jump and mask places', () => {
    test('Eigen sprong adds to the selection and gets its own chip', () => {
        mount('getallenrijen');
        fireEvent.change(screen.getByPlaceholderText('bv. 0,25 of 3'), { target: { value: '3' } });
        fireEvent.click(screen.getByRole('button', { name: 'Zet' }));
        expect(cons().jumps).toEqual([5, 3]);
        expect(on(3)).toBe(true);
    });

    test('rijen mask places follow the finest chosen decimal jump', () => {
        mount('getallenrijen', { numberType: 'decimal', maxGetal: 10, step: 0.1 });
        expect(screen.queryByTitle('Honderdsten')).toBeNull();
        fireEvent.click(chip(0.01));
        expect(screen.getByTitle('Honderdsten')).toBeTruthy();
    });

    test('an existing block without jumps shows just its step', () => {
        mount('getallenas', { step: 25 });
        expect(on(25)).toBe(true);
        expect(on(5)).toBe(false);
    });
});

describe('applyJumps', () => {
    test('leaves unrelated keys and drops jumps/jumpMode at one jump', () => {
        expect(applyJumps({ a: 1, jumps: [5, 10], jumpMode: 'in-rij', step: 5 }, [10])).toEqual({ a: 1, step: 10 });
    });
});
