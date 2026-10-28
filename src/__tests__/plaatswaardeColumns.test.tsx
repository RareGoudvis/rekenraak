// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { useWorksheetStore } from '../store/useWorksheetStore';
import PlaatswaardeConfig from '../components/configurator/plugins/PlaatswaardeConfig';
import type { PlaatswaardeConstraints } from '../services/math/constraintTypes';

afterEach(cleanup);

const block = () => useWorksheetStore.getState().blocks[0];
const pressed = (c: HTMLElement) => [...c.querySelectorAll('button[aria-pressed="true"]')].map(b => b.textContent);

describe('Kolommen in de tabel', () => {
    test('toggles columns independently of the max and keeps at least one', () => {
        const s = useWorksheetStore.getState();
        s.clearBlocks();
        s.addBlockFromType('plaatswaarde', 'Tabel', { subType: 'tabel', maxGetal: 100, numberMask: {}, decimalPlaces: 0 });
        const { container, rerender, getAllByTitle } = render(<PlaatswaardeConfig block={block()} />);
        expect(pressed(container)).toEqual(['H', 'T', 'E']);
        // The tabel row comes after the getalopbouw row, which repeats H / T / E.
        const col = (t: string) => getAllByTitle(t).at(-1)!;
        fireEvent.click(col('Duizendtallen'));
        rerender(<PlaatswaardeConfig block={block()} />);
        expect((block().constraints as PlaatswaardeConstraints).tablePlaces).toEqual(['D', 'H', 'T', 'E']);
        for (const t of ['Duizendtallen', 'Honderdtallen', 'Tientallen', 'Eenheden']) {
            fireEvent.click(col(t));
            rerender(<PlaatswaardeConfig block={block()} />);
        }
        expect((block().constraints as PlaatswaardeConstraints).tablePlaces).toEqual(['E']);
    });
});
