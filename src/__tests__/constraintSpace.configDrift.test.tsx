// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { EXERCISE_UI } from '../config/exerciseUI';
import { constraintSpaceFor } from '../config/constraintSpace';
import { makeBlock } from './helpers/makeBlock';

// constraintSpace is a hand-kept copy of what each Config offers; when the two drift the
// generator matrix sweeps values a teacher cannot pick and skips the ones they can.
// One row per hand-listed option whose choices the Config renders as button labels.
const PINS: { typeId: string; key: string; label: RegExp }[] = [
    { typeId: 'kettingsommen', key: 'chainLength', label: /^(\d+) stappen$/ },
];

afterEach(cleanup);

describe('constraintSpace matches the Config buttons', () => {
    test.each(PINS)('$typeId $key', ({ typeId, key, label }) => {
        const { Config } = EXERCISE_UI[typeId];
        const { container } = render(<Config block={makeBlock(typeId, { id: 'b' })} />);
        const offered = [...container.querySelectorAll('button')]
            .map(b => label.exec((b.textContent ?? '').trim())?.[1])
            .filter((v): v is string => v !== undefined)
            .map(Number);
        expect(offered.length, `${typeId}: no "${label}" buttons rendered`).toBeGreaterThan(0);
        expect(constraintSpaceFor(typeId)[key]).toEqual(offered);
    });
});
