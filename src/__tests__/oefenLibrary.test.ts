// @vitest-environment jsdom
import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
    loadOefenSessies, saveOefenSessie, deleteOefenSessie, renameOefenSessie, MAX_OEFEN_SESSIES,
} from '../services/persistence';
import type { OefenSessie } from '../services/oefenen/types';

const sessie = (id: string, title = 'Tafels'): OefenSessie => ({
    v: 1, id, title, createdAt: 1,
    types: [{ typeId: 'procenten', leafId: 'procenten-nemen', label: 'Percent', constraints: {}, weight: 100 }],
    mode: 'afwisselen', allowRepeatType: false, testMode: false, statsLocked: false,
});

describe('oefensessie library', () => {
    beforeEach(() => localStorage.clear());

    test('save / list / rename / delete', () => {
        saveOefenSessie(sessie('a'));
        saveOefenSessie(sessie('b', 'Procenten'));
        expect(loadOefenSessies().map(e => e.id).sort()).toEqual(['a', 'b']);
        renameOefenSessie('a', '  Nieuwe naam ');
        expect(loadOefenSessies().find(e => e.id === 'a')?.name).toBe('Nieuwe naam');
        deleteOefenSessie('a');
        expect(loadOefenSessies().map(e => e.id)).toEqual(['b']);
    });

    test('saving the same id replaces the entry and keeps its name', () => {
        saveOefenSessie(sessie('a'), 'Mijn naam');
        saveOefenSessie({ ...sessie('a'), mode: 'willekeurig' });
        const list = loadOefenSessies();
        expect(list).toHaveLength(1);
        expect(list[0].name).toBe('Mijn naam');
        expect(list[0].sessie.mode).toBe('willekeurig');
    });

    test('caps the library at the maximum, dropping the oldest', () => {
        for (let i = 0; i < MAX_OEFEN_SESSIES + 3; i++) saveOefenSessie(sessie(`s${i}`));
        const list = loadOefenSessies();
        expect(list).toHaveLength(MAX_OEFEN_SESSIES);
        expect(list.some(e => e.id === `s${MAX_OEFEN_SESSIES + 2}`)).toBe(true);
        expect(list.some(e => e.id === 's0')).toBe(false);
    });

    test('a full browser quota returns null instead of throwing', () => {
        const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
        expect(saveOefenSessie(sessie('a'))).toBeNull();
        spy.mockRestore();
    });

    test('garbage in storage reads as an empty library', () => {
        localStorage.setItem('rekenraak_oefen_sessies_v1', '{nope');
        expect(loadOefenSessies()).toEqual([]);
        localStorage.setItem('rekenraak_oefen_sessies_v1', JSON.stringify([{ id: 1 }, null]));
        expect(loadOefenSessies()).toEqual([]);
    });
});
