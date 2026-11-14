import { lazy, Suspense } from 'react';
import { useWorksheetStore } from '../../store/useWorksheetStore';

// Its own chunk: the kiosk card (and kiosk.css) load when a teacher opens Oefenmodus, not with the editor.
const OefenWorkspace = lazy(() => import('./OefenWorkspace'));

// The 'oefenmodus' view: the workspace for the session the store opened it with, remounted on every open.
export default function OefenmodusView() {
    const initial = useWorksheetStore((s) => s.oefenInitial);
    const seq = useWorksheetStore((s) => s.oefenOpenSeq);
    const from = useWorksheetStore((s) => s.oefenReturn);
    const close = useWorksheetStore((s) => s.closeOefenmodus);
    return (
        <Suspense fallback={null}>
            <OefenWorkspace key={seq} initial={initial ?? undefined} onClose={close} backLabel={from === 'mijn-bladen' ? 'Mijn bladen' : 'Werkblad'} />
        </Suspense>
    );
}
