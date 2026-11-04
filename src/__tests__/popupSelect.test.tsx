// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import PopupSelect from '../components/ui/PopupSelect';

const LIST = [10, 20, 100, 1000, 10000, 100000, 1000000];
const options = LIST.map((v) => ({ value: v, label: `Tot ${v}` }));

// clampToLowest is the safety net for a max that matches no option (an old save, a grade
// seed): it must floor to the nearest lower option, never drop a big value to the bottom.
function mount(value: number) {
    const onChange = vi.fn();
    render(<PopupSelect clampToLowest value={value} options={options} onChange={onChange} ariaLabel="Maximum" />);
    return onChange;
}

describe('PopupSelect clampToLowest floors an unmatched value', () => {
    afterEach(cleanup);

    test.each<[string, number, number]>([
        ['old leerjaar-6 seed 1e10 → top', 1e10, 1_000_000],
        ['above the top → top', 5_000_000, 1_000_000],
        ['below the lowest → lowest', 5, 10],
        ['between two options → the lower one', 50_000, 10_000],
    ])('%s', (_name, value, want) => {
        const onChange = mount(value);
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith(want);
    });

    test('a value that matches an option is left alone', () => {
        expect(mount(1000)).not.toHaveBeenCalled();
    });

    test('without the flag nothing is persisted', () => {
        const onChange = vi.fn();
        render(<PopupSelect value={1e10} options={options} onChange={onChange} />);
        expect(onChange).not.toHaveBeenCalled();
    });
});
