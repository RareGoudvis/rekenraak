// @vitest-environment jsdom
import { describe, test, expect, beforeEach } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PUPIL_KEYS, RUN_PREFIX, TEACHER_KEYS_UNDER_RUN_PREFIX, isPupilKey, wipePupilData } from '../oefenen/zelf/pupilStorage';
import { GRADE_KEY, saveGrade } from '../oefenen/zelf/zelfGrade';
import { RANGE_KEY, TAFELS_KEY, WAY_KEY, saveRange, saveTafels, saveWay } from '../oefenen/zelf/zelfPicks';
import { SOUND_KEY } from '../oefenen/spelen/sound';
import { MUSIC_KEY } from '../oefenen/spelen/music';
import { OPTIONS_KEY } from '../oefenen/spelen/skins/options';
import { PRENT_KEY, rememberPrent } from '../oefenen/spelen/skins/prent/pick';
import { GRIJP_KEY } from '../oefenen/spelen/skins/grijp/pick';
import { FRITUUR_BEST_KEY } from '../oefenen/spelen/skins/frituur/records';
import { RACE_KM_KEY, RACE_RECORDS_KEY } from '../oefenen/spelen/skins/race/records';
import { SLALOM_RECORDS_KEY } from '../oefenen/spelen/skins/slalom/records';
import { VOETBAL_BEST_KEY } from '../oefenen/spelen/skins/voetbal/match';
import { oefenStorageKey, saveRun } from '../services/oefenen/stats';
import type { OefenRun } from '../services/oefenen/types';
import { FRANS_OPTIONS_KEY, cleanPicks, savePicks } from '../talen/frans/fransPicks';

// The teacher app's keys on the same origin (worksheets, autosave, presets, Bordmodus, onboarding).
// Pinned: a new key anywhere in src must be put here or in PUPIL_KEYS before the gate passes.
const TEACHER_KEYS = [
    'rekenraak_autosave_v1', 'rekenraak_presets_v1', 'rekenraak_page_designs_v1', 'rekenraak_oefen_sessies_v1',
    'rekenraak_default_mode_v1', 'rekenraak_eenvoudig_banner_seen_v1', 'rekenraak_print_hint_seen_v1',
    'rekenraak_release_seen_v1', 'rekenraak_upgrade_seen_v1', 'rekenraak_tryout_seen_v1', 'rekenraak_tour_seen_v1',
    'rekenraak_sidebar_preview', 'rekenraak_small_screen_teacher',
    'rekenraak_board_autosave_v1', 'rekenraak_board_colors_v1', 'rekenraak_board_defaults_v1', 'rekenraak_board_favorites_v1',
    'rekenraak_board_geldpalet_v1', 'rekenraak_board_ink_v1', 'rekenraak_board_names_v1', 'rekenraak_board_presets_v1',
    'rekenraak_board_saved_id_v1', 'rekenraak_board_werksets_v1',
];
// Teacher keys built from a prefix (BetaStrip per module, firstRun per flag).
const TEACHER_PREFIXES = ['rekenraak_betastrip_', 'rekenraak_firstrun_'];

