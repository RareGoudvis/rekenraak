import { ArrowCounterClockwise, CheckCircle, XCircle } from '@phosphor-icons/react';
import { FLASH_MS } from '../useOefenStore';

export type FlashKind = 'juist' | 'fout' | 'retry';

interface Props {
    kind: FlashKind;
    onSkip(): void;
}

const TEXT: Record<FlashKind, string> = { juist: 'Juist!', fout: 'Fout', retry: 'Fout — probeer nog eens' };

// Juist / fout only, never the right answer (owner decision). It flashes over the answer panel
// and moves on by itself; a tap (or Enter, in Kiosk) skips the wait, the bar shows it running out.
export default function FeedbackOverlay({ kind, onSkip }: Props) {
    const ok = kind === 'juist';
    return (
        <div className={`kiosk-feedback ${ok ? 'is-ok' : 'is-wrong'}${kind === 'retry' ? ' is-retry' : ''}`}
            role="status" aria-live="assertive" onClick={onSkip}
            style={{ '--flash-ms': `${FLASH_MS[kind]}ms` } as React.CSSProperties}>
            <span className="kiosk-feedback-icon" aria-hidden>
                {ok ? <CheckCircle weight="fill" /> : kind === 'retry' ? <ArrowCounterClockwise weight="bold" /> : <XCircle weight="fill" />}
            </span>
            <span className="kiosk-feedback-text">{TEXT[kind]}</span>
            <span className="kiosk-feedback-bar" aria-hidden />
        </div>
    );
}
