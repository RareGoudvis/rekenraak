import { useMemo } from 'react';
import { LEAF_BY_ID } from '../../config/appstructure';
import { resolveInstruction } from '../../config/instructionPresets';
import type { BlockConstraints } from '../../services/math/constraintTypes';
import { OEFEN_VERSION, type OefenSessie, type OefenType } from '../../services/oefenen/types';
import { kioskInstructionOf } from '../../services/oefenen/kiosk';
import { nextExercise, type Rng } from '../../services/oefenen/scheduler';
import ExerciseCard from '../../oefenen/kiosk/ExerciseCard';
import '../../oefenen/kiosk/kiosk.css';
import { EMPTY_PREVIEW, type OefenLeaf } from './oefenBuild';

// The kiosk card's own size on an iPad in landscape (its card column), drawn at half size.
const FRAME_W = 600;
const FRAME_H = 360;
const FRAME_SCALE = 0.5;

// A seeded LCG: the sample stays put across renders and only "Ander voorbeeld" (a new seed) moves it.
function seeded(seed: number): Rng {
    let s = (seed * 2654435761) % 2147483648;
    return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
}

// One exercise the way the kiosk draws it (nextExercise) and words it (kioskInstructionOf).
function drawSample(leaf: Pick<OefenLeaf, 'id' | 'typeId'>, label: string, constraints: Record<string, unknown>, seed: number) {
    const type: OefenType = { typeId: leaf.typeId, leafId: leaf.id, label, constraints, weight: 100 };
    const probe: OefenSessie = { v: OEFEN_VERSION, id: 'sample', createdAt: 0, types: [type], mode: 'afwisselen', allowRepeatType: false, testMode: false, statsLocked: false };
    const got = nextExercise(probe, type, new Set(), seeded(seed + 1));
    if (!got) return null;
    const paper = resolveInstruction(LEAF_BY_ID[leaf.id]?.instruction, leaf.typeId, label, got.constraints as BlockConstraints);
    return { ...got, instruction: kioskInstructionOf(leaf.typeId, got.exercise, got.constraints, paper) };
}

// What the pupil sees: the kiosk's ExerciseCard in an iPad-sized frame, scaled down, not tappable.
export default function OefenSample({ leaf, label, constraints, seed }: {
    leaf: Pick<OefenLeaf, 'id' | 'typeId'>; label: string; constraints: Record<string, unknown>; seed: number;
}) {
    const sample = useMemo(() => drawSample(leaf, label, constraints, seed), [leaf, label, constraints, seed]);
    return (
        <div className="oefen-preview" style={S.frame} aria-label="Voorbeeld op het toestel van de leerling" role="img">
            {sample ? (
                // inert: the card's tap-to-answer parts must not take the teacher's clicks or focus.
                <div inert style={S.stage}>
                    <ExerciseCard key={sample.key} typeId={leaf.typeId} exercise={sample.exercise} constraints={sample.constraints}
                        instruction={sample.instruction} exerciseKey={sample.key} />
                </div>
            ) : <p style={S.empty}>{EMPTY_PREVIEW}</p>}
        </div>
    );
}

const S = {
    frame: { width: FRAME_W * FRAME_SCALE, height: FRAME_H * FRAME_SCALE, flex: 'none', overflow: 'hidden', borderRadius: 'var(--radius-sm)', border: '1px solid var(--separator)', background: 'var(--bg-base)', position: 'relative' } as React.CSSProperties,
    stage: { width: FRAME_W, height: FRAME_H, display: 'flex', padding: 'var(--sp-3)', boxSizing: 'border-box', transform: `scale(${FRAME_SCALE})`, transformOrigin: 'top left', pointerEvents: 'none' } as React.CSSProperties,
    empty: { margin: 0, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--sp-3)', textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontStyle: 'italic' } as React.CSSProperties,
};
