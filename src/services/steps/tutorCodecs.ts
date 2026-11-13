import type { TutorCodec } from './tutorCodec';

// The tutor codec registry; a type's codec is one file in ./codecs (contract: tutorCodec.ts).
// Every .ts file in ./codecs exporting `codec` registers itself, so adding a type never edits a shared list.
const modules = import.meta.glob<{ codec: TutorCodec }>('./codecs/*.ts', { eager: true });

export const TUTOR_CODECS: readonly TutorCodec[] = Object.values(modules).map(m => m.codec).filter(Boolean);

const byType = new Map(TUTOR_CODECS.flatMap(c => c.typeIds.map(t => [t, c] as const)));
const byId = new Map(TUTOR_CODECS.map(c => [c.id, c] as const));

export const codecForType = (typeId: string): TutorCodec | undefined => byType.get(typeId);
export const codecById = (id: string): TutorCodec | undefined => byId.get(id);
