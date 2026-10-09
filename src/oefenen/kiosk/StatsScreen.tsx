import { useState } from 'react';
import { useOefenStore } from '../useOefenStore';
import StorageBanner from './StorageBanner';
import { loadRuns, summary, viablePlannedTotal } from '../../services/oefenen/stats';
import { attemptsOf, type OefenError, type OefenRun, type OefenSessie } from '../../services/oefenen/types';

// The pupil's answer(s) in a Foutjes row: the first try, and what came of the second one.
function givenText(e: OefenError): string {
    if (e.secondTry) return `${e.given}, dan juist`;
    return e.second !== undefined ? `${e.given}, dan ${e.second}` : e.given;
}

// Per type gemaakt / juist / fout / %, then every mistake with the pupil's answer and the
// right one: one run, read-only. With 2 kansen, Juist splits into "Juist in één keer" and
// "Juist na 2e kans" (a retry still counts as juist).
function RunTables({ run, sessie }: { run: OefenRun; sessie: OefenSessie }) {
    const rows = summary(run.stats, sessie);
    const errors = rows.flatMap(r => r.errors.map(e => ({ ...e, label: r.label })));
    const retries = attemptsOf(sessie) === 2 || rows.some(r => r.secondTry > 0);
    return (
        <>
            <table className="kiosk-table">
                <thead>
                    <tr>
                        <th scope="col">Oefening</th><th scope="col">Gemaakt</th><th scope="col">Juist</th>
                        {retries && <><th scope="col">Juist in één keer</th><th scope="col">Juist na 2e kans</th></>}
                        <th scope="col">Fout</th><th scope="col">%</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(r => (
                        <tr key={r.slot}>
                            <th scope="row">{r.label}</th>
                            <td>{r.made}</td><td>{r.correct}</td>
                            {retries && <><td>{r.correct - r.secondTry}</td><td>{r.secondTry}</td></>}
                            <td>{r.wrong}</td>
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
                                    <td className={`kiosk-math${e.secondTry ? '' : ' is-given'}`}>{givenText(e)}</td>
                                    <td className="kiosk-math">{e.expected}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}
        </>
    );
}

const totals = (run: OefenRun, sessie: OefenSessie) => {
    const rows = summary(run.stats, sessie);
    return { made: rows.reduce((n, r) => n + r.made, 0), correct: rows.reduce((n, r) => n + r.correct, 0) };
};

// A run that stopped before its planned total (timer) says so: "7 van 8 juist (8 van 10 gemaakt)".
function scoreText(made: number, correct: number, planned: number | null): string {
    const of = planned !== null && made < planned ? ` (${made} van ${planned} gemaakt)` : '';
    return `${correct} van ${made} juist${of}`;
}

const whenText = (t: number) => new Date(t).toLocaleString('nl-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// Only a finished run has a duration; an abandoned one (no finishedAt) shows none.
function durationText(run: OefenRun): string | null {
    if (run.stats.finishedAt === undefined) return null;
    const sec = Math.max(0, Math.round((run.stats.finishedAt - run.stats.startedAt) / 1000));
    return sec < 60 ? `${sec} s` : `${Math.round(sec / 60)} min`;
}

// Mid-run it is a peek (Verder oefenen); after the timer or the last exercise it is the
// locked end screen the teacher reads, with the earlier runs of this device below.
export default function StatsScreen() {
    const sessie = useOefenStore(s => s.sessie);
    const run = useOefenStore(s => s.run);
    const phase = useOefenStore(s => s.phase);
    const { closeStats, restart, clear } = useOefenStore.getState();
    const [confirmClear, setConfirmClear] = useState(false);
    const [viewing, setViewing] = useState<OefenRun | null>(null);
    if (!sessie || !run) return null;

    const locked = phase === 'locked';
    // Earlier runs of this session on this device, newest first (the current one is the screen itself).
    const earlier = locked ? loadRuns(sessie.id).filter(r => r.index !== run.index).reverse() : [];
    const planned = viablePlannedTotal(sessie);

    if (viewing) {
        const t = totals(viewing, sessie);
        return (
            <section className="kiosk-stats" aria-labelledby="kiosk-stats-title">
                <div className="kiosk-stats-head">
                    <div>
                        <h1 id="kiosk-stats-title" className="kiosk-stats-title">{whenText(viewing.stats.startedAt)}</h1>
                        <p className="kiosk-stats-total">{t.made === 0 ? 'Geen oefeningen gemaakt.' : scoreText(t.made, t.correct, planned)}</p>
                    </div>
                    <button type="button" className="kiosk-btn kiosk-btn-primary" onClick={() => setViewing(null)}>Terug</button>
                </div>
                <RunTables run={viewing} sessie={sessie} />
            </section>
        );
    }

    const { made, correct } = totals(run, sessie);
    const timeUp = run.timerEndsAt !== undefined && (run.stats.finishedAt ?? 0) >= run.timerEndsAt;
    const title = !locked ? 'Resultaten' : timeUp ? 'De tijd is om!' : 'Klaar!';

    return (
        <section className="kiosk-stats" aria-labelledby="kiosk-stats-title">
            {/* Mid-run the kiosk shows the banner above the stats already. */}
            {locked && <StorageBanner />}
            <div className="kiosk-stats-head">
                <div>
                    <h1 id="kiosk-stats-title" className="kiosk-stats-title">{title}</h1>
                    <p className="kiosk-stats-total">{made === 0 ? 'Nog geen oefeningen gemaakt.' : scoreText(made, correct, planned)}</p>
                </div>
                {!locked && (
                    <button type="button" className="kiosk-btn kiosk-btn-primary" onClick={closeStats}>Verder oefenen</button>
                )}
            </div>

            <RunTables run={run} sessie={sessie} />

            {earlier.length > 0 && (
                <>
                    <h2 className="kiosk-stats-sub">Vorige keren</h2>
                    <ul className="kiosk-runs">
                        {earlier.map(r => {
                            const t = totals(r, sessie);
                            const dur = durationText(r);
                            return (
                                <li key={r.index}>
                                    <button type="button" className="kiosk-btn kiosk-run" onClick={() => setViewing(r)}>
                                        <span>{whenText(r.stats.startedAt)}</span>
                                        <span className="kiosk-run-score">{t.correct} van {t.made} juist{dur ? ` · ${dur}` : ''}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
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
