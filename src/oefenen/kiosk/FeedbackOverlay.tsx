import { ArrowCounterClockwise, CheckCircle, XCircle } from '@phosphor-icons/react';
import { FLASH_MS, HINT_MS } from '../useOefenStore';

export type FlashKind = 'juist' | 'fout' | 'retry';

interface Props {
    kind: FlashKind;
    onSkip(): void;
    // The descriptor's review hint ("Zijn alle groepjes even groot?"); the flash stays HINT_MS longer for it.
    hint?: string | null;
}

const TEXT: Record<FlashKind, string> = { juist: 'Juist!', fout: 'Fout', retry: 'Fout, probeer nog eens' };

// Juist / fout only, never the right answer; worked steps come after it, in StepsPanel (owner decision 2026-11-12). It flashes over the answer panel
// and moves on by itself; a tap (or Enter, in Kiosk) skips the wait, the bar shows it running out.
export default function FeedbackOverlay({ kind, onSkip, hint }: Props) {
    const ok = kind === 'juist';
    return (
        <div className={`kiosk-feedback ${ok ? 'is-ok' : 'is-wrong'}${kind === 'retry' ? ' is-retry' : ''}`}
            role="status" aria-live="assertive" onClick={onSkip}
            style={{ '--flash-ms': `${FLASH_MS[kind] + (hint ? HINT_MS : 0)}ms` } as React.CSSProperties}>
            <span className="kiosk-feedback-icon" aria-hidden>
                {ok ? <CheckCircle weight="fill" /> : kind === 'retry' ? <ArrowCounterClockwise weight="bold" /> : <XCircle weight="fill" />}
            </span>
            <span className="kiosk-feedback-text">{TEXT[kind]}</span>
            {hint && <span className="kiosk-feedback-hint">{hint}</span>}
            <span className="kiosk-feedback-bar" aria-hidden />
        </div>
    );
}
