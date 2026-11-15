import { Fragment, type CSSProperties, type ReactNode } from 'react';
import type { SpelChoiceView, SpelVisual as Visual } from './content/pack';
import { answerTextOf, formatSpelNumber, isOperator, rijFoldOf, rijText, signChunks, signFitOf, viewOfValue } from './spelFormat';
import { faceText, signClass } from './spelChoice';
import { useAnswerContext, type SignContextProps } from './signContext';
import KlokFace, { DigitaalFace } from './content/klok/KlokFace';
import BreukPicture from './content/breuken/BreukPicture';
import './spelVisual.css';

// The one place a game draws content pictures (content/pack.ts) and question lines. Skins call these and never
// switch on a kind, so a new pack adds a case here and every skin shows it.

/** A content picture; it fills the box the skin gives it. A rij is drawn by <SpelRij> (it is the whole question). */
export function SpelVisual({ visual }: { visual: Visual }): ReactNode {
    switch (visual.kind) {
        case 'klok': return <KlokFace h={visual.h} m={visual.m} mark={visual.mark} />;
        case 'digitaal': return <DigitaalFace text={visual.text} />;
        case 'breuk': return visual.with
            ? <span className="spel-breuk-pair"><BreukPicture n={visual.n} d={visual.d} kind={visual.shape} className="spel-breuk" /><BreukPicture n={visual.with.n} d={visual.with.d} kind={visual.shape} className="spel-breuk" /></span>
            : <BreukPicture n={visual.n} d={visual.d} kind={visual.shape} className="spel-breuk" />;
        case 'rij': return <SpelRij items={visual.items} />;
    }
}

// A breuk written "3/4" in a line or on a face: stacked, as on the sheet (the slash stays in the text for aria and copy).
const FRACTION = /(\d+\/\d+)/;

/** Text with its breuken stacked ("3/4 ? 2/3", "Vereenvoudig: 6/8 = ?"). */
export function SpelText({ text }: { text: string }): ReactNode {
    if (!FRACTION.test(text)) return text;
    return text.split(FRACTION).map((part, i) => {
        if (i % 2 === 0) return part;
        const [n, d] = part.split('/');
        return <span key={i} className="spel-frac"><span className="spel-frac-n">{n}</span><span className="spel-frac-bar">/</span><span className="spel-frac-d">{d}</span></span>;
    });
}

/** What a choice shows on its target (a balloon, a parcel, a mole). */
export function SpelChoiceFace({ value, view }: { value: string; view?: SpelChoiceView }): ReactNode {
    if (view?.visual) return <SpelVisual visual={view.visual} />;
    // A phrase wraps between its words (and inside a long number word), never inside "2 u 15 min"; words read in the pupil font.
    if (view?.text !== undefined) return <span className="spel-face-text"><SpelLine text={faceText(view.text)} /></span>;
    return formatSpelNumber(value);
}

/** A getallenrij as number tiles, the open one marked (or holding `answer`); folds into two even rows where it must. */
export function SpelRij({ items, answer }: { items: readonly string[]; answer?: ReactNode }): ReactNode {
    const fold = rijFoldOf(items);
    return (
        <span className={`spel-rij is-${fold}`} style={{ '--rij-half': Math.ceil(items.length / 2) } as CSSProperties} role="img" aria-label={rijText(items)}>
            {items.map((s, i) => (s === '?'
                ? <span key={i} className={`spel-rij-tile is-open${answer !== undefined ? ' is-filled' : ''}`}>{answer ?? '?'}</span>
                : <span key={i} className="spel-rij-tile">{s}</span>))}
        </span>
    );
}

// A word of a sentence (letters, no digit, €, operator or slot): it reads in the pupil font.
const isWord = (w: string) => /\p{L}/u.test(w) && !/[\d€×÷]|^\?/.test(w);

/**
 * A question line that wraps only between words (never inside "7 + 5 = ?" or "€ 7,50"), with `slot` in place of its
 * answer's "?" (no slot: the "?" itself). The end screen's table, the help and every sign use it.
 */
