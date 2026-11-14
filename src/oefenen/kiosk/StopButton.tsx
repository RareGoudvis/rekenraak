import { StopCircle } from '@phosphor-icons/react';
import { canStop, useOefenStore } from '../useOefenStore';
import TwoTapButton from './TwoTapButton';

export { STOP_DISARM_MS } from './TwoTapButton';

// Endless sessions only: the pupil's way to end the run. Two taps (Stoppen, then Ja, stoppen), like Wissen.
export default function StopButton() {
    const sessie = useOefenStore(s => s.sessie);
    const run = useOefenStore(s => s.run);
    const stop = useOefenStore(s => s.stop);
    if (!sessie || !canStop(sessie, run)) return null;
    return <TwoTapButton label={<><StopCircle aria-hidden /> Stoppen</>} groupLabel="Stoppen met oefenen" confirm="Ja, stoppen" onConfirm={stop} />;
}
