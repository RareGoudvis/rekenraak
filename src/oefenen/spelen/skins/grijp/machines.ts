import { mulberry32 } from '../../distractors';

// Grijpmachine, pure: the five machines (one per round, pick.ts), each in its own arcade with its own prizes. The look
// of each lives in arcades/<id>.tsx; the rules and the sums are the same in all of them.

export const MACHINE_IDS = ['neon', 'pier', 'spook', 'ruimte', 'snoep'] as const;
export type MachineId = typeof MACHINE_IDS[number];

export interface Machine {
    id: MachineId;
    // The name on the machine's marquee.
    name: string;
    // The prizes in this machine (arcades/<id>.tsx draws each kind); at least 5, so the heap of 4 never repeats.
    prizes: readonly string[];
}

export const MACHINES: readonly Machine[] = [
    // An 80s neon arcade: plush animals.
    { id: 'neon', name: 'GRIJP!', prizes: ['beer', 'konijn', 'kat', 'kikker', 'dino', 'octopus'] },
    // A seaside pier: sea creatures.
    { id: 'pier', name: 'ZEEGRIJPER', prizes: ['krab', 'vis', 'zeester', 'schildpad', 'kwal', 'walvis'] },
    // A spooky-cute arcade: little monsters and pumpkins.
    { id: 'spook', name: 'SPOOKGRIJPER', prizes: ['spookje', 'pompoen', 'monster', 'vleermuis', 'slijm', 'mummie'] },
    // A space arcade: aliens, rockets and robots.
    { id: 'ruimte', name: 'RUIMTEKLAUW', prizes: ['alien', 'raket', 'robot', 'ufo', 'planeet', 'ster'] },
    // A candy shop: sweets with faces.
    { id: 'snoep', name: 'SNOEPGRIJPER', prizes: ['donut', 'cupcake', 'ijsje', 'lolly', 'snoepje', 'taart'] },
];

export const machineById = (id: string): Machine => MACHINES.find(m => m.id === id) ?? MACHINES[0];

// A prize: its kind and one of LOOKS colourways, so two bears on the shelf can differ.
export interface Prize { kind: string; look: number }
export const LOOKS = 3;

// The heap holds this many tagged prizes (one per choice).
export const HEAP = 4;

/** A seeded bag of prizes for one round: the heap's first four differ, and every refill differs from what is on the heap. */
export function prizeBag(machine: Machine, seed: number) {
    const rng = mulberry32(seed ^ 0x6a1b);
    const kinds = machine.prizes;
    const draw = (avoid: readonly Prize[]): Prize => {
        const free = kinds.filter(k => !avoid.some(p => p.kind === k));
        const pool = free.length ? free : kinds;
        return { kind: pool[Math.floor(rng() * pool.length)], look: Math.floor(rng() * LOOKS) };
    };
    const heap: Prize[] = [];
    for (let i = 0; i < HEAP; i++) heap.push(draw(heap));
    return {
        heap,
        // The plush that tumbles into the place a won prize left (never the same kind as the others on the heap).
        refill: (now: readonly Prize[], slot: number) => draw(now.filter((_, i) => i !== slot).concat(now[slot])),
        // The near-miss roll per right answer (claw.ts nearMissOf).
        roll: () => rng(),
    };
}

/** The little prizes piled up behind the four tagged ones (no tags, just the heap), the same per machine and seed. */
export function backPile(machine: Machine, seed: number, n = 7): Prize[] {
    const rng = mulberry32(seed ^ 0x2c3d);
    return Array.from({ length: n }, () => ({ kind: machine.prizes[Math.floor(rng() * machine.prizes.length)], look: Math.floor(rng() * LOOKS) }));
}
