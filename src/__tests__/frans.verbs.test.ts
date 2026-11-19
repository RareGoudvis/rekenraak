import { describe, expect, test } from 'vitest';
import { PERSONS, VERBS, VERB_BY_INF, formOf, presentForms } from '../talen/frans/verbs';

// The regular verbs are made by rule; this hand-written table is what the rule must give (présent, je … ils).
const REGULAR_PRESENT: Record<string, readonly string[]> = {
    parler: ['parle', 'parles', 'parle', 'parlons', 'parlez', 'parlent'],
    aimer: ['aime', 'aimes', 'aime', 'aimons', 'aimez', 'aiment'],
    jouer: ['joue', 'joues', 'joue', 'jouons', 'jouez', 'jouent'],
    regarder: ['regarde', 'regardes', 'regarde', 'regardons', 'regardez', 'regardent'],
    écouter: ['écoute', 'écoutes', 'écoute', 'écoutons', 'écoutez', 'écoutent'],
    chanter: ['chante', 'chantes', 'chante', 'chantons', 'chantez', 'chantent'],
    danser: ['danse', 'danses', 'danse', 'dansons', 'dansez', 'dansent'],
    manger: ['mange', 'manges', 'mange', 'mangeons', 'mangez', 'mangent'],
    habiter: ['habite', 'habites', 'habite', 'habitons', 'habitez', 'habitent'],
    travailler: ['travaille', 'travailles', 'travaille', 'travaillons', 'travaillez', 'travaillent'],
    chercher: ['cherche', 'cherches', 'cherche', 'cherchons', 'cherchez', 'cherchent'],
    donner: ['donne', 'donnes', 'donne', 'donnons', 'donnez', 'donnent'],
    finir: ['finis', 'finis', 'finit', 'finissons', 'finissez', 'finissent'],
    choisir: ['choisis', 'choisis', 'choisit', 'choisissons', 'choisissez', 'choisissent'],
    réussir: ['réussis', 'réussis', 'réussit', 'réussissons', 'réussissez', 'réussissent'],
    vendre: ['vends', 'vends', 'vend', 'vendons', 'vendez', 'vendent'],
    attendre: ['attends', 'attends', 'attend', 'attendons', 'attendez', 'attendent'],
    répondre: ['réponds', 'réponds', 'répond', 'répondons', 'répondez', 'répondent'],
};

// The irregular ones are tables in verbs.ts; pinned here too, so an edit there is a deliberate one.
const IRREGULAR_PRESENT: Record<string, readonly string[]> = {
    être: ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'],
    avoir: ['ai', 'as', 'a', 'avons', 'avez', 'ont'],
    aller: ['vais', 'vas', 'va', 'allons', 'allez', 'vont'],
    faire: ['fais', 'fais', 'fait', 'faisons', 'faites', 'font'],
    boire: ['bois', 'bois', 'boit', 'buvons', 'buvez', 'boivent'],
    venir: ['viens', 'viens', 'vient', 'venons', 'venez', 'viennent'],
    prendre: ['prends', 'prends', 'prend', 'prenons', 'prenez', 'prennent'],
    pouvoir: ['peux', 'peux', 'peut', 'pouvons', 'pouvez', 'peuvent'],
    vouloir: ['veux', 'veux', 'veut', 'voulons', 'voulez', 'veulent'],
    voir: ['vois', 'vois', 'voit', 'voyons', 'voyez', 'voient'],
    dire: ['dis', 'dis', 'dit', 'disons', 'dites', 'disent'],
    mettre: ['mets', 'mets', 'met', 'mettons', 'mettez', 'mettent'],
    savoir: ['sais', 'sais', 'sait', 'savons', 'savez', 'savent'],
};

describe('Frans verbs, présent', () => {
    test('the 31 agreed verbs, each once (owner 2026-11-18)', () => {
        expect(VERBS.map(v => v.inf)).toEqual([
            'être', 'avoir', 'aller', 'faire', 'boire', 'venir', 'prendre', 'pouvoir', 'vouloir', 'voir', 'dire', 'mettre', 'savoir',
            'parler', 'aimer', 'jouer', 'regarder', 'écouter', 'chanter', 'danser', 'manger', 'habiter', 'travailler', 'chercher', 'donner',
            'finir', 'choisir', 'réussir', 'vendre', 'attendre', 'répondre',
        ]);
        expect(new Set(VERBS.map(v => v.inf)).size).toBe(31);
    });

    test.each(Object.entries(REGULAR_PRESENT))('%s follows its group rule exactly', (inf, forms) => {
        const verb = VERB_BY_INF.get(inf)!;
        expect(verb.present, 'a regular verb has no table of its own').toBeUndefined();
        expect([...presentForms(verb)]).toEqual(forms);
    });

    test.each(Object.entries(IRREGULAR_PRESENT))('%s is written out', (inf, forms) => {
        const verb = VERB_BY_INF.get(inf)!;
        expect(verb.group).toBe('onregelmatig');
        expect([...presentForms(verb)]).toEqual(forms);
    });

    test('every verb is in one of the two tables, accents exact (é è ê ç, no stray letters)', () => {
        expect(Object.keys({ ...REGULAR_PRESENT, ...IRREGULAR_PRESENT }).sort()).toEqual(VERBS.map(v => v.inf).sort());
        for (const v of VERBS) for (const f of presentForms(v)) expect(f).toMatch(/^[a-zéèêç]+$/);
    });

    test('every verb has six Dutch forms, singular and plural apart (zij heeft / zij hebben)', () => {
        for (const v of VERBS) {
            const nl = v.nl.present;
            expect(nl).toHaveLength(6);
            expect(nl[3]).toBe(v.nl.inf);
            expect(nl[4]).toBe(v.nl.inf);
            expect(nl[5]).toBe(v.nl.inf);
            expect(nl[2], `${v.inf}: hij/zij must differ from zij (mv)`).not.toBe(nl[5]);
        }
    });

    test('the présent through formOf (the other tenses: frans.tijden.test.ts)', () => {
        const avoir = VERB_BY_INF.get('avoir')!;
        expect(PERSONS.map(p => formOf(avoir, 'present', p))).toEqual(['ai', 'as', 'a', 'avons', 'avez', 'ont']);
    });
});
