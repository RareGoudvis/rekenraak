import { EMPTY_GROUPS, GROUP_TINTS, groupStarted, groupsCleared, groupsDone, groupsEdited } from '../../components/viewer/ViewerInteractionContext';
import { kioskFor, kioskInteractOf } from '../../services/oefenen/kiosk';
import { useOefenStore } from '../useOefenStore';

// The answer panel's group tools (interact.groups, breuk van een hoeveelheid): start a group, finish
// grouping, back to grouping, start over; under them one guidance line (the nudge, else the
// descriptor's guide) and the question of the cell the keypad types into.
export default function GroupTools() {
    const sessie = useOefenStore(s => s.sessie);
    const shown = useOefenStore(s => s.shown);
    const interaction = useOefenStore(s => s.interaction);
    const activeCell = useOefenStore(s => s.activeCell);
    const nudge = useOefenStore(s => s.nudge);
    const phase = useOefenStore(s => s.phase);
    const d = sessie && shown ? kioskFor(sessie.types[shown.slot]?.typeId ?? '') : undefined;
    const ia = d && shown ? kioskInteractOf(d, shown.constraints) : undefined;
    if (!ia || !shown) return null;

    const work = interaction.groups ?? EMPTY_GROUPS;
    const made = work.members.some(m => m.length > 0);
    const activeEmpty = work.active !== null && (work.members[work.active]?.length ?? 0) === 0;
    const set = useOefenStore.getState().setInteraction;
    const off = phase !== 'exercise';
    // The nudge stays until the work it asks for is there.
    const given = ia.fromState(interaction, shown.exercise, shown.constraints);
    const stillMissing = nudge !== null && (given === '' || !!ia.nudge?.(given, shown.exercise, shown.constraints));
    const guide = ia.guide?.(interaction, shown.exercise, shown.constraints);
    const question = activeCell ? ia.cellOf?.(activeCell, shown.exercise, shown.constraints)?.label : undefined;

    return (
        <div className="kiosk-groups">
            <div className="kiosk-groups-actions">
                {work.mode === 'group' ? (
                    <>
                        <button type="button" className="kiosk-btn" disabled={off || activeEmpty} onClick={() => set(groupStarted(interaction))}>Nieuw groepje</button>
                        <button type="button" className="kiosk-btn kiosk-btn-primary" disabled={off || !made} onClick={() => set(groupsDone(interaction))}>Klaar met groepjes</button>
                    </>
                ) : (
                    <button type="button" className="kiosk-btn" disabled={off} onClick={() => set(groupsEdited(interaction))}>Groepjes aanpassen</button>
                )}
                <button type="button" className="kiosk-btn" disabled={off || work.members.length === 0} onClick={() => set(groupsCleared(interaction))}>Opnieuw</button>
            </div>
            {work.mode === 'group' && work.active !== null && (
                <p className="kiosk-groups-now"><span className="kiosk-group-chip" data-kiosk-group={work.active % GROUP_TINTS}>Groepje {work.active + 1}</span></p>
            )}
            {stillMissing
                ? <p className="kiosk-nudge" role="status">{nudge}</p>
                : guide && <p className="kiosk-groups-guide" aria-live="polite">{guide}</p>}
            {question && <p className="kiosk-cell-question">{question}</p>}
        </div>
    );
}
