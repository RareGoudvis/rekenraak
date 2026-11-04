// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { overlayRegionStyle } from '../services/regionStyle';
import SheetHeader from '../components/sheet/SheetHeader';
import { useWorksheetStore } from '../store/useWorksheetStore';

afterEach(cleanup);

describe('RegionStyle: italic and underline', () => {
    test('map onto fontStyle / textDecoration and stay absent when off', () => {
        expect(overlayRegionStyle({}, { italic: true, underline: true })).toMatchObject({ fontStyle: 'italic', textDecoration: 'underline' });
        const off = overlayRegionStyle({}, { italic: false, underline: false });
        expect(off.fontStyle).toBeUndefined();
        expect(off.textDecoration).toBeUndefined();
    });

    test('the header applies weight, slant and underline to the title only', () => {
        const docSettings = { ...useWorksheetStore.getState().docSettings, headerCustom: { bold: false, italic: true, underline: true } };
        const header = { ...useWorksheetStore.getState().header, titel: 'Rekenen', naam: true };
        const { container } = render(<SheetHeader header={header} docSettings={docSettings} totalScore={0} />);
        const box = container.firstElementChild as HTMLElement;
        const h1 = container.querySelector('h1') as HTMLElement;
        expect(box.style.textDecoration).toBe('');
        expect(box.style.fontStyle).toBe('');
        expect([h1.style.fontWeight, h1.style.fontStyle, h1.style.textDecoration]).toEqual(['400', 'italic', 'underline']);
    });

    test('the header title stays bold by default', () => {
        const { docSettings, header } = useWorksheetStore.getState();
        const { container } = render(<SheetHeader header={{ ...header, titel: 'X' }} docSettings={docSettings} totalScore={0} />);
        expect((container.querySelector('h1') as HTMLElement).style.fontWeight).toBe('700');
    });
});