const SRC = join(__dirname, '..');
const sourceKeys = (): Map<string, string> => {
    const found = new Map<string, string>();
    for (const f of readdirSync(SRC, { recursive: true }) as string[]) {
        if (!/\.(ts|tsx)$/.test(f) || /__tests__/.test(f)) continue;
        for (const m of readFileSync(join(SRC, f), 'utf8').matchAll(/['"`](rekenraak_[A-Za-z0-9_-]*)/g)) found.set(m[1], f);
    }
    return found;
};

const run = (): OefenRun => ({ index: 0, done: false, stats: { startedAt: 0, perType: {}, history: [] } });

beforeEach(() => localStorage.clear());

describe('pupil storage keys (Over › Wis mijn gegevens)', () => {
    test('every rekenraak_ key in src is either a pupil key or a teacher key', () => {
        const unknown = [...sourceKeys()].filter(([k]) =>
            !PUPIL_KEYS.includes(k) && k !== RUN_PREFIX && !TEACHER_KEYS.includes(k) && !TEACHER_PREFIXES.includes(k));
        expect(unknown, 'classify these keys in pupilStorage.ts PUPIL_KEYS or in TEACHER_KEYS here').toEqual([]);
    });

    test('every listed key is still written somewhere (no stale entries)', () => {
        const keys = sourceKeys();
        const stale = [...PUPIL_KEYS, ...TEACHER_KEYS].filter(k => !keys.has(k));
        expect(stale).toEqual([]);
    });

    test('the list matches the modules that write them', () => {
        expect([...PUPIL_KEYS].sort()).toEqual([
            GRADE_KEY, RANGE_KEY, TAFELS_KEY, WAY_KEY, FRANS_OPTIONS_KEY, SOUND_KEY, MUSIC_KEY, OPTIONS_KEY, PRENT_KEY, GRIJP_KEY,
            FRITUUR_BEST_KEY, RACE_RECORDS_KEY, RACE_KM_KEY, SLALOM_RECORDS_KEY, VOETBAL_BEST_KEY,
            'rekenraak_spookhuis_plek_v1', 'rekenraak_tovenaar_arena_v1', 'rekenraak_tutor_last_v1',
        ].sort());
        expect(RUN_PREFIX).toBe(oefenStorageKey(''));
    });

    test('runs of every session kind are pupil data; the teacher library under the same prefix is not', () => {
        for (const id of ['zelf-1a2b3c', 'zelf-qr9z8y', 'abcd1234']) expect(isPupilKey(oefenStorageKey(id))).toBe(true);
        for (const k of TEACHER_KEYS_UNDER_RUN_PREFIX) expect(isPupilKey(k)).toBe(false);
        expect(isPupilKey('rekenraak_oefen_')).toBe(false);
        expect(isPupilKey('rekenraak_oefen_HAS CAPS')).toBe(false);
        for (const k of TEACHER_KEYS) expect(isPupilKey(k)).toBe(false);
    });

    test('a wipe clears the pupil data and leaves every teacher key (and anything else) alone', () => {
        for (const k of TEACHER_KEYS) localStorage.setItem(k, 'teacher');
        for (const p of TEACHER_PREFIXES) localStorage.setItem(`${p}oefenmodus`, 'teacher');
        localStorage.setItem('other_site_key', 'x');
        for (const k of PUPIL_KEYS) localStorage.setItem(k, 'pupil');
        // The real writers too, so a renamed key in a module is caught here.
        saveGrade(3);
        saveRange(3, 1000);
        saveTafels(3, [2, 5]);
        saveWay('spelen');
        savePicks(cleanPicks({}));
        rememberPrent('kasteel');
        expect(saveRun('zelf-abc123', run())).toBe(true);
        expect(saveRun('ab12cd34', run())).toBe(true);
        localStorage.setItem(oefenStorageKey('zelf-qrxyz'), '{}');

        const keepCount = TEACHER_KEYS.length + TEACHER_PREFIXES.length + 1;
        const pupilCount = localStorage.length - keepCount;
        expect(wipePupilData()).toBe(pupilCount);
        expect(localStorage.length).toBe(keepCount);
        for (const k of TEACHER_KEYS) expect(localStorage.getItem(k)).toBe('teacher');
        expect(localStorage.getItem('rekenraak_autosave_v1')).toBe('teacher');
        expect(localStorage.getItem('rekenraak_oefen_sessies_v1')).toBe('teacher');
        expect(localStorage.getItem('other_site_key')).toBe('x');
    });

    test('a blocked storage wipes nothing and does not throw', () => {
        const broken = { get length(): number { throw new Error('blocked'); } } as unknown as Storage;
        expect(wipePupilData(broken)).toBe(0);
    });
});
