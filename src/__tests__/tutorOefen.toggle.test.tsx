// @vitest-environment jsdom
import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import SheetPages from '../components/sheet/SheetPages';
import Inspector from '../components/configurator/Inspector';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { decodeTutor, TUTOR_HASH_PREFIX } from '../services/oefenen/tutorPayload';
import { decodeShareHash, encodeShareLink, parseWorksheetFile } from '../services/persistence';
import { makeBlock } from './helpers/makeBlock';
import type { PackedPage } from '../services/layout/pagePacker';
import type { MeasuredHeights } from '../hooks/useMeasuredHeights';
import type { SheetDnd } from '../hooks/useSheetDnd';
import type { DocSettings } from '../store/types';
import type { Equation, MathBlock } from '../services/math/types';

// The teacher's switch "Leerlingen kunnen meer van dezelfde oefening maken" (docSettings.tutorMoreOefenen, absent = on).

// The footer QR's payloads, read straight off the props the sheet hands it.
vi.mock('../components/sheet/TutorQr', () => ({
    default: (p: { payload: string | null; more?: string | null }) => <div data-testid="qr" data-payload={p.payload ?? ''} data-more={p.more ?? ''} />,
    TUTOR_QR_CAPTION: 'Vast? Scan de code en bekijk de stappen.',
    TUTOR_QR_CAPTION_MAX: 70,
}));

const eq = (a: number, b: number): Equation => ({ id: `${a}+${b}`, operands: [a, b], operator: '+', answer: a + b, isManuallyEdited: false });
const block = (): MathBlock => ({ ...makeBlock('hr-std-optellen', { id: 'o', constraints: { numberType: 'natural' } }), leafId: 'hr-std-optellen-nat', exercises: [eq(475, 368)], instructionText: 'Reken uit.' });
const page = (blocks: MathBlock[]): PackedPage => ({
    blocks: blocks.map((b, i) => ({ block: b, width: 4, height: 6, spans: false, promoted: false, x: 0, y: i * 200, w: 4, h: 180 })),
    used: blocks.length * 8, fill: [0, 0, 0, 0], budgetPx: 916,
});
const measured: MeasuredHeights = {
    heightPxOf: () => undefined, pageBudgetPx: () => undefined, onCellMeasure: () => { }, intrinsicOf: () => undefined,
    intrinsicEntries: () => [], onBodyMeasure: () => { }, rowCutsOf: () => undefined, onRowsMeasure: () => { }, version: 0,
};
const dnd: SheetDnd = {
    fromId: null, overId: null, zone: null, isNoop: () => false,
    handleProps: () => ({ onPointerDown: () => { } }), blockProps: () => ({ onPointerDown: () => { } }),
};

function footerQr(more: Partial<DocSettings>) {
    const blocks = [block()];
    const base = useWorksheetStore.getState().docSettings;
    useWorksheetStore.setState({ blocks, docSettings: { ...base, tutorQr: true, ...more } });
    render(<SheetPages packedPages={[page(blocks)]} blockOrder={{ o: 1 }} measured={measured} dnd={dnd} onOpenSplit={() => { }} />);
    const qr = screen.getByTestId('qr');
    return { payload: qr.dataset.payload!, more: qr.dataset.more! };
}

let snapshot: ReturnType<typeof useWorksheetStore.getState>;
beforeEach(() => { snapshot = useWorksheetStore.getState(); });
afterEach(() => { cleanup(); useWorksheetStore.setState(snapshot, true); });

describe('tutorMoreOefenen', () => {
    it('absent (an older sheet) or on: the footer QR is offered the payload with the block\'s settings', () => {
        for (const setting of [{}, { tutorMoreOefenen: true }]) {
            const { payload, more } = footerQr(setting);
            expect(more).not.toBe('');
            expect(decodeTutor(TUTOR_HASH_PREFIX + more).groups[0].oefen).toBeTruthy();
            expect(decodeTutor(TUTOR_HASH_PREFIX + payload).groups[0].oefen).toBeUndefined();
            cleanup();
        }
    });

    it('off: no settings payload at all, so the QR is exactly the steps-only one', () => {
        const { payload, more } = footerQr({ tutorMoreOefenen: false });
        expect(more).toBe('');
        expect(decodeTutor(TUTOR_HASH_PREFIX + payload).groups[0].oefen).toBeUndefined();
    });

    it('the Inspector switch sits under the QR switch, only while the QR is on, and writes the setting', () => {
        const base = useWorksheetStore.getState().docSettings;
        useWorksheetStore.setState({ blocks: [block()], docSettings: { ...base, tutorQr: false }, activeBlockId: null });
        const { rerender } = render(<Inspector />);
        const open = () => { const h = screen.queryByRole('button', { name: /Verbetersleutel en hulp/ }); if (h && h.getAttribute('aria-expanded') !== 'true') fireEvent.click(h); };
        open();
        expect(screen.queryByRole('switch', { name: 'Leerlingen kunnen meer van dezelfde oefening maken' })).toBeNull();
        useWorksheetStore.setState({ docSettings: { ...useWorksheetStore.getState().docSettings, tutorQr: true } });
        rerender(<Inspector />);
        open();
        const sw = screen.getByRole('switch', { name: 'Leerlingen kunnen meer van dezelfde oefening maken' });
        expect(sw.getAttribute('aria-checked')).toBe('true');
        fireEvent.click(sw);
        expect(useWorksheetStore.getState().docSettings.tutorMoreOefenen).toBe(false);
    });

    it('travels with the sheet (file and share link); a file without it still opens', () => {
        const st = useWorksheetStore.getState();
        const state = { blocks: [block()], header: st.header, footer: st.footer, docSettings: { ...st.docSettings, tutorQr: true, tutorMoreOefenen: false }, baseSettings: st.baseSettings, selectedGrade: null };
        const link = encodeShareLink(state)!;
        expect(decodeShareHash(link.slice(link.indexOf('#')))!.docSettings.tutorMoreOefenen).toBe(false);
        const file = JSON.parse(JSON.stringify(decodeShareHash(link.slice(link.indexOf('#')))));
        expect(parseWorksheetFile(JSON.stringify(file)).docSettings.tutorMoreOefenen).toBe(false);
        delete file.docSettings.tutorMoreOefenen;
        expect(parseWorksheetFile(JSON.stringify(file)).docSettings.tutorMoreOefenen).toBeUndefined();
    });
});
