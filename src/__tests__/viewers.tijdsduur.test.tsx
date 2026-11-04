// @vitest-environment jsdom
import { test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import TijdsduurViewer from '../components/viewer/TijdsduurViewer';
import { BlockWidthProvider, FULL_BLOCK_WIDTH_PX } from '../components/viewer/BlockWidthContext';
import { TIJDSDUUR_KIOSK } from '../services/oefenen/kioskDescriptors';
import { makeBlock } from './helpers/makeBlock';
import type { TijdsduurExercise } from '../services/math/types';

afterEach(cleanup);

const ex = (over: Partial<TijdsduurExercise>): TijdsduurExercise =>
    ({ id: 't', startMin: 22 * 60, endMin: 25 * 60, blank: 'duur', isManuallyEdited: false, ...over });

function draw(exs: TijdsduurExercise[], showSolutions = false) {
    const block = makeBlock('tijdsduur', {});
    block.tijdsduurExercises = exs;
    return render(<BlockWidthProvider value={FULL_BLOCK_WIDTH_PX}><TijdsduurViewer block={block} showSolutions={showSolutions} /></BlockWidthProvider>);
}

test('past midnight the marker is its own block line in the einde cell, not inline text', () => {
    const { container, getByTestId } = draw([ex({})]);
    const marker = getByTestId('volgende-dag');
    expect(marker.textContent).toBe('volgende dag');
    expect(marker.style.display).toBe('block');
    const cells = container.querySelectorAll('.print-exercise')[1].children;
    expect(cells[1].contains(marker)).toBe(true);
    expect(cells[1].textContent).toContain('01:00');
});

test('the grid column template is the same with and without a next-day row', () => {
    const tpl = (c: HTMLElement) => (c.querySelectorAll('.print-exercise')[1] as HTMLElement).style.gridTemplateColumns;
    const a = tpl(draw([ex({})]).container);
    cleanup();
    const b = tpl(draw([ex({ endMin: 23 * 60 })]).container);
    expect(a).toBe(b);
});

test('no marker before midnight; the red solution carries it when the einde is the blank', () => {
    expect(draw([ex({ endMin: 23 * 60 })]).queryByTestId('volgende-dag')).toBeNull();
    cleanup();
    expect(draw([ex({ blank: 'einde' })], false).queryByTestId('volgende-dag')).toBeNull();
    cleanup();
    const { getByTestId } = draw([ex({ blank: 'einde' })], true);
    expect(getByTestId('volgende-dag').closest('div')!.textContent).toContain('01:00');
});

test('kiosk display says "volgende dag" for a given einde past midnight, but not for the blank', () => {
    const d = TIJDSDUUR_KIOSK.display!;
    expect(d(ex({}), {})).toContain('einde 1:00 (volgende dag)');
    expect(d(ex({ blank: 'einde' }), {})).toContain('einde ? ·');
    expect(d(ex({ endMin: 23 * 60 }), {})).not.toContain('volgende');
});
