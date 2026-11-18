import { oefenStorageKey } from '../../services/oefenen/stats';

// What "Wis mijn gegevens" (Over page) clears: every localStorage key the pupil pages write (kind.html,
// oefenen.html, tutor.html). The teacher app shares this origin (worksheets, autosave, Bordmodus): never touched.
// SYNC: pupilStorage.test.ts scans src for every rekenraak_ key literal and fails on one that is in neither list.
export const PUPIL_KEYS: readonly string[] = [
    // zelf/zelfGrade.ts, zelf/zelfPicks.ts: the leerjaar and the last choices
    'rekenraak_zelf_leerjaar_v1',
    'rekenraak_zelf_tot_v1',
    'rekenraak_zelf_tafels_v1',
    'rekenraak_zelf_weg_v1',
    // spelen/sound.ts, spelen/music.ts, spelen/skins/options.ts: sound, music and each game's options
    'rekenraak_spelen_geluid_v1',
    'rekenraak_spelen_muziek_v1',
    'rekenraak_spelen_opties_v1',
    // The picture / machine / place a game showed last, so the next round differs (prent, grijp, spookhuis, tovenaarsduel)
    'rekenraak_spelen_prent_v1',
    'rekenraak_spelen_grijp_v1',
    'rekenraak_spookhuis_plek_v1',
    'rekenraak_tovenaar_arena_v1',
    // Best scores (race, slalom, frituur, voetbal records)
    'rekenraak_spel_race',
    'rekenraak_spel_race_km',
    'rekenraak_spel_slalom',
    'rekenraak_spel_frituur',
    'rekenraak_spel_voetbal',
    // tutor/TutorApp.tsx: the last sheet opened in the Stappenhulp
    'rekenraak_tutor_last_v1',
];

// The pupil's runs, one key per session id (stats.ts): zelf-…, zelf-qr… and a teacher link's id.
export const RUN_PREFIX = oefenStorageKey('');
// The teacher's Oefenmodus library (persistence.ts) shares the runs' prefix and is a valid session id too.
export const TEACHER_KEYS_UNDER_RUN_PREFIX: readonly string[] = ['rekenraak_oefen_sessies_v1'];
// SYNC: ID_RE in services/oefenen/session.ts.
const SESSION_ID = /^[a-z0-9_-]{1,40}$/;

export const isPupilKey = (key: string): boolean =>
    PUPIL_KEYS.includes(key)
    || (key.startsWith(RUN_PREFIX) && !TEACHER_KEYS_UNDER_RUN_PREFIX.includes(key) && SESSION_ID.test(key.slice(RUN_PREFIX.length)));

/** Removes every pupil key from `storage`; returns how many went (0 when storage is blocked). */
export function wipePupilData(storage: Storage | undefined = globalThis.localStorage): number {
    try {
        if (!storage) return 0;
        const keys: string[] = [];
        for (let i = 0; i < storage.length; i++) {
            const k = storage.key(i);
            if (k !== null && isPupilKey(k)) keys.push(k);
        }
        keys.forEach(k => storage.removeItem(k));
        return keys.length;
    } catch { return 0; }
}
