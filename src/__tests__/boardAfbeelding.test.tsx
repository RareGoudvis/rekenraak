// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { afbeeldingProps, isPlainImage } from '../board/settings/afbeeldingModel';
import AfbeeldingWidget from '../board/components/widgets/AfbeeldingWidget';
import { st, w, liveW, mountWidget, openPanel, click, slide, typeIn, expectRoundTrip } from './helpers/boardWidgetHarness';

// Image settings: defaults = the old plain image; fit, frame, caption, turns, the ⚙ panel.
afterEach(() => {
    cleanup();
    localStorage.clear();
    st().resetBoard();
});

const SRC = 'data:image/png;base64,AA==';

describe('afbeelding model', () => {
    test('defaults: the plain image with 8px corners', () => {
        const m = afbeeldingProps(w('afbeelding', { src: SRC }));
        expect(isPlainImage(m)).toBe(true);
        expect(m.radius).toBe(8);
    });
    test('junk falls back per field', () => {
        expect(afbeeldingProps(w('afbeelding', { rotate: 45, opacity: 3, captionPos: 'links' }))).toMatchObject({ rotate: 0, opacity: 1, captionPos: 'onder' });
    });
});

describe('afbeelding widget', () => {
    test('the default renders the same plain <img> as before', () => {
        const { container } = mountWidget('afbeelding', { src: SRC }, AfbeeldingWidget);
        const img = container.querySelector('img')!;
        expect(img.style.width).toBe('100%');
        expect(img.style.borderRadius).toBe('8px');
        expect(container.querySelector('[data-afbeelding-box]')).toBeNull();
    });

    test('caption, frame, quarter turn and flip', () => {
        const { container } = mountWidget('afbeelding', { src: SRC, caption: 'De Schelde', captionPos: 'over', rotate: 90, flipH: true, borderWidth: 4, fit: 'vullend', ratio: '1:1', accent: '#166534' }, AfbeeldingWidget);
        expect(container.querySelector('[data-afbeelding-caption]')!.textContent).toBe('De Schelde');
        const img = container.querySelector('img')!;
        expect(img.style.transform).toContain('rotate(90deg)');
        expect(img.style.transform).toContain('scale(-1, 1)');
        expect(img.style.objectFit).toBe('cover');
        expect((container.querySelector('[data-afbeelding-box]') as HTMLElement).style.border).toContain('rgb(22, 101, 52)');
    });
});

describe('afbeelding panel', () => {
    test('every control writes the widget, survives save + load, and a reset keeps the picture', () => {
        const id = openPanel('afbeelding', { src: SRC });
        click('Vullend');
        click('16:9');
        click('Kwartslag rechts');
        click('Kwartslag rechts');
        click('Kwartslag links');
        click('Spiegel ↕');
        slide('Afgeronde hoeken', 24);
        slide('Kaderdikte', 6);
        slide('Zichtbaarheid', 60);
        typeIn('Tekst', 'Onze klas');
        click('Over de foto');
        slide('Grootte', 30);
        expect(afbeeldingProps(liveW(id))).toMatchObject({ src: SRC, fit: 'vullend', ratio: '16:9', rotate: 90, flipV: true, radius: 24, borderWidth: 6, opacity: 0.6, caption: 'Onze klas', captionPos: 'over', captionSize: 30 });
        expectRoundTrip(id);
        click('Standaard herstellen');
        click('Ja, terugzetten');
        expect(liveW(id).props).toEqual({ src: SRC });
    });
});
