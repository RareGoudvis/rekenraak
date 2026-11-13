import { EMPTY_GROUPS, GROUP_TINTS, groupChosen, groupStarted, groupsCleared, groupsDone, groupsEdited } from '../../components/viewer/ViewerInteractionContext';
import { kioskFor, kioskInteractOf } from '../../services/oefenen/kiosk';
import { useOefenStore } from '../useOefenStore';

// The answer panel's group tools (interact.groups, breuk van een hoeveelheid): a chip per group to
// pick the one the taps fill, a new group, "Groepjes kiezen" (taps then choose whole groups), back to
// grouping, start over; under them only the nudge (hints wait behind the card's "i" until the pupil asks).
export default function GroupTools() {
    const sessie = useOefenStore(s => s.sessie);
    const shown = useOefenStore(s => s.shown);
    const interaction = useOefenStore(s => s.interaction);
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
    const choosing = work.mode === 'colour';
    const total = (shown.exercise as { total?: number }).total ?? 0;
    const allGrouped = total > 0 && work.members.reduce((a, m) => a + m.length, 0) >= total;
    // Choosing is required but pupils missed it (owner, class 2026-11-13): the button pulses once
    // every object is grouped (or while choosing) until a first group is chosen.
    const pulse = !off && made && work.colored.length === 0 && (choosing || allGrouped);
    // The nudge stays until the work it asks for is there.
    const given = ia.fromState(interaction, shown.exercise, shown.constraints);
    const stillMissing = nudge !== null && (given === '' || !!ia.nudge?.(given, shown.exercise, shown.constraints));

    return (
        <div className="kiosk-groups">
            {!choosing && (
                <div className="kiosk-groups-chips" role="group" aria-label="Groepjes">
                    {work.members.map((_, g) => (
                        <button
                            key={g}
                            type="button"
                            className="kiosk-group-chip"
                            data-kiosk-group={g % GROUP_TINTS}
                            aria-label={`Groepje ${g + 1}`}
                            aria-pressed={work.active === g}
                            disabled={off}
                            onClick={() => set(groupChosen(interaction, g))}
                        >{g + 1}</button>
                    ))}
                    <button type="button" className="kiosk-btn kiosk-group-new" disabled={off || activeEmpty} onClick={() => set(groupStarted(interaction))}>+ Nieuw groepje</button>
                </div>
            )}
            <div className="kiosk-groups-actions">
                <button
                    type="button"
                    className={`kiosk-btn kiosk-group-choose${made ? ' kiosk-btn-primary' : ''}${pulse ? ' kiosk-steps-pulse' : ''}`}
                    aria-pressed={choosing}
                    disabled={off || !made}
                    onClick={() => { if (!choosing) set(groupsDone(interaction)); }}
                >Groepjes kiezen</button>
                {choosing && <button type="button" className="kiosk-btn" disabled={off} onClick={() => set(groupsEdited(interaction))}>Groepjes aanpassen</button>}
                <button type="button" className="kiosk-btn" disabled={off || work.members.length === 0} onClick={() => set(groupsCleared(interaction))}>Opnieuw</button>
            </div>
            {stillMissing && <p className="kiosk-nudge" role="status">{nudge}</p>}
        </div>
    );
}
