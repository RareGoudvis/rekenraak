import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import {
    WORKSHEET_FORMAT_VERSION,
    parseWorksheetFile,
    migrateWorksheetFile,
    openWorksheetFromPicker,
    saveWorksheetToFile,
    isPickerAbort,
    encodeShareLink,
    decodeShareHash,
    loadPageDesigns,
    savePageDesign,
    renamePageDesign,
    deletePageDesign,
    MAX_PAGE_DESIGNS,
    type SerialisableState,
    type CurriculumLock,
} from '../services/persistence';
import type { FooterData } from '../services/math/types';
import type { DocSettings } from '../store/useWorksheetStore';
import { DEFAULT_BASE } from '../config/baseSettings';
import { REGISTRY } from '../config/exerciseRegistry';
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

// Chromium's File System Access API: "Bewaar bestand" writes back into the file that was
// opened or saved before, without the picker; other browsers keep the download.
describe('save to the same worksheet file', () => {
    afterEach(() => vi.unstubAllGlobals());

    test('saves to a chosen file, then overwrites the same file without reopening the picker', async () => {
        const worksheet = state();
        const written: string[] = [];
        const write = vi.fn(async (content: string) => { written.push(content); });
        const close = vi.fn(async () => {});
        const handle = { name: 'rekenblad.rekenraak', createWritable: vi.fn(async () => ({ write, close })) };
        const picker = vi.fn(async () => handle);
        vi.stubGlobal('window', { showSaveFilePicker: picker });

        const first = await saveWorksheetToFile(worksheet);
        expect(first).toEqual({ handle, downloaded: false });
        expect(picker).toHaveBeenCalledTimes(1);
        expect(JSON.parse(written[0]).version).toBe(WORKSHEET_FORMAT_VERSION);
        expect(JSON.parse(written[0]).blocks).toEqual(JSON.parse(JSON.stringify(worksheet.blocks)));
        expect(close).toHaveBeenCalledTimes(1);

        await saveWorksheetToFile({ ...worksheet, header: { ...worksheet.header, titel: 'Bijgewerkt' } }, first.handle);
        expect(picker).toHaveBeenCalledTimes(1);
        expect(JSON.parse(written[1]).header.titel).toBe('Bijgewerkt');
    });

    test('a file saved through a handle reopens through the same handle', async () => {
        const worksheet = state();
        let contents = '';
        const handle = {
            name: 'rekenblad.rekenraak',
            createWritable: async () => ({ write: async (c: string) => { contents = c; }, close: async () => {} }),
            getFile: async () => ({ text: async () => contents }),
        };
        vi.stubGlobal('window', { showSaveFilePicker: async () => handle, showOpenFilePicker: async () => [handle] });

        await saveWorksheetToFile(worksheet);
        const opened = await openWorksheetFromPicker();
        expect(opened?.handle).toBe(handle);
        expect(opened?.file).toMatchObject({
            version: WORKSHEET_FORMAT_VERSION,
            blocks: JSON.parse(JSON.stringify(worksheet.blocks)),
            header: worksheet.header,
            baseSettings: worksheet.baseSettings,
        });
    });

    test('an invalid file is rejected before its handle is kept', async () => {
        vi.stubGlobal('window', { showOpenFilePicker: async () => [{ getFile: async () => ({ text: async () => 'not JSON' }) }] });
        await expect(openWorksheetFromPicker()).rejects.toThrow('Bestand is geen geldige JSON.');
    });

    test('without the API, open returns null and save downloads', async () => {
        const click = vi.fn();
        let blob: Blob | undefined;
        vi.stubGlobal('window', {});
        vi.stubGlobal('document', { createElement: () => ({ click, style: {} }), body: { appendChild: vi.fn(), removeChild: vi.fn() } });
        vi.stubGlobal('URL', { createObjectURL: (b: Blob) => { blob = b; return 'blob:x'; }, revokeObjectURL: vi.fn() });
        expect(await openWorksheetFromPicker()).toBeNull();
        expect(await saveWorksheetToFile(state())).toEqual({ handle: null, downloaded: true });
        expect(click).toHaveBeenCalledOnce();
        expect(parseWorksheetFile(await blob!.text()).version).toBe(WORKSHEET_FORMAT_VERSION);
    });

    test('a cancelled picker is an abort, not a failure', async () => {
        const abort = Object.assign(new Error('The user aborted a request.'), { name: 'AbortError' });
        vi.stubGlobal('window', { showSaveFilePicker: async () => { throw abort; } });
        const err = await saveWorksheetToFile(state()).catch(e => e);
        expect(isPickerAbort(err)).toBe(true);
        expect(isPickerAbort(new Error('disk full'))).toBe(false);
    });
});

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

    // The writing-space token must be invisible to sheets saved before it existed: a file
    // with no answerSpace has to come back with no answerSpace (absent = 18 = today's px),
    // and one that carries the setting has to keep it, sheet-wide and per block.
    test('answerSpace: absent stays absent, set survives the round-trip', () => {
        const s = state();
        const docSettings = { ...s.docSettings } as DocSettings;
        delete docSettings.answerSpace;
        const file = (doc: DocSettings, blocks: typeof s.blocks) => JSON.stringify({
            version: WORKSHEET_FORMAT_VERSION,
            exportedAt: new Date().toISOString(),
            mode: 'full',
            blocks, header: s.header, footer: s.footer,
            docSettings: doc, baseSettings: s.baseSettings, selectedGrade: s.selectedGrade,
        });

        const old = parseWorksheetFile(file(docSettings, s.blocks));
        expect(old.docSettings.answerSpace).toBeUndefined();
        expect(old.blocks.every(b => b.constraints?.answerSpace === undefined)).toBe(true);

        const withSpace = s.blocks.map((b, i) => (i === 0 ? { ...b, constraints: { ...b.constraints, answerSpace: 28 } } : b));
        const set = parseWorksheetFile(file({ ...docSettings, answerSpace: 24 }, withSpace));
        expect(set.docSettings.answerSpace).toBe(24);
        expect(set.blocks[0].constraints?.answerSpace).toBe(28);
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
        [JSON.stringify({ version: 0, blocks: [], header: {}, footer: {}, docSettings: {} }), 'Versie-veld'],
        [JSON.stringify({ version: 2.5, blocks: [], header: {}, footer: {}, docSettings: {} }), 'Versie-veld'],
        [JSON.stringify({ version: -1, blocks: [], header: {}, footer: {}, docSettings: {} }), 'Versie-veld'],
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
        expect(migrated.version).toBe(4);
        expect(migrated.blocks.map(b => b.widthUnits)).toEqual([4, 2, 2, undefined]);
    });

    test('parseWorksheetFile migrates a v2 file on the way in', () => {
        const parsed = parseWorksheetFile(JSON.stringify(v2File([6, 3, 2])));
        expect(parsed.version).toBe(4);
        expect(parsed.blocks.map(b => b.widthUnits)).toEqual([4, 2, 2]);
    });

    test('a v3 file keeps its widths, a v4 file is left alone (migrating twice is a no-op)', () => {
        const v3 = { ...v2File([4, 2, 1]), version: 3 };
        const once = migrateWorksheetFile(v3);
        expect(once.blocks).toBe(v3.blocks);
        expect(migrateWorksheetFile(once)).toBe(once);
        const v4 = { ...v2File([4, 2, 1]), version: 4 };
        expect(migrateWorksheetFile(v4)).toBe(v4);
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

    // itemNumbering rides the same block spread (no format bump). A sheet whose rows are
    // '1) …' must come back numbered, or the teacher's printed key no longer matches.
    test('the per-exercise numbering survives the round-trip', () => {
        const s = state();
        const numbered = { ...s, blocks: s.blocks.map((b, i) => (i === 1 ? { ...b, itemNumbering: 'letter' as const } : b)) };
        const decoded = fileFromShare(encodeShareLink(numbered));
        expect(decoded!.blocks.map(b => b.itemNumbering)).toEqual([undefined, 'letter', undefined]);
    });

    // The per-block width fit is presentation, and presentation is exactly what a teacher
    // expects to find again in a shared or reopened sheet: a block the packer would widen
    // must come back shrunk, not widened, or the receiver's layout silently differs.
    test('fitToWidth round-trips through a share link and a template', () => {
        const s = state();
        const withFit = { ...s, blocks: s.blocks.map((b, i) => (i === 0 ? { ...b, widthUnits: 1 as const, constraints: { ...b.constraints, fitToWidth: true } } : b)) };
        const decoded = fileFromShare(encodeShareLink(withFit));
        expect(decoded!.blocks.map(b => b.constraints.fitToWidth)).toEqual([true, undefined, undefined]);
        expect(decoded!.blocks[0].widthUnits).toBe(1);
        const template = fileFromShare(encodeShareLink(withFit, { template: true }));
        expect(template!.blocks[0].constraints.fitToWidth).toBe(true);
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

    // stripBlock used to clear a hardcoded 8 of the 35 exercise fields, so a template of
    // any other type shipped the exercises the teacher meant to strip.
    test('template mode empties every registry exercise field, for every typeId', () => {
        const fields = [...new Set(Object.values(REGISTRY).map(def => def.exerciseField as string))];
        const blocks = Object.keys(REGISTRY).map((typeId, i) => {
            const block = makeBlock(typeId, { id: `all${i}` });
            return { ...block, [REGISTRY[typeId].exerciseField]: generateFor(block) };
        });
        // Guard the guard: the source blocks must actually hold what the template strips.
        expect(blocks.some(b => ((b as unknown as Record<string, unknown[]>)[REGISTRY[b.typeId].exerciseField] ?? []).length > 0)).toBe(true);

        const template = fileFromShare(encodeShareLink({ ...state(), blocks }, { template: true }));
        for (const block of template!.blocks) {
            for (const field of fields) {
                const value = (block as unknown as Record<string, unknown>)[field];
                expect(value ?? [], `${block.typeId}.${field}`).toEqual([]);
            }
        }
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

describe('page-design templates', () => {
    // This suite runs in node: a Map-backed stand-in for localStorage, with a switch that
    // makes every write throw the way a full browser storage does.
    let store: Map<string, string>;
    let full: boolean;
    const g = globalThis as unknown as Record<string, unknown>;
    beforeEach(() => {
        store = new Map();
        full = false;
        g.localStorage = {
            getItem: (k: string) => store.get(k) ?? null,
            setItem: (k: string, v: string) => { if (full) throw new DOMException('full', 'QuotaExceededError'); store.set(k, v); },
            removeItem: (k: string) => { store.delete(k); },
        };
    });
    afterEach(() => { delete g.localStorage; vi.useRealTimers(); });

    const design = (over: Partial<DocSettings> = {}) => ({ ...state().docSettings, ...over });

    test('save then load round-trips the docSettings, never blocks', () => {
        const saved = savePageDesign('  Kader-blad  ', design({ headerStyle: 'kader', blockSpacing: 20 }));
        expect(saved).not.toBeNull();
        const list = loadPageDesigns();
        expect(list).toHaveLength(1);
        expect(list[0].name).toBe('Kader-blad');
        expect(list[0].docSettings).toMatchObject({ headerStyle: 'kader', blockSpacing: 20 });
        expect(Object.keys(list[0]).sort()).toEqual(['docSettings', 'id', 'name', 'savedAt']);
    });

    test('an empty name becomes Naamloos, a long one is cut at 80', () => {
        savePageDesign('   ', design());
        savePageDesign('x'.repeat(120), design());
        const names = loadPageDesigns().map(d => d.name);
        expect(names).toContain('Naamloos');
        expect(names.some(n => n.length === 80)).toBe(true);
    });

    test('rename and delete touch only their own entry', () => {
        const a = savePageDesign('A', design())!;
        const b = savePageDesign('B', design())!;
        expect(renamePageDesign(a.id, 'A2')).toBe(true);
        expect(loadPageDesigns().map(d => d.name).sort()).toEqual(['A2', 'B']);
        deletePageDesign(a.id);
        expect(loadPageDesigns().map(d => d.id)).toEqual([b.id]);
    });

    test(`keeps the newest ${MAX_PAGE_DESIGNS}`, () => {
        vi.useFakeTimers();
        for (let i = 0; i < MAX_PAGE_DESIGNS + 3; i++) {
            vi.setSystemTime(new Date(Date.UTC(2026, 9, 1, 0, i)));
            savePageDesign(`D${i}`, design());
        }
        const names = loadPageDesigns().map(d => d.name);
        expect(names).toHaveLength(MAX_PAGE_DESIGNS);
        expect(names[0]).toBe('D3');
        expect(names[names.length - 1]).toBe(`D${MAX_PAGE_DESIGNS + 2}`);
    });

    test('a full storage returns null and keeps the list as it was', () => {
        savePageDesign('Bestaand', design());
        full = true;
        expect(savePageDesign('Nieuw', design())).toBeNull();
        expect(renamePageDesign(loadPageDesigns()[0].id, 'Anders')).toBe(false);
        expect(loadPageDesigns().map(d => d.name)).toEqual(['Bestaand']);
    });

    test('garbage in storage loads as an empty or filtered list', () => {
        store.set('rekenraak_page_designs_v1', '{not json');
        expect(loadPageDesigns()).toEqual([]);
        store.set('rekenraak_page_designs_v1', JSON.stringify([{ id: 'x', name: 'ok', savedAt: '', docSettings: {} }, { id: 1 }, null]));
        expect(loadPageDesigns().map(d => d.id)).toEqual(['x']);
    });
});
