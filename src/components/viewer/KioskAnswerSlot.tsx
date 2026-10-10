import type { ReactNode } from 'react';
import { useKioskCard } from './BlockWidthContext';

// The paper answer line ("531 + 78 = ____", "____ °C") on the sheet; on the Oefenmodus card the
// highlighted "?" box the pupil's typed answer belongs to. Outside the card it returns its child untouched.
export default function KioskAnswerSlot({ children }: { children: ReactNode }) {
    const card = useKioskCard();
    if (!card) return <>{children}</>;
    return <span className="kiosk-answer-slot" data-kiosk-slot aria-hidden="true">?</span>;
}
