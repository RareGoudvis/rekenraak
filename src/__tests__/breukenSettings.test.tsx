// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent, within } from '@testing-library/react';
import BreukenSettings from '../components/configurator/plugins/shared/BreukenSettings';
import { noemerOptions, NOEMER_CEILING } from '../config/numberRanges';

afterEach(cleanup);

// Opens the PopupSelect with this aria-label and returns its option labels.
function optionsOf(container: HTMLElement, label: string): string[] {
    const trigger = container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
    fireEvent.click(trigger);
    const labels = [...container.querySelectorAll('[role="option"]')].map(o => o.textContent ?? '');
    fireEvent.click(trigger);
    return labels;
}
function pick(container: HTMLElement, label: string, option: string) {
    fireEvent.click(container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!);
    const opt = [...container.querySelectorAll<HTMLElement>('[role="option"]')].find(o => o.textContent === option)!;
    fireEvent.click(opt);
}

describe('BreukenSettings rows follow the adapter', () => {
    test('only the rows the adapter passes render, in the fixed order', () => {
        const { container } = render(
            <BreukenSettings
                noemer={{ shape: 'range', min: 2, max: 10, onChange: () => { } }}
                teller={{ value: 10, onChange: () => { } }}
                kinds={[{ kind: 'echt', on: true, locked: true }, { kind: 'onecht', on: false, onToggle: () => { } }]}
                notation={[{ label: 'Niet vereenvoudigen', on: false, onChange: () => { } }]}
            />,
        );
        const text = container.textContent ?? '';
        const order = ['Breuken', 'Noemer', 'Hoogste teller', 'Soort breuken', 'Schrijfwijze'].map(w => text.indexOf(w));
        expect(order.every(i => i >= 0)).toBe(true);
        expect([...order].sort((a, b) => a - b)).toEqual(order);
        expect(text).not.toContain('Gemengde getallen');
    });

    test('no adapter rows → only the title', () => {
        const { container } = render(<BreukenSettings />);
        expect(container.querySelectorAll('button')).toHaveLength(0);
        expect(container.textContent).toBe('Breuken');
    });

    test('step and set shapes render pills named Noemer', () => {
        const { container, unmount } = render(<BreukenSettings noemer={{ shape: 'step', value: 4, options: [2, 3, 4], onChange: () => { } }} />);
        expect(container.textContent).toContain('Noemer (sprong 1/n)');
        expect([...container.querySelectorAll('button[aria-pressed="true"]')].map(b => b.textContent)).toEqual(['1/4']);
        unmount();
        const r = render(<BreukenSettings noemer={{ shape: 'set', values: [2, 5], options: [2, 4, 5], onChange: () => { } }} />);
        expect(r.container.textContent).toContain('Noemers');
        expect([...r.container.querySelectorAll('button[aria-pressed="true"]')].map(b => b.textContent)).toEqual(['2', '5']);
    });
});

describe('noemer list', () => {
    test('one list 2..20, a leaf ceiling truncates it', () => {
        expect(noemerOptions()).toEqual(Array.from({ length: NOEMER_CEILING - 1 }, (_, i) => i + 2));
        const { container } = render(<BreukenSettings noemer={{ shape: 'max', value: 6, ceiling: 8, onChange: () => { } }} />);
        expect(optionsOf(container, 'Hoogste noemer')).toEqual(['2', '3', '4', '5', '6', '7', '8']);
    });

    test('a saved value above the list stays visible and is never floored', () => {
        const onChange = vi.fn();
        const { container } = render(<BreukenSettings noemer={{ shape: 'max', value: 100, onChange }} />);
        const trigger = container.querySelector<HTMLButtonElement>('button[aria-label="Hoogste noemer"]')!;
        expect(trigger.textContent).toBe('100');
        expect(optionsOf(container, 'Hoogste noemer').at(-1)).toBe('100');
        expect(onChange).not.toHaveBeenCalled();
    });

    test('a saved sprong outside the pills keeps a lit pill', () => {
        const { container } = render(<BreukenSettings noemer={{ shape: 'step', value: 6, options: [2, 4, 8], onChange: () => { } }} />);
        expect([...container.querySelectorAll('button[aria-pressed="true"]')].map(b => b.textContent)).toEqual(['1/6']);
    });

    test('van / tot stay clamped min ≤ max', () => {
        const onChange = vi.fn();
        const { container } = render(<BreukenSettings noemer={{ shape: 'range', min: 3, max: 6, onChange }} />);
        pick(container, 'Noemer van', '9');
        expect(onChange).toHaveBeenLastCalledWith(9, 9);
        pick(container, 'Noemer tot', '2');
        expect(onChange).toHaveBeenLastCalledWith(2, 2);
        pick(container, 'Noemer tot', '12');
        expect(onChange).toHaveBeenLastCalledWith(3, 12);
    });
});

describe('Soort breuken pills', () => {
    test('a locked pill shows on and cannot be switched off', () => {
        const onToggle = vi.fn();
        const { getByText } = render(<BreukenSettings kinds={[{ kind: 'onecht', on: true, locked: true, onToggle }, { kind: 'echt', on: true, onToggle }]} kindsHint="Hoort bij de oefening." />);
        const locked = getByText('Onechte breuken').closest('button')!;
        expect(locked.getAttribute('aria-pressed')).toBe('true');
        expect(locked.getAttribute('aria-disabled')).toBe('true');
        fireEvent.click(locked);
        expect(onToggle).not.toHaveBeenCalled();
        getByText('Hoort bij de oefening.');
    });

    test('the last lit pill stays on, others toggle', () => {
        const onEcht = vi.fn();
        const onOnecht = vi.fn();
        const { getByText } = render(<BreukenSettings kinds={[{ kind: 'echt', on: true, onToggle: onEcht }, { kind: 'onecht', on: false, onToggle: onOnecht }]} />);
        fireEvent.click(getByText('Echte breuken'));
        expect(onEcht).not.toHaveBeenCalled();
        fireEvent.click(getByText('Onechte breuken'));
        expect(onOnecht).toHaveBeenCalledWith(true);
    });
});

describe('Gemengde getallen tri-state', () => {
    test('geen / ook / alleen by default, the adapter may offer fewer', () => {
        const onChange = vi.fn();
        const { container, unmount } = render(<BreukenSettings mixed={{ value: 'none', onChange }} />);
        const group = within(container.querySelector<HTMLElement>('[role="group"]')!);
        expect(group.getAllByRole('button').map(b => b.textContent)).toEqual(['Geen', 'Ook', 'Alleen']);
        fireEvent.click(group.getByText('Ook'));
        expect(onChange).toHaveBeenCalledWith('some');
        unmount();
        const r = render(<BreukenSettings mixed={{ value: 'all', options: ['none', 'all'], onChange }} />);
        expect(within(r.container.querySelector<HTMLElement>('[role="group"]')!).getAllByRole('button').map(b => b.textContent)).toEqual(['Geen', 'Alleen']);
    });
});