export function SpelLine({ text, slot, breakAtRelation = false }: { text: string; slot?: ReactNode; breakAtRelation?: boolean }): ReactNode {
    const chunks = signChunks(text, breakAtRelation);
    const slotAt = (c: string) => c.split('\u00A0').findIndex(w => /^\?[.,:;!)]*$/.test(w));
    const slotChunk = slot === undefined ? -1 : chunks.findIndex(c => slotAt(c) >= 0);
    // A ? glued to a word ("2/3?4/5"): the answer simply takes its place.
    if (slot !== undefined && slotChunk < 0) {
        const [lhs, rhs = ''] = text.split('?');
        return <><SpelText text={lhs} />{slot}<SpelText text={rhs} /></>;
    }
    // Words read in the pupil font; numbers, operators, € and the slot keep the sheet's number font.
    const hasWord = chunks.map(c => c.split('\u00A0').some(isWord));
    return chunks.map((chunk, i) => {
        const words = chunk.split('\u00A0');
        const at = i === slotChunk ? slotAt(chunk) : -1;
        const body = !hasWord[i]
            ? (at < 0 ? <SpelText text={words.join(' ')} />
                : <><SpelText text={words.slice(0, at).join(' ')} />{at > 0 && ' '}{slot}{words[at].slice(1)}{at < words.length - 1 && ' '}<SpelText text={words.slice(at + 1).join(' ')} /></>)
            : words.map((w, k) => {
                const part = k === at ? <>{slot}{w.slice(1)}</> : <SpelText text={w} />;
                return <Fragment key={k}>{k > 0 && ' '}{isWord(w) ? part : <span className="spel-line-num">{part}</span>}</Fragment>;
            });
        const gap = i === 0 ? null : hasWord[i] || hasWord[i - 1] ? <span className="spel-line-gap"> </span> : ' ';
        // A sum or a measure with its unit ("? + 11 u 12 min = 20:43", "4 u 45 min") stays whole even where sentences may wrap.
        const whole = words.length > 1 && (words.some(isOperator) || /\d/.test(chunk));
        return <Fragment key={i}>{gap}<span className={`spel-line-chunk${hasWord[i] ? ' is-word' : ''}${whole ? ' is-whole' : ''}`}>{body}</span></Fragment>;
    });
}

/** A whole question as the end screen and the help show it: the rij as tiles, a picture beside its line, else the line. */
export function SpelQuestionLine({ question }: { question: { text: string; visual?: Visual } }): ReactNode {
    const v = question.visual;
    if (v?.kind === 'rij') return <SpelRij items={v.items} />;
    return <>{v && <span className={`spel-end-pic is-${v.kind}`}><SpelVisual visual={v} /></span>}<SpelLine text={question.text} /></>;
}

interface SignProps extends SignContextProps {
    // right / wrong: the sign shows the right answer.
    flash: boolean;
    // The skin's class for the answer on the sign (bal-sign-answer).
    answerClassName: string;
}

/** The sign's content: the sum ("7 + 5 = ?", the answer in place of ? after a tap), a row of tiles, or a picture question with its answer. */
export function SpelSign({ question, feedback, flash, choices, views, answerClassName, breakAtRelation }: SignProps): ReactNode {
    // A keypad skin hands no choices: the session's question (the same key) says how its answers read (€ 7,50, −9).
    const ctx = useAnswerContext(question, choices, views);
    const shown = flash && feedback ? feedback.expected : null;
    const view = shown === null ? undefined : viewOfValue(ctx, shown);
    const answer = shown === null ? undefined : <span className={answerClassName}><SpelText text={answerTextOf(ctx, shown)} /></span>;
    if (question.visual?.kind === 'rij') return <SpelRij items={question.visual.items} answer={answer} />;
    const pic = question.visual && <span className={`spel-sign-pic is-${question.visual.kind}`}><SpelVisual visual={question.visual} /></span>;
    const line = (slot?: ReactNode) => <SpelLine text={question.text} slot={slot} breakAtRelation={breakAtRelation} />;
    if (shown === null) return pic ? <>{pic}<span className="spel-sign-text">{line()}</span></> : line();
    // A picture answer joins the question; a text answer takes the place of the prompt beside a picture (or of the ?).
    if (view?.visual) return <>{pic}<span className="spel-sign-text">{line()}</span><span className={`${answerClassName} spel-sign-pic is-${view.visual.kind}`}><SpelVisual visual={view.visual} /></span></>;
    if (pic) return <>{pic}<span className={`${answerClassName} spel-sign-text`}><SpelText text={answerTextOf(ctx, shown)} /></span></>;
    return line(answer);
}

/**
 * A keypad skin's whole sign: the skin's own sign class (border, colours) on a line that stays inside its column at any
 * screen, its font fitted to the longest line (the sum with its answer, the rij of tiles); a sentence wraps between words.
 * answer = the right answer when the skin knows it without the session (a duel), so the size never jumps on the flash.
 */
export function SpelSignBox({ className, answer, ...sign }: SignProps & { className: string; answer?: string }): ReactNode {
    const ctx = useAnswerContext(sign.question, sign.choices, sign.views);
    const right = answer ?? ctx.answer ?? (sign.feedback ? sign.feedback.expected : undefined);
    const fit = signFitOf(sign.question, right === undefined ? '' : answerTextOf(ctx, right), sign.breakAtRelation);
    return (
        <div className="spel-sign-box">
            <p className={`${className} kiosk-math spel-sign-fit${fit.wrap ? ' is-wrap' : ''}${signClass(sign.question)}`} style={{ '--sign-chars': fit.chars } as CSSProperties} aria-live="polite">
                <SpelSign {...sign} />
            </p>
        </div>
    );
}
