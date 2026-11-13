import type { ReactNode } from 'react';
import type { FractionExercise } from '../../services/math/types';
import { groupOf, groupPartProps, useViewerInteraction } from './ViewerInteractionContext';
import KioskCell from './KioskCell';
import { HV_ANSWER, hvObject, hvQuestion, hvWord } from '../../services/fractions/hoeveelheidGroups';

interface Props {
    ex: FractionExercise;
    // Objects per row, as the sheet lays them out (the teacher's groupingMode): the card shows the same picture.
    rowSizes: number[];
    // The breuk as the sheet draws it (VerticalFraction), for the answer line.
    fraction: ReactNode;
}

// Card px (the kiosk scales the 340 px card up): 22 px objects with 3 px of tap padding all round,
// so neighbouring hit areas touch and a finger never lands between two objects.
const OBJ = 22, PAD = 3;

// Oefenmodus only (FractionExerciseItem renders it under a fill-cells context): the objects the pupil
// groups and colours, the two optional working rows and the answer line. SYNC: hoeveelheidGroups.ts keys.
export default function HoeveelheidGroupsCard({ ex, rowSizes, fraction }: Props) {
    const ix = useViewerInteraction();
    const work = ix?.state.groups;
    const word = hvWord(ex, false);
    const cell = (key: string) => <KioskCell cellKey={key} variant={key === HV_ANSWER ? 'is-hv' : 'is-hv is-scratch'} label={hvQuestion(key, ex)} />;
    const sign = (s: string) => <span className="kiosk-hv-sign" aria-hidden>{s}</span>;
    const starts = rowSizes.map((_, r) => rowSizes.slice(0, r).reduce((a, b) => a + b, 0));
    return (
        <div className="kiosk-hv">
            <div className="kiosk-hv-objects" role="group" aria-label={`${ex.total ?? 0} ${hvWord(ex)}`}>
                {rowSizes.map((n, r) => (
                    <div key={r} className="kiosk-hv-objrow">
                        {Array.from({ length: n }, (_, j) => {
                            const i = starts[r] + j;
                            const key = hvObject(i);
                            const at = work ? groupOf(work, key) : -1;
                            return (
                                <span key={key} className="kiosk-obj" style={{ padding: PAD }} {...groupPartProps(ix, key, `${word} ${i + 1}`)}>
                                    <svg width={OBJ} height={OBJ} viewBox={`0 0 ${OBJ} ${OBJ}`} aria-hidden>
                                        {ex.objectShape === 'square'
                                            ? <rect className="kiosk-obj-shape" x={2} y={2} width={OBJ - 4} height={OBJ - 4} />
                                            : <circle className="kiosk-obj-shape" cx={OBJ / 2} cy={OBJ / 2} r={OBJ / 2 - 2} />}
                                        {/* The group's number: groups stay apart without telling colours apart. */}
                                        {at >= 0 && <text className="kiosk-obj-num" x={OBJ / 2} y={OBJ / 2 + 0.5}>{at + 1}</text>}
                                    </svg>
                                </span>
                            );
                        })}
                    </div>
                ))}
            </div>
            <div className="kiosk-hv-row">{cell('r0')}{sign(':')}{cell('r1')}{sign('=')}{cell('r2')}</div>
            <div className="kiosk-hv-row">{cell('r3')}{sign('×')}{cell('r4')}{sign('=')}{cell('r5')}</div>
            <div className="kiosk-hv-row kiosk-hv-answer">{fraction}<span>van {ex.total ?? 0} =</span>{cell(HV_ANSWER)}</div>
        </div>
    );
}
