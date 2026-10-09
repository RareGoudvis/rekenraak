// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { PaletteRow } from '../board/settings/mathControls';

// The ⚙ panels' colour controls (BUGS.md "Bordmodus" cosmetics and a11y).
afterEach(cleanup);

const PALETTE = ['#fde68a', '#bbf7d0', '#bfdbfe'];
const CYCLE = { value: 'cyclus', label: 'Afwisselend' };

describe('PaletteRow custom colour', () => {
    const custom = (c: HTMLElement) => c.querySelector<HTMLElement>('[data-palette-custom]')!;

    test('a non-colour choice (Afwisselend) leaves the custom swatch neutral, not black', () => {
        const { container, getByLabelText } = render(<PaletteRow label="Tikkleur" value="cyclus" palette={PALETTE} onChange={() => { }} extra={CYCLE} />);
        expect(custom(container).style.background).toBe('var(--bg-surface-2)');
        expect(custom(container).getAttribute('aria-pressed')).toBeNull();
        expect((getByLabelText('Tikkleur: eigen kleur') as HTMLInputElement).value).not.toBe('#000000');
    });

    test('a palette colour keeps the custom swatch neutral; a custom hex fills it and rings it', () => {
        const { container, rerender } = render(<PaletteRow label="Kleur" value="#bbf7d0" palette={PALETTE} onChange={() => { }} />);
        expect(custom(container).style.background).toBe('var(--bg-surface-2)');
        rerender(<PaletteRow label="Kleur" value="#123456" palette={PALETTE} onChange={() => { }} />);
        expect(custom(container).style.background).toBe('rgb(18, 52, 86)');
        expect(custom(container).style.boxShadow).toContain('var(--accent)');
    });

    test('the picker still writes a colour', () => {
        const onChange = vi.fn();
        const { getByLabelText } = render(<PaletteRow label="Tikkleur" value="cyclus" palette={PALETTE} onChange={onChange} extra={CYCLE} />);
        fireEvent.change(getByLabelText('Tikkleur: eigen kleur'), { target: { value: '#ff0000' } });
        expect(onChange).toHaveBeenCalledWith('#ff0000');
    });
});
