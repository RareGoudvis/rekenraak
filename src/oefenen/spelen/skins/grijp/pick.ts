import { MACHINE_IDS, type MachineId } from './machines';

// Grijpmachine: which machine this round. Random, never the one played last on this device (like Verborgen prent).

export const GRIJP_KEY = 'rekenraak_spelen_grijp_v1';

export function lastMachine(): MachineId | null {
    try {
        const v = globalThis.localStorage?.getItem(GRIJP_KEY) ?? null;
        return (MACHINE_IDS as readonly string[]).includes(v ?? '') ? (v as MachineId) : null;
    } catch { return null; }
}

export function rememberMachine(id: MachineId): void {
    try { globalThis.localStorage?.setItem(GRIJP_KEY, id); } catch { /* private mode: this visit only */ }
}

/** A random machine, never the last one. */
export function pickMachine(last: MachineId | null, rand: () => number = Math.random): MachineId {
    const pool = MACHINE_IDS.filter(id => id !== last);
    return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
}

/** Dev builds: ?grijp=<id> pins a machine (screenshots, fixing one arcade). */
export function forcedMachine(search: string): MachineId | null {
    const v = new URLSearchParams(search).get('grijp');
    return (MACHINE_IDS as readonly string[]).includes(v ?? '') ? (v as MachineId) : null;
}
