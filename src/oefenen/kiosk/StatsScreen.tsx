import { useState } from 'react';
import { CheckCircle } from '@phosphor-icons/react';
import { useOefenStore } from '../useOefenStore';
import StorageBanner from './StorageBanner';
import StopButton from './StopButton';
import FullscreenExitButton from './FullscreenExitButton';
import { STAR_PATH } from './TopBar';
import { loadRunsFor, summary, viablePlannedTotal } from '../../services/oefenen/stats';
import { retiredSlots } from '../../services/oefenen/scheduler';
import { isZelfSessie, reviewSessieOf } from '../zelf/zelfSessie';
import { TUTOR_PAGE, isTutorSessie } from '../../services/oefenen/tutorOefenLink';
import { attemptsOf, type OefenError, type OefenRun, type OefenSessie, type OefenSummaryRow } from '../../services/oefenen/types';

// The pupil's answer(s) in a Foutjes row: the first try, and what came of the second one.
function givenText(e: OefenError): string {
    if (e.secondTry) return `${e.given}, dan juist`;
    return e.second !== undefined ? `${e.given}, dan ${e.second}` : e.given;
}

// A self-made choice mixes many variants that share a label: show what was done, once per label.
function mergeByLabel(rows: OefenSummaryRow[]): OefenSummaryRow[] {
    const out = new Map<string, OefenSummaryRow>();
    for (const r of rows.filter(x => x.made > 0)) {
        const a = out.get(r.label);
        if (!a) { out.set(r.label, { ...r, errors: [...r.errors] }); continue; }
        a.made += r.made; a.correct += r.correct; a.wrong += r.wrong; a.secondTry += r.secondTry;
        a.errors.push(...r.errors);
        a.pct = Math.round((a.correct / a.made) * 100);
    }
    return [...out.values()];
}

// Per type gemaakt / juist / fout / %, then every mistake with the pupil's answer and the
// right one: one run, read-only. With 2 kansen, Juist splits into "Juist in één keer" and
// "Juist na 2e kans" (a retry still counts as juist).
function RunTables({ run, sessie }: { run: OefenRun; sessie: OefenSessie }) {
    const retired = retiredSlots(sessie);
    // A retired type is not listed unless this run made some of it (an old run, before the type was retired).
    const listed = summary(run.stats, sessie).filter(r => r.made > 0 || !retired.has(r.slot));
    const rows = isZelfSessie(sessie) ? mergeByLabel(listed) : listed;
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
    const sum = (f: (r: OefenSummaryRow) => number) => rows.reduce((n, r) => n + f(r), 0);
    return { made: sum(r => r.made), correct: sum(r => r.correct), wrong: sum(r => r.wrong), secondTry: sum(r => r.secondTry) };
};

// Three stars for 90 % juist, two for 60 %, one for any juist.
const starsOf = (made: number, correct: number) => (!made || !correct ? 0 : correct / made >= 0.9 ? 3 : correct / made >= 0.6 ? 2 : 1);

// The finished run at a glance (the Klaar mockup): stars, the title, the score line, Juist / Met hulp / Nog oefenen.
function EndHero({ title, line, made, t, retries }: { title: string; line: string; made: number; t: ReturnType<typeof totals>; retries: boolean }) {
    const stars = starsOf(made, t.correct);
    return (
        <div className="kiosk-end-hero">
            {made > 0 && (
                <div className="kiosk-end-stars" role="img" aria-label={`${stars} van de 3 sterren`}>
                    {[0, 1, 2].map(i => (
                        <svg key={i} viewBox="0 0 24 24" aria-hidden><path className={`kiosk-star${i < stars ? '' : ' is-empty'}`} d={STAR_PATH} /></svg>
                    ))}
                </div>
            )}
            <h1 id="kiosk-stats-title" className="kiosk-stats-title">{title}</h1>
            <p className="kiosk-stats-total">{line}</p>
            {made > 0 && (
                <dl className="kiosk-counters">
                    <div className="kiosk-counter is-ok"><dt>Juist</dt><dd>{t.correct}</dd></div>
                    {/* Met hulp = juist na de 2e kans (2 kansen); a run without it has no such column. */}
                    {retries && <div className="kiosk-counter"><dt>Met hulp</dt><dd>{t.secondTry}</dd></div>}
                    <div className="kiosk-counter"><dt>Nog oefenen</dt><dd>{t.wrong}</dd></div>
                </dl>
            )}
        </div>
    );
}

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

