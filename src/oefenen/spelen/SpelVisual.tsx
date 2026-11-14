import type { ReactNode } from 'react';
import { formatMathNumber } from '../../services/math/formatters';
import type { SpelChoiceView, SpelVisual as Visual } from './content/pack';
import { viewFor } from './spelChoice';
import KlokFace, { DigitaalFace } from './content/klok/KlokFace';
import './spelVisual.css';

// The one place a game draws content pictures (content/pack.ts). Skins call these and never switch on a kind,
// so a new pack (breuken) adds a case here and every picture skin shows it.

/** A content picture; it fills the box the skin gives it. */
export function SpelVisual({ visual }: { visual: Visual }): ReactNode {
    switch (visual.kind) {
        case 'klok': return <KlokFace h={visual.h} m={visual.m} mark={visual.mark} />;
        case 'digitaal': return <DigitaalFace text={visual.text} />;
    }
}

/** What a choice shows on its target (a balloon, a parcel, a mole). */
export function SpelChoiceFace({ value, view }: { value: string; view?: SpelChoiceView }): ReactNode {
    if (view?.visual) return <SpelVisual visual={view.visual} />;
    if (view?.text !== undefined) return view.text;
    return formatMathNumber(Number(value));
}

interface SignProps {
    question: { text: string; visual?: Visual };
    feedback: { expected: string } | null;
    // right / wrong: the sign shows the right answer.
    flash: boolean;
    choices: readonly string[] | null;
    views?: readonly SpelChoiceView[] | null;
    // The skin's class for the answer on the sign (bal-sign-answer).
    answerClassName: string;
}

/** The sign's content: the sum ("7 + 5 = ?", the answer in place of ? after a tap) or a picture question with its answer. */
export function SpelSign({ question, feedback, flash, choices, views, answerClassName }: SignProps): ReactNode {
    const pic = question.visual && <span className={`spel-sign-pic is-${question.visual.kind}`}><SpelVisual visual={question.visual} /></span>;
    const view = flash && feedback ? viewFor(choices, views, feedback.expected) : undefined;
    const [lhs] = question.text.split('?');
    if (!flash || !feedback) return pic ? <>{pic}<span className="spel-sign-text">{question.text}</span></> : question.text;
    if (!view) return <>{lhs}<span className={answerClassName}>{formatMathNumber(Number(feedback.expected))}</span></>;
    // A picture answer joins the question; a text answer takes the place of the prompt (or of the ?).
    if (view.visual) return <>{pic}<span className="spel-sign-text">{question.text}</span><span className={`${answerClassName} spel-sign-pic is-${view.visual.kind}`}><SpelVisual visual={view.visual} /></span></>;
    if (pic) return <>{pic}<span className={`${answerClassName} spel-sign-text`}>{view.text}</span></>;
    return <>{lhs}<span className={answerClassName}>{view.text}</span></>;
}
