import type { KioskDescriptor, KioskInput } from './types';
import { REGISTRY } from '../../config/exerciseRegistry';
import { flattenLeaves, type AppLeaf } from '../../config/appstructure';

// Registry lookups for the oefenmodus: which types and leaves a pupil can practise.

export function kioskFor(typeId: string): KioskDescriptor | null {
    return REGISTRY[typeId]?.kiosk ?? null;
}

export function kioskInputOf(d: KioskDescriptor, ex: unknown, c: Record<string, unknown>): KioskInput {
    return d.inputOf?.(ex, c) ?? d.input;
}

/** The type has a descriptor and it can check these settings (registry defaults fill gaps). */
export function kioskSupports(typeId: string, constraints: Record<string, unknown> = {}): boolean {
    const def = REGISTRY[typeId];
    if (!def?.kiosk) return false;
    const c = { ...(def.defaultConstraints(typeId) as Record<string, unknown>), ...constraints };
    return def.kiosk.supported?.(c) ?? true;
}

/** Sidebar leaves a teacher can put in an oefensessie, in sidebar order. */
export function kioskCapableLeaves(): AppLeaf[] {
    return flattenLeaves().filter(l => kioskSupports(l.typeId, l.defaultConstraints ?? {}));
}
