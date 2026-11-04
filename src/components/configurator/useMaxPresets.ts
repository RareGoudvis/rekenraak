import { REGISTRY } from '../../config/exerciseRegistry';
import type { MaxRange } from '../../config/numberRanges';
import { effectiveBlockFor } from '../../services/math/mixedGenerator';
import { useConstraints } from './useConstraints';
import { useConstraintScope } from './ConstraintScope';
import type { MathBlock } from '../../services/math/types';
import type { BlockConstraints } from '../../services/math/constraintTypes';

// The max-number list a config shows for the block's current settings (null = no picker).
// REGISTRY.maxPresets is the one source: the grade seed floors into the same list, so a
// picker can never show a list the seed did not land on.
export function useMaxPresets(block: MathBlock): MaxRange | null {
    const [c] = useConstraints<BlockConstraints>(block);
    const scope = useConstraintScope();
    // A gemengd variant tab mounts a single-operator plugin, so it reads that operator's row.
    const typeId = scope ? effectiveBlockFor(block, scope.path[1]).typeId : block.typeId;
    return REGISTRY[typeId]?.maxPresets?.(c) ?? null;
}
