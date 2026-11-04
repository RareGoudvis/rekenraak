import { describe, test, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { REGISTRY } from '../config/exerciseRegistry';

// A config reads its max list through useMaxPresets (REGISTRY.maxPresets), never from
// RANGES itself: two copies of "which list for which settings" drift, and the grade seed
// then lands off the list the picker shows. Only lists the registry does not own stay.

const ROOTS = ['src/components/configurator', 'src/components/layout/BaseSettingsModal.tsx'];

// file (relative to src/) → the RANGES entries it may still read, and why the registry can't own them.
const ALLOWLIST: Record<string, { lists: string[]; typeId?: string; why: string }> = {
    'components/configurator/plugins/HerleidingenConfig.tsx': {
        lists: ['herleidingenSamengesteld'], typeId: 'herleidingen',
        why: 'slider stops for the samengesteld unit mode, not a base-seeded max',
    },
    'components/configurator/plugins/GeldRekenenConfig.tsx': {
        lists: ['geldRekenen'], typeId: 'geld-rekenen',
        why: 'maxEuro (euros with a percent on top), not a base-seeded key',
    },
    'components/layout/BaseSettingsModal.tsx': {
        lists: ['base'],
        why: 'the grade/base seed itself, which every block floors from',
    },
};

function filesUnder(path: string): string[] {
    if (statSync(path).isFile()) return [path];
    return readdirSync(path).flatMap(name => filesUnder(join(path, name)));
}

const sources = ROOTS.flatMap(filesUnder).filter(f => /\.tsx?$/.test(f));

describe('config max lists come from the registry', () => {
    test.each(sources.map(f => [relative('src', f).replace(/\\/g, '/'), f]))('%s', (rel, file) => {
        const text = readFileSync(file, 'utf8');
        const used = [...new Set([...text.matchAll(/\bRANGES\.(\w+)/g)].map(m => m[1]))].sort();
        expect(used, `${rel} reads RANGES directly; use useMaxPresets(block)`).toEqual([...(ALLOWLIST[rel]?.lists ?? [])].sort());
        // A bare RANGES import without a property read would be dead or indexed dynamically.
        if (/\bRANGES\b/.test(text)) expect(used.length, `${rel} imports RANGES`).toBeGreaterThan(0);
    });

    test('allowlisted types really have no registry list', () => {
        for (const [rel, entry] of Object.entries(ALLOWLIST)) {
            if (entry.typeId) expect(REGISTRY[entry.typeId]?.maxPresets, `${rel}: ${entry.typeId} has a registry list now`).toBeUndefined();
        }
    });

    test('every allowlisted file still exists and still needs its entry', () => {
        for (const rel of Object.keys(ALLOWLIST)) {
            expect(sources.some(f => relative('src', f).replace(/\\/g, '/') === rel), rel).toBe(true);
        }
    });
});
