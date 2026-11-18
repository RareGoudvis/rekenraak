import { subjectFor } from '../../services/oefenen/subjects';
import { useOefenStore } from '../useOefenStore';
import './subjectCard.css';

interface Props {
    typeId: string;
    exercise: unknown;
    constraints: Record<string, unknown>;
    instruction: string;
}

// A subject's card (Frans): the prompt as big words, "Jos ___ (heeft)", instead of a sheet viewer. The pupil's pick
// stands in the blank while answering, the right answer once it is checked, so the sentence reads as it should.
export default function SubjectCard({ typeId, exercise, constraints, instruction }: Props) {
    const phase = useOefenStore(s => s.phase);
    const picked = useOefenStore(s => s.input[0] ?? '');
    const subject = subjectFor(typeId);
    const prompt = subject?.prompt(exercise, constraints);
    const checked = phase === 'feedback' || phase === 'steps';
    const shown = phase === 'exercise' ? picked : checked ? subject?.kiosk.answerOf(exercise, constraints)[0] ?? '' : '';
    const blank = (
        <span className={`kiosk-subject-blank${shown ? ' is-filled' : ''}${checked ? ' is-right' : ''}`} aria-label={shown ? undefined : 'open plek'}>
            {shown || ' '}
        </span>
    );
    return (
        <div className="kiosk-card">
            <p className="kiosk-instruction">{instruction}</p>
            <div className="kiosk-card-body">
                {prompt ? (
                    <div className="kiosk-subject" aria-live="polite">
                        <p className="kiosk-subject-prompt">
                            <span className="kiosk-subject-lead">{prompt.lead}</span>
                            {/* The blank and the bracket wrap together: "Milan en Lars" over "___ (zijn)". */}
                            <span className="kiosk-subject-rest">
                                {!prompt.ask && blank}
                                {prompt.hint && <span className="kiosk-subject-hint">{prompt.hint}</span>}
                            </span>
                        </p>
                        {prompt.ask && <p className="kiosk-subject-prompt is-ask"><span className="kiosk-subject-ask">{prompt.ask}</span>{blank}</p>}
                    </div>
                ) : <p className="kiosk-card-fallback">Deze oefening kan niet getoond worden.</p>}
            </div>
        </div>
    );
}