// Mid-run it is a peek (Verder oefenen, Stoppen when endless); after the timer, the last exercise or Stoppen it is the
// locked end screen the teacher reads, with the earlier runs of this device below.
export default function StatsScreen() {
    const sessie = useOefenStore(s => s.sessie);
    const run = useOefenStore(s => s.run);
    const phase = useOefenStore(s => s.phase);
    const { closeStats, restart, clear, load, openReview } = useOefenStore.getState();
    const missed = useOefenStore(s => s.missed);
    const [confirmClear, setConfirmClear] = useState(false);
    const [viewing, setViewing] = useState<OefenRun | null>(null);
    if (!sessie || !run) return null;

    const locked = phase === 'locked';
    // Earlier runs of this session on this device, newest first (the current one is the screen itself).
    const earlier = locked ? loadRunsFor(sessie).filter(r => r.index !== run.index).reverse() : [];
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

    const t = totals(run, sessie);
    const { made, correct } = t;
    const timeUp = run.timerEndsAt !== undefined && (run.stats.finishedAt ?? 0) >= run.timerEndsAt;
    const zelf = isZelfSessie(sessie);
    // Opened from the stappenhulp ("Nog meer van deze oefening"): the way back is the sheet.
    const fromSheet = isTutorSessie(sessie);
    // A pupil who chose alone gets the cheer for half or more juist; a teacher's link keeps its plain Klaar!.
    const title = !locked ? 'Resultaten' : timeUp ? 'De tijd is om!' : zelf && made > 0 && correct * 2 >= made ? 'Knap gedaan!' : 'Klaar!';
    const line = made === 0 ? 'Nog geen oefeningen gemaakt.' : scoreText(made, correct, planned);
    // Nakijken: this run's fouts again (kept in memory, so not after a reload); Zelf oefenen only, a teacher reads the locked screen.
    const review = locked && zelf && missed.length > 0;

    return (
        <section className="kiosk-stats" aria-labelledby="kiosk-stats-title">
            {/* Mid-run the kiosk shows the banner above the stats already. */}
            {locked && <StorageBanner />}
            {locked ? (
                <EndHero title={title} line={line} made={made} t={t} retries={attemptsOf(sessie) === 2 || t.secondTry > 0} />
            ) : (
                <div className="kiosk-stats-head">
                    <div>
                        <h1 id="kiosk-stats-title" className="kiosk-stats-title">{title}</h1>
                        <p className="kiosk-stats-total">{line}</p>
                    </div>
                    <div className="kiosk-stats-head-btns">
                        <StopButton />
                        <button type="button" className="kiosk-btn kiosk-btn-primary" onClick={closeStats}>Verder oefenen</button>
                    </div>
                </div>
            )}

            {/* Right under the counters, Nakijken first. Mid-run peek: Opnieuw / Wissen would let a pupil wipe the run, so they only exist on the locked screen. */}
            {locked && (
                <div className="kiosk-stats-actions">
                    {review && (
                        <button type="button" className="kiosk-btn kiosk-btn-help kiosk-btn-big" onClick={() => openReview(reviewSessieOf(sessie, missed.length), missed)}>
                            <CheckCircle weight="bold" aria-hidden /> Nakijken
                        </button>
                    )}
                    <button type="button" className="kiosk-btn" onClick={restart}>Opnieuw</button>
                    <FullscreenExitButton />
                    {/* tutor.html without a hash reopens the sheet it remembered on this device. */}
                    {fromSheet && <button type="button" className={`kiosk-btn${review ? '' : ' kiosk-btn-primary'}`} onClick={() => window.location.assign(TUTOR_PAGE)}>Terug naar je blad</button>}
                    {zelf && <button type="button" className={`kiosk-btn${review || fromSheet ? '' : ' kiosk-btn-primary'}`} onClick={() => load('')}>Andere oefening</button>}
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

        </section>
    );
}
