// Quick-pick opdracht-titel (instruction) texts so teachers click instead of retype.
// Generic verbs cover most blocks; suggestionsFor() floats a few type-specific lines first.

import type { BlockConstraints } from '../services/math/constraintTypes';
import { LEAF_BY_ID, type InstructionFn } from './appstructure';

const STANDARD_INSTRUCTIONS: string[] = [
    'Los op.',
    'Reken uit.',
    'Vul in.',
    'Kleur.',
    'Teken.',
    'Schrijf op.',
    'Verbind.',
    'Rond af.',
    'Vergelijk.',
    'Zet in volgorde.',
    'Splits.',
];

// typeId-prefix → instruction lines surfaced at the top of the list for that family.
// The FIRST line of the first matching entry is also the block's default instruction
// (see defaultInstructionFor), so entry order matters: put the more specific prefix
// above the broader one, since every startsWith match contributes.
const TYPE_SUGGESTIONS: Array<{ match: string; texts: string[] }> = [
    { match: 'klok', texts: ['Hoe laat is het?', 'Teken de wijzers.'] },
    { match: 'geld-tekenen', texts: ['Teken het bedrag.'] },
    { match: 'geld-wissel', texts: ['Wissel het bedrag.'] },
    { match: 'geld-teruggeven', texts: ['Hoeveel krijg je terug?'] },
    { match: 'geld-rekenen', texts: ['Reken uit.'] },
    { match: 'geld', texts: ['Hoeveel geld?', 'Teken het bedrag.'] },
    { match: 'breuken-bewerken', texts: ['Reken uit.'] },
    { match: 'breuken-rangschikken', texts: ['Zet in volgorde.'] },
    { match: 'breuken', texts: ['Kleur de breuk.', 'Welke breuk?'] },
    { match: 'splitsen', texts: ['Splits.'] },
    { match: 'ordenen', texts: ['Zet in volgorde.'] },
    { match: 'afronden', texts: ['Rond af.'] },
    { match: 'vergelijken', texts: ['Vul in: <, > of =.'] },
    { match: 'romeinse', texts: ['Schrijf in Romeinse cijfers.'] },
    { match: 'lengte-meten', texts: ['Meet.'] },
    { match: 'meten', texts: ['Meet.'] },

    // Arithmetic: the four operations, column arithmetic and the chain/order families.
    // The hoofdrekenen typeIds are prefixed `hr-std-`; matching on the bare operation name
    // never hit, so every hoofdrekenen block started as "<leaf label>:" instead of a task.
    { match: 'hr-std-', texts: ['Reken uit.'] },
    { match: 'optellen', texts: ['Reken uit.'] },
    { match: 'aftrekken', texts: ['Reken uit.'] },
    { match: 'vermenigvuldigen', texts: ['Reken uit.'] },
    { match: 'delen', texts: ['Reken uit.'] },
    { match: 'cijferen', texts: ['Reken uit.'] },
    { match: 'rekenvolgorde', texts: ['Reken uit.'] },
    { match: 'kettingsommen', texts: ['Reken uit.'] },
    { match: 'schattend', texts: ['Schat het antwoord.'] },
    { match: 'controleren', texts: ['Controleer.'] },

    // Number sense.
    { match: 'mab-tekenen', texts: ['Teken het getal.'] },
    { match: 'mab-herkennen', texts: ['Welk getal?'] },
    { match: 'getallenas', texts: ['Vul aan.'] },
    { match: 'getallenrijen', texts: ['Vul de rij aan.'] },
    { match: 'getalpatronen', texts: ['Zet de rij verder.'] },
    { match: 'plaatswaarde', texts: ['Vul in.'] },
    { match: 'even-oneven', texts: ['Kleur.'] },
    { match: 'deelbaarheid-kleuren', texts: ['Kleur de veelvouden.'] },
    { match: 'deelbaarheid', texts: ['Vul in.'] },
    { match: 'getalfunctie', texts: ['Vul in.'] },
    { match: 'verbanden', texts: ['Vul in.'] },
    { match: 'procenten', texts: ['Reken uit.'] },

    // Measurement.
    { match: 'herleidingen', texts: ['Zet om.'] },
    { match: 'maateenheid', texts: ['Vul de juiste eenheid in.'] },
    { match: 'temperatuur', texts: ['Lees af.'] },
    { match: 'weegschaal', texts: ['Lees af.'] },
    { match: 'tijdsduur', texts: ['Reken uit.'] },
    { match: 'kalender', texts: ['Vul in.'] },
    { match: 'omtrek', texts: ['Bereken de omtrek.'] },
    { match: 'oppervlakte', texts: ['Bereken de oppervlakte.'] },

    // Geometry.
    { match: 'vormleer', texts: ['Vul in.'] },
];

// The leaf's own line first (its CURRENT resolved wording, for a function-valued
// instruction), then the type-specific lines (deduped), then the generic verbs.
export function suggestionsFor(typeId: string, leafId?: string, constraints?: BlockConstraints): string[] {
    const specific = TYPE_SUGGESTIONS.filter((s) => typeId.startsWith(s.match)).flatMap((s) => s.texts);
    const leaf = leafId ? LEAF_BY_ID[leafId] : undefined;
    const leafLine = leaf?.instruction
        ? resolveInstruction(leaf.instruction, leaf.typeId, leaf.label, constraints ?? {})
        : undefined;
    const ordered = leafLine ? [leafLine, ...specific] : specific;
    return [...new Set([...ordered, ...STANDARD_INSTRUCTIONS])];
}

/**
 * The instruction a freshly added block starts with. A block used to open with its own
 * type name plus a colon ("Aftrekken:"), which names a category rather than telling a
 * child what to do. Where the family has a real instruction we use it; where it does
 * not, the old label fallback still applies, so nothing ends up blank.
 */
export function defaultInstructionFor(typeId: string, label: string): string {
    const match = TYPE_SUGGESTIONS.find((s) => typeId.startsWith(s.match));
    return match ? match.texts[0] : `${label}:`;
}

// Resolves a leaf's `instruction` (a per-leaf override, string or a function of its
// merged constraints, from appstructure.ts) down to one final line — else the typeId-level
// fallback above. The single choke point addBlockFromType, worksheetTemplates and
// CurriculumBuilderModal (which must freeze a function to plain text for a share link) all
// go through, so "what does a fresh block open with" is answered in exactly one place.
export function resolveInstruction(
    instruction: string | InstructionFn | undefined,
    typeId: string,
    label: string,
    constraints: BlockConstraints,
): string {
    if (typeof instruction === 'function') return instruction(constraints);
    if (typeof instruction === 'string' && instruction.trim()) return instruction;
    return defaultInstructionFor(typeId, label);
}
