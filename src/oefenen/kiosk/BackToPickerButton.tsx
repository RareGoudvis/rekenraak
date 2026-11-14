import { ArrowUUpLeft } from '@phosphor-icons/react';
import { useOefenStore } from '../useOefenStore';
import { isZelfSessie } from '../zelf/zelfSessie';
import TwoTapButton from './TwoTapButton';

// Zelf oefenen only: back to the picker mid-run (count, timer or endless); a teacher's link has no way out.
export default function BackToPickerButton() {
    const sessie = useOefenStore(s => s.sessie);
    const run = useOefenStore(s => s.run);
    const leaveZelf = useOefenStore(s => s.leaveZelf);
    if (!isZelfSessie(sessie) || !run || run.done) return null;
    return (
        <TwoTapButton
            label={<><ArrowUUpLeft aria-hidden /> <span>Terug<span className="kiosk-back-long"> naar begin</span></span></>}
            armName="Terug naar begin"
            groupLabel="Terug naar begin"
            confirm="Ja, terug"
            onConfirm={leaveZelf}
        />
    );
}
