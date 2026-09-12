import { describe, test, expect, beforeAll } from 'vitest';
import {
    WORKSHEET_FORMAT_VERSION,
    parseWorksheetFile,
    encodeShareLink,
    decodeShareHash,
    type SerialisableState,
    type CurriculumLock,
} from '../services/persistence';
import type { FooterData } from '../services/math/types';
import type { DocSettings } from '../store/useWorksheetStore';
import { DEFAULT_BASE } from '../config/baseSettings';
import { makeBlock, generateFor } from './helpers/makeBlock';

// TODO: a v2 → v3 migration test (widthUnits 6→4 / 3→2 / 2→2, version-gated) belongs
// here once the 4-column grid lands — see the layout plan, part 5a.

// encodeShareLink builds an absolute URL from `location`; node has none. A stub keeps the
// test on the pure encode/decode path instead of pulling in a whole jsdom environment.
beforeAll(() => {
    const g = globalThis as unknown as Record<string, unknown>;
    if (!g.location) g.location = { origin: 'https://rekenraak.test', pathname: '/' };
});

function state(): SerialisableState {
    const blocks = ['hr-std-optellen', 'klok-kloklezen', 'splitsen'].map((typeId, i) => {
        const block = makeBlock(typeId, { id: `b${i}` });
        const def = generateFor(block);
        return { ...block, [{ 'hr-std-optellen': 'exercises', 'klok-kloklezen': 'clockExercises', splitsen: 'splitsenExercises' }[typeId]!]: def };
    });
    return {
        blocks,
        header: { naam: true, klas: true, nummer: false, datum: true, titel: 'Rekenblad 1' },
        footer: { school: 'De Regenboog', klas: '3A', leerkracht: 'Ruben', pagina: true } as unknown as FooterData,
        docSettings: { titlePosition: 'links', showScores: true, showDividers: false } as unknown as DocSettings,
        baseSettings: { ...DEFAULT_BASE, baseMaxGetal: 100 },
        selectedGrade: 3,
    };
}

function fileFromShare(link: string | null) {
    expect(link, 'share link was not produced').not.toBeNull();
    const hash = link!.slice(link!.indexOf('#'));
    return decodeShareHash(hash);
}

describe('worksheet file', () => {
    test('serialise → parse round-trip keeps blocks, header, footer and settings', () => {
        const s = state();
        const json = JSON.stringify({
            version: WORKSHEET_FORMAT_VERSION,
            exportedAt: new Date().toISOString(),
            mode: 'full',
            blocks: s.blocks,
            header: s.header,
            footer: s.footer,
            docSettings: s.docSettings,
            baseSettings: s.baseSettings,
            selectedGrade: s.selectedGrade,
        });
        const parsed = parseWorksheetFile(json);
        expect(parsed.version).toBe(WORKSHEET_FORMAT_VERSION);
        expect(parsed.blocks).toEqual(s.blocks);
        expect(parsed.header).toEqual(s.header);
        expect(parsed.footer).toEqual(s.footer);
        expect(parsed.docSettings).toEqual(s.docSettings);
        expect(parsed.baseSettings).toEqual(s.baseSettings);
        expect(parsed.selectedGrade).toBe(3);
    });

    test('a file from a newer version is refused, in Dutch', () => {
        const json = JSON.stringify({ version: WORKSHEET_FORMAT_VERSION + 1, blocks: [], header: {}, footer: {}, docSettings: {} });
        expect(() => parseWorksheetFile(json)).toThrow(/nieuwere versie/);
        expect(() => parseWorksheetFile(json)).toThrow(new RegExp(`v${WORKSHEET_FORMAT_VERSION + 1}`));
    });

    test('an older version still loads (back-compat is the point of the field)', () => {
        const s = state();
        const json = JSON.stringify({ version: 1, blocks: s.blocks, header: s.header, footer: s.footer, docSettings: s.docSettings });
        expect(parseWorksheetFile(json).version).toBe(1);
    });

    test.each([
        ['not json at all', 'geen geldige JSON'],
        [JSON.stringify({ blocks: [], header: {}, footer: {}, docSettings: {} }), 'Versie-veld'],
        [JSON.stringify({ version: 2, header: {}, footer: {}, docSettings: {} }), 'blocks-veld'],
        [JSON.stringify({ version: 2, blocks: [], footer: {}, docSettings: {} }), 'header-veld'],
        [JSON.stringify({ version: 2, blocks: [], header: {}, docSettings: {} }), 'footer-veld'],
        [JSON.stringify({ version: 2, blocks: [], header: {}, footer: {} }), 'docSettings-veld'],
        [JSON.stringify({ version: 2, blocks: [], header: {}, footer: {}, docSettings: {}, curriculum: { locked: 'yes' } }), 'curriculum-veld'],
    ])('rejects malformed input (%#)', (json, message) => {
        expect(() => parseWorksheetFile(json)).toThrow(new RegExp(message));
    });
});

describe('share link', () => {
    test('encode → decode round-trip', () => {
        const s = state();
        const decoded = fileFromShare(encodeShareLink(s));
        expect(decoded).not.toBeNull();
        expect(decoded!.blocks).toEqual(s.blocks);
        expect(decoded!.header.titel).toBe('Rekenblad 1');
        expect(decoded!.baseSettings).toEqual(s.baseSettings);
        expect(decoded!.mode).toBe('full');
    });

    test('template mode strips the generated exercises but keeps the settings', () => {
        const s = state();
        const decoded = fileFromShare(encodeShareLink(s, { template: true }));
        expect(decoded!.mode).toBe('template');
        for (const block of decoded!.blocks) {
            expect(block.exercises).toEqual([]);
            expect(block.clockExercises ?? []).toEqual([]);
            expect(block.splitsenExercises ?? []).toEqual([]);
        }
        // Settings must survive, or the receiver's "Genereer alles" produces the wrong sheet.
        expect(decoded!.blocks.map(b => b.constraints)).toEqual(s.blocks.map(b => b.constraints));
        expect(decoded!.blocks.map(b => b.numberOfExercises)).toEqual(s.blocks.map(b => b.numberOfExercises));
    });

    test('a curriculum lock travels with the link', () => {
        const curriculum: CurriculumLock = {
            locked: true,
            allowedTypes: [{ typeId: 'hr-std-optellen', label: 'Optellen', lockedConstraints: { maxGetal: 20 } }],
        };
        const decoded = fileFromShare(encodeShareLink(state(), { curriculum }));
        expect(decoded!.curriculum).toEqual(curriculum);
    });

    test('a hash that is not a share link decodes to null', () => {
        expect(decodeShareHash('#iets-anders')).toBeNull();
        expect(decodeShareHash('')).toBeNull();
        expect(decodeShareHash('#share=not-valid-lz-data')).toBeNull();
    });

    test('an oversized worksheet returns null instead of an unusable URL', () => {
        const s = state();
        // Well past the 30 KB compressed backstop, even at ~8x compression.
        const many = Array.from({ length: 400 }, (_, i) => {
            const block = makeBlock('hr-std-optellen', { id: `big${i}`, block: { numberOfExercises: 40 } });
            return { ...block, exercises: generateFor(block) as typeof block.exercises };
        });
        expect(encodeShareLink({ ...s, blocks: many })).toBeNull();
    });
});
