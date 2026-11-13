import { hvObject, hvSolution } from '../../../services/fractions/hoeveelheidGroups';
import type { FractionExercise } from '../../../services/math/types';
import type { StepsVisualProps } from '../stepsVisual';

// The objects of "t/n van g", filled in as far as the pupil has revealed the breukvragen: plain, then n
// numbered groups (outline only), then the t chosen groups filled. SYNC: the Oefenmodus card's look
// (HoeveelheidGroupsCard + the --kiosk-group-* colours in kiosk.css); the tutor-hv classes live in tutor.css.
export default function HoeveelheidGroups({ data: ex, revealed }: StepsVisualProps<FractionExercise>) {
    if (ex.subType !== 'hoeveelheid') return null;
    const total = ex.total ?? 0;
    const groups = hvSolution(ex, revealed).groups;
    const groupOf = new Map<string, number>();
    groups?.members.forEach((ids, k) => ids.forEach(id => groupOf.set(id, k)));
    const chosen = new Set(groups?.colored ?? []);
    return (
        <div className="tutor-hv" aria-hidden="true">
            {Array.from({ length: total }, (_, i) => {
                const k = groupOf.get(hvObject(i));
                const cls = `tutor-hv-dot${k === undefined ? '' : ' is-grouped'}${k !== undefined && chosen.has(k) ? ' is-chosen' : ''}`;
                return <span key={i} className={cls} data-group={k === undefined ? undefined : k % 6}>{k === undefined ? '' : k + 1}</span>;
            })}
        </div>
    );
}
