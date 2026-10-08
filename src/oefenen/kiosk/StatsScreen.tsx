import { useState } from 'react';
import { useOefenStore } from '../useOefenStore';
import { summary } from '../../services/oefenen/stats';

// Per type gemaakt / juist / fout / %, then every mistake with the pupil's answer and the
// right one. Mid-run it is a peek (Verder oefenen); after the timer or the last exercise it
// is the locked end screen the teacher reads.
export default function StatsScreen() {
    const sessie = useOefenStore(s => s.sessie);
    const run = useOefenStore(s => s.run);
    const phase = useOefenStore(s => s.phase);
    const { closeStats, restart, clear } = useOefenStore.getState();
    const [confirmClear, setConfirmClear] = useState(false);
    if (!sessie || !run) return null;

    const locked = phase === 'locked';
    const rows = summary(run.stats, sessie);
    const made = rows.reduce((n, r) => n + r.made, 0);
    const correct = rows.reduce((n, r) => n + r.correct, 0);
    const errors = rows.flatMap(r => r.errors.map(e => ({ ...e, label: r.label })));
    const timeUp = run.timerEndsAt !== undefined && (run.stats.finishedAt ?? 0) >= run.timerEndsAt;
    const title = !locked ? 'Resultaten' : timeUp ? 'De tijd is om!' : 'Klaar!';

    return (
        <section className="kiosk-stats" aria-labelledby="kiosk-stats-title">
            <div className="kiosk-stats-head">
                <div>
                    <h1 id="kiosk-stats-title" className="kiosk-stats-title">{title}</h1>
                    <p className="kiosk-stats-total">{made === 0 ? 'Nog geen oefeningen gemaakt.' : `${correct} van ${made} juist`}</p>
                </div>
                {!locked && (
                    <button type="button" className="kiosk-btn kiosk-btn-primary" onClick={closeStats}>Verder oefenen</button>
                )}
            </div>

            <table className="kiosk-table">
                <thead>
                    <tr><th scope="col">Oefening</th><th scope="col">Gemaakt</th><th scope="col">Juist</th><th scope="col">Fout</th><th scope="col">%</th></tr>
                </thead>
                <tbody>
                    {rows.map(r => (
                        <tr key={r.slot}>
                            <th scope="row">{r.label}</th>
                            <td>{r.made}</td><td>{r.correct}</td><td>{r.wrong}</td>
                            <td>{r.pct === null ? '–' : `${r.pct} %`}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {errors.length > 0 && (
                <>
                    <h2 className="kiosk-stats-sub">Foutjes</h2>
                    <table className="kiosk-table kiosk-errors">
                        <thead>
                            <tr><th scope="col">Oefening</th><th scope="col">Jouw antwoord</th><th scope="col">Juist antwoord</th></tr>
                        </thead>
                        <tbody>
                            {errors.map((e, i) => (
                                <tr key={i}>
                                    <td className="kiosk-math">{e.exercise}</td>
                                    <td className="kiosk-math is-given">{e.given}</td>
                                    <td className="kiosk-math">{e.expected}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}

            {/* Mid-run peek: Opnieuw / Wissen would let a pupil wipe the run, so they only exist on the locked screen */}
            {locked && (
                <div className="kiosk-stats-actions">
                    <button type="button" className="kiosk-btn" onClick={restart}>Opnieuw</button>
                    {confirmClear ? (
                        <>
                            <button type="button" className="kiosk-btn kiosk-btn-danger is-armed" onClick={clear}>Ja, alles wissen</button>
                            <button type="button" className="kiosk-btn kiosk-btn-quiet" onClick={() => setConfirmClear(false)}>Annuleer</button>
                        </>
                    ) : (
                        <button type="button" className="kiosk-btn kiosk-btn-danger" onClick={() => setConfirmClear(true)}>Wissen</button>
                    )}
                </div>
            )}
        </section>
    );
}
