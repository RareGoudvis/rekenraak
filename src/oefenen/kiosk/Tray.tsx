import { EXERCISE_UI } from '../../config/exerciseUI';
import { builtCount } from '../../components/viewer/ViewerInteractionContext';
import type { KioskPiece } from '../../services/oefenen/types';
import { useOefenStore } from '../useOefenStore';

interface Props {
    typeId: string;
    constraints: Record<string, unknown>;
    pieces: KioskPiece[];
}

// The build tray (Oefenmodus 'build'): one tile per piece, a tap lays one more on the card.
// Classroom test (2026-10-09): pupils needed to see which piece and how many of it they laid,
// and a clear way to take one back, so every tile carries "gelegd: n" and its own − / +.
// It never shows the running total: adding up IS the exercise.
export default function Tray({ typeId, constraints, pieces }: Props) {
    const interaction = useOefenStore(s => s.interaction);
    const { lay } = useOefenStore.getState();
    const Piece = EXERCISE_UI[typeId]?.TrayPiece;
    return (
        <div className="kiosk-tray" role="group" aria-label="Kies wat je legt">
            {pieces.map(p => {
                const n = builtCount(interaction, p.key);
                const full = p.max !== undefined && n >= p.max;
                return (
                    <div key={p.key} className="kiosk-tray-slot">
                        <button type="button" className={`kiosk-tray-piece${n > 0 ? ' is-laid' : ''}`} onClick={() => lay(p.key, 1)}
                            disabled={full} aria-label={`${p.label} erbij${n > 0 ? ` (${n} gelegd)` : ''}`} data-tray-key={p.key}>
                            <span className="kiosk-tray-figure" aria-hidden>{Piece ? <Piece piece={p} constraints={constraints} /> : p.label}</span>
                            <span className={`kiosk-tray-count${n > 0 ? ' is-laid' : ''}`} aria-hidden>gelegd: {n}</span>
                        </button>
                        <div className="kiosk-tray-step">
                            <button type="button" className="kiosk-tray-btn" onClick={() => lay(p.key, -1)} disabled={n === 0} aria-label={`Eén ${p.label} terugnemen`}>−</button>
                            <button type="button" className="kiosk-tray-btn" onClick={() => lay(p.key, 1)} disabled={full} aria-label={`Nog een ${p.label}`}>+</button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
