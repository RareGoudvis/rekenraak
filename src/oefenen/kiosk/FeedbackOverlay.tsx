import { useEffect, useRef } from 'react';
import { CheckCircle, XCircle } from '@phosphor-icons/react';

interface Props {
    correct: boolean;
    onNext(): void;
}

// Juist / fout only, never the right answer (owner decision): the pupil tries the next one.
export default function FeedbackOverlay({ correct, onNext }: Props) {
    const nextRef = useRef<HTMLButtonElement>(null);
    // Enter on the focused button is "Volgende", so Controleer → Enter → Volgende → Enter.
    useEffect(() => { nextRef.current?.focus({ preventScroll: true }); }, []);
    return (
        <div className={`kiosk-feedback ${correct ? 'is-ok' : 'is-wrong'}`} role="status" aria-live="assertive">
            <span className="kiosk-feedback-icon" aria-hidden>{correct ? <CheckCircle weight="fill" /> : <XCircle weight="fill" />}</span>
            <span className="kiosk-feedback-text">{correct ? 'Juist!' : 'Fout'}</span>
            <button ref={nextRef} type="button" className="kiosk-btn kiosk-btn-primary kiosk-btn-big" onClick={onNext}>
                Volgende
            </button>
        </div>
    );
}
