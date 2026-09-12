import { useWorksheetStore } from '../../store/useWorksheetStore';
import { useConstraintScope } from './ConstraintScope';
import type { MathBlock } from '../../services/math/types';
import type { BlockConstraints } from '../../services/math/constraintTypes';

/**
 * A config plugin's view of its block: the constraints typed as its own family, and a
 * patch that merges one or more keys back. Replaces the hand-rolled `set` helper each
 * plugin used to declare (CijferConfig's pattern), so the family type is stated once.
 *
 * Under a `ConstraintScope` (the per-variant tabs of hr-std-gemengd) the very same plugin
 * reads the shared bag with that variant's overrides laid over it, and writes only into
 * the override bag — so a tab stays sparse and keeps inheriting everything it never touched.
 */
export function useConstraints<C extends BlockConstraints>(block: MathBlock): [C, (patch: Partial<C>) => void] {
    const updateBlockSettings = useWorksheetStore((s) => s.updateBlockSettings);
    const scope = useConstraintScope();
    const root = block.constraints as BlockConstraints;

    if (!scope) {
        // Merge against `block.constraints`, not `c`: a family type is a description of the
        // bag, never the whole of it — keys it does not name must survive the write.
        const patch = (next: Partial<C>) =>
            updateBlockSettings(block.id, { constraints: { ...root, ...next } });
        return [root as C, patch];
    }

    const [key, id] = scope.path;
    const bags = (root[key] ?? {}) as Record<string, BlockConstraints | undefined>;
    const bag = bags[id] ?? {};
    // The variant owns its oefenvorm, so it wins over whatever the shared bag says.
    const preset = scope.fixedPreset;
    const c = { ...root, ...bag, ...(preset ? { preset } : {}) } as C;

    const patch = (next: Partial<C>) =>
        updateBlockSettings(block.id, {
            constraints: { ...root, [key]: { ...bags, [id]: { ...bag, ...next } } },
        });

    return [c, patch];
}
