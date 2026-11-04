import { describe, test, expect } from 'vitest';
import { APP_STRUCTURE } from '../config/appstructure';
import { leafAllowedForGrade } from '../config/gradePresets';
import { listOefenLeaves } from '../components/oefenen/oefenBuild';

const leafNode = (id: string) => APP_STRUCTURE.flatMap(d => d.subdomains.flatMap(s => s.types.flatMap(t => [t, ...(t.children ?? [])]))).find(l => l.id === id)!;

describe('R1 kiosk calls', () => {
    test('herleidingen-oppervlakte is L5+ content (are/ha) in the sidebar and the builder', () => {
        const leaf = leafNode('herleidingen-oppervlakte');
        expect(leafAllowedForGrade(leaf, 4)).toBe(false);
        expect(leafAllowedForGrade(leaf, 5)).toBe(true);
        expect(listOefenLeaves().find(l => l.id === 'herleidingen-oppervlakte')?.minGrade).toBe(5);
    });
});
