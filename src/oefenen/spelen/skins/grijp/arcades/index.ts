import type { MachineId } from '../machines';
import type { ArcadeArt } from './layout';
import * as neon from './neon';
import * as pier from './pier';
import * as spook from './spook';
import * as ruimte from './ruimte';
import * as snoep from './snoep';

// The five arcades' drawings by machine id (one file each, so each can be fixed alone).
export const ARCADES: Record<MachineId, ArcadeArt> = { neon, pier, spook, ruimte, snoep };
