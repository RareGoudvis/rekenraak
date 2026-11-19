import type { CardVariant } from '../../config/eenvoudig/cards';
import type { Leerjaar } from '../../config/gradePresets';
import { VERBS, type Tense, type VerbGroup } from './verbs';
import type { FransMode, FransSettings, TenseChoice } from './questions';
import type { WordDirChoice } from './woorden';

// The Werkwoorden card (owner 2026-11-18): the pupil switches verb groups and verbs on, picks Hoe? and Richting, and
// that one pick becomes one plain card variant (leafId frans-werkwoorden, the settings in `ov`), so the Zelf choice,
// the games and Nakijken carry it as they carry the maths cards; the subject seam makes it a session type.

export const FRANS_TYPE_ID = 'frans-werkwoorden';
export const FRANS_VERB_LEAF = 'frans-werkwoorden';
// Op.stap Frans starts in leerjaar 5.
export const FRANS_GRADES: readonly Leerjaar[] = [5, 6];

export const VERB_GROUPS: readonly { group: VerbGroup; label: string }[] = [
    { group: 'onregelmatig', label: 'Onregelmatig' },
    { group: 'er', label: '-er' },
    { group: 'ir', label: '-ir' },
    { group: 're', label: '-re' },
];

/** A group's verbs in the table's order. */
export const verbsOfGroup = (group: VerbGroup): string[] => VERBS.filter(v => v.group === group).map(v => v.inf);

export const FRANS_MODES_ORDER: readonly FransMode[] = ['vervoegen', 'werkwoord', 'samen'];
export const FRANS_MODE_LABELS: Readonly<Record<FransMode, string>> = {
    vervoegen: 'Eén werkwoord vervoegen',
    werkwoord: 'Welk werkwoord?',
    samen: 'Alles samen',
};

// Richting: Nederlands → Frans as before first, the default. short = the segment text (three fit a phone).
export const FRANS_DIRS: readonly WordDirChoice[] = ['nl-fr', 'fr-nl', 'mix'];
export const FRANS_DIR_LABELS: Readonly<Record<WordDirChoice, { label: string; short: string }>> = {
    'nl-fr': { label: 'Nederlands → Frans', short: 'NL → FR' },
    'fr-nl': { label: 'Frans → Nederlands', short: 'FR → NL' },
    mix: { label: 'Door elkaar', short: 'Door elkaar' },
};

// Tijd (owner 2026-11-19): the futur proche from leerjaar 5, the passé composé in leerjaar 6; Door elkaar mixes the
// tenses of the leerjaar. Présent is the default.
export const FRANS_TENSES: readonly TenseChoice[] = ['present', 'futurProche', 'passeCompose', 'mix'];
export const FRANS_TENSE_LABELS: Readonly<Record<TenseChoice, string>> = {
    present: 'Présent', futurProche: 'Futur proche', passeCompose: 'Passé composé', mix: 'Door elkaar',
};

/** The tenses a leerjaar plays (Door elkaar mixes exactly these). */
export const tensesForGrade = (grade: Leerjaar): Tense[] => (grade >= 6 ? ['present', 'futurProche', 'passeCompose'] : ['present', 'futurProche']);

/** The Tijd row of a leerjaar: its tenses, then Door elkaar. */
export const tenseChoicesForGrade = (grade: Leerjaar): TenseChoice[] => [...tensesForGrade(grade), 'mix'];

/** A remembered tense this leerjaar does not offer (passé composé in leerjaar 5) plays the présent. */
export const tenseForGrade = (tense: TenseChoice, grade: Leerjaar): TenseChoice => (tenseChoicesForGrade(grade).includes(tense) ? tense : 'present');

export interface VerbPick {
    // The verbs switched on, in the table's order.
    verbs: readonly string[];
    mode: FransMode;
    dir: WordDirChoice;
    // Absent = présent (a pick stored before the Tijd row).
    tense?: TenseChoice;
}

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every(x => b.includes(x));

/** The verbs of a pick in words: "avoir en être", "Onregelmatig en -er", "alle werkwoorden", "7 werkwoorden". */
export function verbSelectionLabel(verbs: readonly string[]): string {
    if (sameSet(verbs, VERBS.map(v => v.inf))) return 'alle werkwoorden';
    const whole = VERB_GROUPS.filter(g => verbsOfGroup(g.group).every(v => verbs.includes(v)));
    if (whole.length && sameSet(verbs, whole.flatMap(g => verbsOfGroup(g.group)))) {
        const names = whole.map(g => g.label);
        return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} en ${names[names.length - 1]}`;
    }
    if (verbs.length <= 3) return verbs.length === 1 ? verbs[0] : `${verbs.slice(0, -1).join(', ')} en ${verbs[verbs.length - 1]}`;
    return `${verbs.length} werkwoorden`;
}

/** "avoir en être · Futur proche · Alles samen · FR → NL": what a run of this pick is called (présent unnamed). */
export const fransLabelOf = (pick: VerbPick): string => {
    const tense = pick.tense && pick.tense !== 'present' ? [pick.tense === 'mix' ? 'tijden door elkaar' : FRANS_TENSE_LABELS[pick.tense]] : [];
    return [verbSelectionLabel(pick.verbs), ...tense, FRANS_MODE_LABELS[pick.mode], FRANS_DIR_LABELS[pick.dir].short].join(' · ');
};

// A short stable tag for a verb selection (the variant id). Kept here: importing the session code would close an
// import cycle (session → kiosk → subjects → this file).
const tagOf = (verbs: readonly string[]) => {
    let h = 5381;
    for (const ch of verbs.join(',')) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0;
    return h.toString(36);
};

/** The card variant of one pick in a leerjaar: what a Zelf choice holds. The same pick always has the same id (the
 * présent keeps the id it had before the Tijd row). */
export function fransVariant(pick: VerbPick, grade: Leerjaar): CardVariant {
    const tense = tenseForGrade(pick.tense ?? 'present', grade);
    const ov: FransSettings & Record<string, unknown> = {
        tense, ...(tense === 'mix' && { tenses: tensesForGrade(grade) }), mode: pick.mode, verbs: [...pick.verbs], dir: pick.dir,
    };
    const id = `frans-ww-${pick.mode}-${pick.dir}-${tagOf(pick.verbs)}${tense === 'present' ? '' : `-${tense}${tense === 'mix' ? grade : ''}`}`;
    const label = fransLabelOf({ ...pick, tense });
    return { id, l: FRANS_MODE_LABELS[pick.mode], lj: grade, leafId: FRANS_VERB_LEAF, ov, count: null, label };
}

export const fransLeaves: readonly string[] = [FRANS_VERB_LEAF];
