// @vitest-environment jsdom
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { useOefenStore } from '../oefenen/useOefenStore';
import { hashOf, resetKiosk, starterSessie, STARTER_TYPES } from './helpers/oefenKiosk';

// A generator that yields nothing once (the scheduler retires such a slot) must not end the run
// while a type can still serve: next() draws again instead of finishing.
const flaky = vi.hoisted(() => ({ nullsLeft: 0 }));
vi.mock('../services/oefenen/scheduler', async (importOriginal) => {
    const real = await importOriginal<typeof import('../services/oefenen/scheduler')>();
    return {
        ...real,
        nextExercise: (...args: Parameters<typeof real.nextExercise>) => {
            if (flaky.nullsLeft > 0) { flaky.nullsLeft--; return null; }
            return real.nextExercise(...args);
        },
    };
});

const st = () => useOefenStore.getState();
beforeEach(() => { resetKiosk(); flaky.nullsLeft = 0; });

describe('a generator that yields nothing', () => {
    test('null once, then an exercise: the run goes on instead of finishing', () => {
        st().load(hashOf(starterSessie({ types: STARTER_TYPES.slice(0, 2) })));
        flaky.nullsLeft = 1;
        st().start();
        expect(st().phase).toBe('exercise');
        expect(st().run!.done).toBe(false);
        expect(st().shown).not.toBeNull();
    });
});
