import type { SpelPack } from './pack';
import { KLOK_PACK } from './klok/klokPack';
import { BREUK_PACK } from './breuken/breukPack';
import { TEKST_PACK } from './tekst/tekstPack';

// The content packs a game can play, beside the number sums of SPEL_LEAVES. A new pack = one line here.
export const SPEL_PACKS: readonly SpelPack[] = [KLOK_PACK, BREUK_PACK, TEKST_PACK];

/** The pack that plays this sidebar leaf, if any. */
export const packFor = (leafId: string): SpelPack | undefined => SPEL_PACKS.find(p => p.leaves.includes(leafId));
