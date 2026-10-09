import { ChartBar, Timer } from '@phosphor-icons/react';
import { resultsHidden, useOefenStore } from '../useOefenStore';
import { plannedTotal } from '../../services/oefenen/scheduler';

interface Props {
    now: number;
}

function formatClock(ms: number): string {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Progress, the countdown and the Stats button above the exercise.
export default function TopBar({ now }: Props) {
    const sessie = useOefenStore(s => s.sessie);
    const run = useOefenStore(s => s.run);
    const phase = useOefenStore(s => s.phase);
    const openStats = useOefenStore(s => s.openStats);
    if (!sessie || !run) return null;

    const made = run.stats.history.length;
    const total = plannedTotal(sessie);
    // The number of the exercise on screen; after Controleer it is the one just made. An
    // unanswered exercise (also on its second try, or behind a stats peek) is run.current.
    const at = run.current ? made + 1 : made;
    const shownAt = total !== null ? Math.min(at, total) : at;
    const left = run.timerEndsAt !== undefined ? run.timerEndsAt - now : null;
    const lastMinute = left !== null && left < 60_000;
    const statsHidden = resultsHidden(sessie, run);

    return (
        <header className="kiosk-topbar">
            <span className="kiosk-topbar-title">{sessie.title || 'Oefenmodus'}</span>
            <span className="kiosk-progress" aria-label={total !== null ? `Oefening ${shownAt} van ${total}` : `Oefening ${shownAt}`}>
                {total !== null ? `${shownAt} / ${total}` : shownAt}
            </span>
            <span className="kiosk-topbar-right">
                {left !== null && (
                    <span className={`kiosk-timer${lastMinute ? ' is-low' : ''}`} role="timer" aria-label={`Nog ${formatClock(left)}`}>
                        <Timer aria-hidden /> {formatClock(left)}
                    </span>
                )}
                {!statsHidden && phase !== 'stats' && (
                    <button type="button" className="kiosk-btn kiosk-btn-quiet" onClick={openStats}>
                        <ChartBar aria-hidden /> Resultaten
                    </button>
                )}
            </span>
        </header>
    );
}
