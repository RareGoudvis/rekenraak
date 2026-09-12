import { useWorksheetStore } from '../../store/useWorksheetStore';
import type { MathBlock } from '../../services/math/types';
import type { BlockConstraints } from '../../services/math/constraintTypes';

/**
 * A config plugin's view of its block: the constraints typed as its own family, and a
 * patch that merges one or more keys back. Replaces the hand-rolled `set` helper each
 * plugin used to declare (CijferConfig's pattern), so the family type is stated once.
 */
export function useConstraints<C extends BlockConstraints>(block: MathBlock): [C, (patch: Partial<C>) => void] {
    const updateBlockSettings = useWorksheetStore((s) => s.updateBlockSettings);
    const c = block.constraints as C;
    // Merge against `block.constraints`, not `c`: a family type is a description of the
    // bag, never the whole of it — keys it does not name must survive the write.
    const patch = (next: Partial<C>) =>
        updateBlockSettings(block.id, { constraints: { ...block.constraints, ...next } });
    return [c, patch];
}
