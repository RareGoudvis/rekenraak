import { describe, test, expect, beforeAll } from 'vitest';
import {
    WORKSHEET_FORMAT_VERSION,
    parseWorksheetFile,
    migrateWorksheetFile,
    encodeShareLink,
    decodeShareHash,
    type SerialisableState,
    type CurriculumLock,
} from '../services/persistence';
import type { FooterData } from '../services/math/types';
import type { DocSettings } from '../store/useWorksheetStore';
import { DEFAULT_BASE } from '../config/baseSettings';
import { makeBlock, generateFor } from './helpers/makeBlock';

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

    test('fontSizeMath / fontSizeText survive the round-trip', () => {
        const s = state();
        const docSettings = { ...s.docSettings, fontSizeMath: 14, fontSizeText: 16 } as DocSettings;
        const json = JSON.stringify({
            version: WORKSHEET_FORMAT_VERSION,
            exportedAt: new Date().toISOString(),
            mode: 'full',
            blocks: s.blocks,
            header: s.header,
            footer: s.footer,
            docSettings,
            baseSettings: s.baseSettings,
            selectedGrade: s.selectedGrade,
        });
        const parsed = parseWorksheetFile(json);
        expect(parsed.docSettings.fontSizeMath).toBe(14);
        expect(parsed.docSettings.fontSizeText).toBe(16);
    });

    test('a file from a newer version is refused, in Dutch', () => {
        const json = JSON.stringify({ version: WORKSHEET_FORMAT_VERSION + 1, blocks: [], header: {}, footer: {}, docSettings: {} });
        expect(() => parseWorksheetFile(json)).toThrow(/nieuwere versie/);
        expect(() => parseWorksheetFile(json)).toThrow(new RegExp(`v${WORKSHEET_FORMAT_VERSION + 1}`));
    });

    test('an older version still loads, migrated up (back-compat is the point of the field)', () => {
        const s = state();
        const json = JSON.stringify({ version: 1, blocks: s.blocks, header: s.header, footer: s.footer, docSettings: s.docSettings });
        const parsed = parseWorksheetFile(json);
        expect(parsed.version).toBe(WORKSHEET_FORMAT_VERSION);
        expect(parsed.blocks).toHaveLength(s.blocks.length);
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

describe('v2 → v3 width migration', () => {
    // The same NUMBER means a different width on each grid (v2: 2 = ⅓, v3: 2 = ½), so the
    // migration must key off the version and never off the value.
    function v2File(widths: Array<number | undefined>) {
        return {
            version: 2,
            exportedAt: new Date().toISOString(),
            blocks: widths.map((w, i) => makeBlock('hr-std-optellen', { id: `w${i}`, block: w === undefined ? {} : { widthUnits: w as 1 | 2 | 4 } })),
            header: state().header,
            footer: state().footer,
            docSettings: state().docSettings,
        };
    }

    test('6 → vol, 3 → ½, 2 → ½, absent stays absent', () => {
        const migrated = migrateWorksheetFile(v2File([6, 3, 2, undefined]));
        expect(migrated.version).toBe(3);
        expect(migrated.blocks.map(b => b.widthUnits)).toEqual([4, 2, 2, undefined]);
    });

    test('parseWorksheetFile migrates a v2 file on the way in', () => {
        const parsed = parseWorksheetFile(JSON.stringify(v2File([6, 3, 2])));
        expect(parsed.version).toBe(3);
        expect(parsed.blocks.map(b => b.widthUnits)).toEqual([4, 2, 2]);
    });

    test('a v3 file is left alone (and migrating twice is a no-op)', () => {
        const v3 = { ...v2File([4, 2, 1]), version: 3 };
        const once = migrateWorksheetFile(v3);
        expect(once).toBe(v3);
        expect(migrateWorksheetFile(once).blocks.map(b => b.widthUnits)).toEqual([4, 2, 1]);
    });

    test('a width the old grid never had widens instead of overflowing', () => {
        expect(migrateWorksheetFile(v2File([5])).blocks[0].widthUnits).toBe(4);
    });
});

describe('share link', () => {
    // generationNote is UI-only feedback about the last generate; it must not survive a save.
    test('the generate note never leaves the session', () => {
        const s = state();
        const noted = { ...s, blocks: s.blocks.map(b => ({ ...b, generationNote: 'Instellingen versoepeld om genoeg oefeningen te maken: brug.' })) };
        const decoded = fileFromShare(encodeShareLink(noted));
        for (const block of decoded!.blocks) expect(block.generationNote).toBeUndefined();
    });

    test('encode → decode round-trip', () => {
        const s = state();
        const decoded = fileFromShare(encodeShareLink(s));
        expect(decoded).not.toBeNull();
        expect(decoded!.blocks).toEqual(s.blocks);
        expect(decoded!.header.titel).toBe('Rekenblad 1');
        expect(decoded!.baseSettings).toEqual(s.baseSettings);
        expect(decoded!.mode).toBe('full');
    });

    // showInstruction rides along on the block spread; no field whitelist to update, but a
    // silently dropped `false` would put the hidden title back on the receiver's sheet.
    test('a hidden opdracht title survives the round-trip', () => {
        const s = state();
        const hidden = { ...s, blocks: s.blocks.map((b, i) => (i === 1 ? { ...b, showInstruction: false } : b)) };
        const decoded = fileFromShare(encodeShareLink(hidden));
        expect(decoded!.blocks.map(b => b.showInstruction)).toEqual([undefined, false, undefined]);
    });

    // skipNumbering rides the same block spread. Dropping it would renumber the receiver's
    // sheet, which is exactly the thing the setting exists to control.
    test('a block left out of the numbering survives the round-trip', () => {
        const s = state();
        const skipped = { ...s, blocks: s.blocks.map((b, i) => (i === 1 ? { ...b, showInstruction: false as const, skipNumbering: true } : b)) };
        const decoded = fileFromShare(encodeShareLink(skipped));
        expect(decoded!.blocks.map(b => b.skipNumbering)).toEqual([undefined, true, undefined]);
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
