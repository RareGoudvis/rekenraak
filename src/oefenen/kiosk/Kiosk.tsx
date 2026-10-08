import { useEffect, useState } from 'react';
import { LEAF_BY_ID } from '../../config/appstructure';
import { resolveInstruction } from '../../config/instructionPresets';
import type { BlockConstraints } from '../../services/math/constraintTypes';
import { kioskInstructionOf } from '../../services/oefenen/kiosk';
import { currentInput, useOefenStore } from '../useOefenStore';
import TopBar from './TopBar';
import ExerciseCard from './ExerciseCard';
import AnswerInput from './AnswerInput';
import FeedbackOverlay from './FeedbackOverlay';
import StatsScreen from './StatsScreen';

// Physical keyboard (Chromebook / tablet keyboard): digits and the type's extra keys type,
// Backspace deletes, Enter is Controleer and then Volgende, < = > pick for vergelijken.
// A focused answer field types natively (its onChange), so only keys that reach the page
// outside a field are routed here; a focused button handles its own Enter.
function useKioskKeys() {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            const st = useOefenStore.getState();
            const target = e.target as HTMLElement | null;
            const inField = target?.tagName === 'INPUT';
            const onButton = target?.tagName === 'BUTTON';
            if (e.key === 'Enter') {
                if (onButton || e.repeat) return;
                if (st.phase === 'feedback') { e.preventDefault(); st.next(); return; }
                if (st.phase !== 'exercise') return;
                e.preventDefault();
                // quotiënt typed, rest still empty: Enter moves on to the rest field.
                if (st.input.length > 1 && st.field < st.input.length - 1 && st.input[st.field + 1] === '') st.focusField(st.field + 1);
                else st.answer();
                return;
            }
            if (st.phase !== 'exercise') return;
            const info = currentInput(st.sessie, st.shown);
            if (!info) return;
            if (info.kind === 'choice') {
                if (info.choices.includes(e.key)) { e.preventDefault(); st.choose(e.key); }
                return;
            }
            if (inField) return;
            if (e.key === 'Backspace') { e.preventDefault(); st.press('back'); }
            else if (e.key.length === 1) { e.preventDefault(); st.press(e.key); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);
}

// 1 s tick for the countdown; the store locks the run when its end time passes.
function useClock(active: boolean): number {
    const [now, setNow] = useState(() => Date.now());
    const tick = useOefenStore(s => s.tick);
    useEffect(() => {
        if (!active) return;
        const id = window.setInterval(() => { const t = Date.now(); setNow(t); tick(t); }, 1000);
        return () => window.clearInterval(id);
    }, [active, tick]);
    return now;
}

// The running kiosk: landscape = exercise card left, answer panel right; portrait stacks.
export default function Kiosk() {
    const sessie = useOefenStore(s => s.sessie);
    const run = useOefenStore(s => s.run);
    const shown = useOefenStore(s => s.shown);
    const phase = useOefenStore(s => s.phase);
    const lastCorrect = useOefenStore(s => s.lastCorrect);
    const next = useOefenStore(s => s.next);
    const now = useClock(run?.timerEndsAt !== undefined && !run.done);
    useKioskKeys();
    if (!sessie || !run) return null;

    const type = shown ? sessie.types[shown.slot] : undefined;
    const leafInstruction = type
        ? resolveInstruction(LEAF_BY_ID[type.leafId]?.instruction, type.typeId, type.label, shown!.constraints as BlockConstraints)
        : '';
    // A teacher's own wording wins; the leaf's paper default gives way to the kiosk wording.
    const instruction = type && shown && (!type.instruction || type.instruction === leafInstruction)
        ? kioskInstructionOf(type.typeId, shown.exercise, shown.constraints as Record<string, unknown>, leafInstruction)
        : type?.instruction ?? '';

    return (
        <div className="oefen-app">
            <TopBar now={now} />
            {phase === 'stats' ? (
                <main className="kiosk-scroll"><StatsScreen /></main>
            ) : (
                <main className="kiosk-main">
                    <section className="kiosk-card-col" aria-label="Oefening">
                        {shown && type && (
                            <ExerciseCard typeId={type.typeId} exercise={shown.exercise} constraints={shown.constraints}
                                instruction={instruction} exerciseKey={shown.exerciseKey} />
                        )}
                    </section>
                    <section className="kiosk-panel" aria-label="Antwoord">
                        <AnswerInput />
                        {phase === 'feedback' && lastCorrect !== null && <FeedbackOverlay correct={lastCorrect} onNext={next} />}
                    </section>
                </main>
            )}
        </div>
    );
}
