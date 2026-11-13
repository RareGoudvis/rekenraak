import type { TutorCodec } from './tutorCodec';

// The tutor codec registry; a type's codec is one file in ./codecs (contract: tutorCodec.ts).
// Every .ts file in ./codecs exporting `codec` registers itself, so adding a type never edits a shared list.
const modules = import.meta.glob<{ codec: TutorCodec }>('./codecs/*.ts', { eager: true });

export const TUTOR_CODECS: readonly TutorCodec[] = Object.values(modules).map(m => m.codec).filter(Boolean);

// A typeId may have several codecs (breuken sums ride on the hoofdrekenen typeIds): each claims only its own exercises.
const byType = new Map<string, TutorCodec[]>();
for (const c of TUTOR_CODECS) for (const t of c.typeIds) byType.set(t, [...(byType.get(t) ?? []), c]);
const byId = new Map(TUTOR_CODECS.map(c => [c.id, c] as const));

export const codecsForType = (typeId: string): readonly TutorCodec[] => byType.get(typeId) ?? [];
export const codecForType = (typeId: string): TutorCodec | undefined => byType.get(typeId)?.[0];
export const codecById = (id: string): TutorCodec | undefined => byId.get(id);
