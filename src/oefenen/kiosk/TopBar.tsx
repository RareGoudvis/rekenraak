import { ChartBar, Timer } from '@phosphor-icons/react';
import { resultsHidden, useOefenStore } from '../useOefenStore';
import { viablePlannedTotal } from '../../services/oefenen/stats';
import StopButton from './StopButton';
import BackToPickerButton from './BackToPickerButton';
import FullscreenExitButton from './FullscreenExitButton';

interface Props {
    now: number;
}

// Up to this many exercises the progress also shows as dots; a longer run keeps the number alone.
const MAX_DOTS = 20;

function formatClock(ms: number): string {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export const STAR_PATH = 'M12 2 l3 6.4 7 .9 -5.1 4.8 1.3 7 -6.2 -3.5 -6.2 3.5 1.3 -7 -5.1 -4.8 7 -.9 z';

// Pills on the sky: Stoppen (endless sessions) / Terug naar begin (Zelf oefenen) and the title left, the progress
// dots in the middle, the countdown, the star count and Resultaten right.
export default function TopBar({ now }: Props) {
    const sessie = useOefenStore(s => s.sessie);
    const run = useOefenStore(s => s.run);
    const phase = useOefenStore(s => s.phase);
    const openStats = useOefenStore(s => s.openStats);
    if (!sessie || !run) return null;

    const made = run.stats.history.length;
    const total = viablePlannedTotal(sessie);
    // The number of the exercise on screen; after Controleer it is the one just made. An
    // unanswered exercise (also on its second try, or behind a stats peek) is run.current.
    const at = run.current ? made + 1 : made;
    const shownAt = total !== null ? Math.min(at, total) : at;
    const left = run.timerEndsAt !== undefined ? run.timerEndsAt - now : null;
    const lastMinute = left !== null && left < 60_000;
    const statsHidden = resultsHidden(sessie, run);
    // A star per juist; a test shows nothing about juist until the end.
    const stars = sessie.testMode ? null : run.stats.history.filter(h => h.correct).length;
    const dots = total !== null && total <= MAX_DOTS ? total : 0;

    return (
        <header className="kiosk-topbar">
            <span className="kiosk-topbar-left">
                {/* On the Resultaten peek Stoppen sits beside Verder oefenen instead. */}
                {phase !== 'stats' && <StopButton />}
                <BackToPickerButton />
                {/* A teacher's title; a self-picked run (no title) shows nothing, the pupil knows what they chose. */}
                {sessie.title && <span className="kiosk-topbar-title">{sessie.title}</span>}
            </span>
            <span className="kiosk-progress kiosk-pill" aria-label={total !== null ? `Oefening ${shownAt} van ${total}` : `Oefening ${shownAt}`}>
                {dots > 0 && (
                    <span className="kiosk-dots" aria-hidden>
                        {Array.from({ length: dots }, (_, i) => (
                            <span key={i} className={`kiosk-dot${i < made ? ' is-done' : i === made && run.current ? ' is-now' : ''}`} />
                        ))}
                    </span>
                )}
                <span>{total !== null ? `${shownAt} / ${total}` : shownAt}</span>
            </span>
            <span className="kiosk-topbar-right">
                <FullscreenExitButton />
                {left !== null && (
                    <span className={`kiosk-timer kiosk-pill${lastMinute ? ' is-low' : ''}`} role="timer" aria-label={`Nog ${formatClock(left)}`}>
                        <Timer aria-hidden /> {formatClock(left)}
                    </span>
                )}
                {stars !== null && (
                    <span className="kiosk-stars-count kiosk-pill" role="img" aria-label={`${stars} juist`}>
                        <svg viewBox="0 0 24 24" aria-hidden><path className="kiosk-star" d={STAR_PATH} /></svg>
                        <span aria-hidden>{stars}</span>
                    </span>
                )}
                {!statsHidden && phase !== 'stats' && (
                    <button type="button" className="kiosk-btn kiosk-btn-quiet kiosk-stats-btn" aria-label="Resultaten" onClick={openStats}>
                        <ChartBar aria-hidden /> <span className="kiosk-stats-text">Resultaten</span>
                    </button>
                )}
            </span>
        </header>
    );
}
