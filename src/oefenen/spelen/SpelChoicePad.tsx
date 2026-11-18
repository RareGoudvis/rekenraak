import { useState, type CSSProperties } from 'react';
import type { SpelChoiceView } from './content/pack';
import { SpelChoiceFace } from './SpelVisual';
import { choiceLabel, faceChars } from './spelChoice';
import { formatSpelNumber } from './spelFormat';
import { PAD_MAX_WORD_CHARS } from './accepts';

interface Props {
    // The question's own choices (the session hands six) and how each looks.
    choices: readonly string[];
    views?: readonly SpelChoiceView[] | null;
    // A new question clears the tapped mark.
    questionKey: string;
    disabled: boolean;
    onAnswer(given: string): void;
    // During the flash: the tapped choice turns right or struck through, a missed right one is marked.
    feedback?: { given: string; expected: string; correct: boolean } | null;
    // The slot's own class (spel-keypad, duel-pad): the keypad's place, width and frame.
    className?: string;
    label?: string;
}

// A phrase this short ("kwart voor 10") keeps to one line on a key, as a word does; a longer one wraps between its words.
const ONE_LINE = PAD_MAX_WORD_CHARS;
// The longest line on any button, in characters: the CSS fits one font to it so the six read alike.
const padChars = (choices: readonly string[], views: Props['views']) =>
    Math.max(3, ...choices.map((c, i) => {
        const text = views?.[i]?.text;
        if (text === undefined) return formatSpelNumber(c).length;
        return text.length <= ONE_LINE ? text.length : faceChars(views![i]);
    }));

// Every choice one symbol (< = >): one row of big symbols, read left to right.
const SYMBOL = /^[<=>≤≥≠]$/;
const padKind = (choices: readonly string[], views: Props['views']) =>
    (views?.some(v => v?.visual) ? ' is-pictures' : choices.every(c => SYMBOL.test(views?.[choices.indexOf(c)]?.text ?? c)) ? ' is-symbols' : '');

// A keypad game on word, picture or symbol choices (Frans, the klok, < = >): the choices as big buttons in the keypad's place, a tap is the answer.
// Taps act on pointerdown (two children in a duel tap at once; a multi-touch screen drops the second click);
// a keyboard click (detail 0) still answers for a focused button.
export default function SpelChoicePad({ choices, views, questionKey, disabled, onAnswer, feedback = null, className = '', label = 'Kies het antwoord' }: Props) {
    const [tapped, setTapped] = useState<{ key: string; value: string } | null>(null);
    const picked = tapped?.key === questionKey ? tapped.value : null;
    const pick = (value: string) => {
        if (disabled) return;
        setTapped({ key: questionKey, value });
        onAnswer(value);
    };
    const valueOf = (e: React.SyntheticEvent) => (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-choice]')?.dataset.choice ?? null;
    const onDown = (e: React.PointerEvent) => {
        const v = valueOf(e);
        if (v === null) return;
        e.preventDefault();
        pick(v);
    };
    const onClick = (e: React.MouseEvent) => { const v = valueOf(e); if (v !== null && e.detail === 0) pick(v); };
    const markOf = (value: string) => {
        if (feedback) {
            if (feedback.given === value) return feedback.correct ? ' is-right' : ' is-wrong';
            if (!feedback.correct && feedback.expected === value) return ' is-answer';
            return '';
        }
        // Samen één som: a wrong tap waits out its lock with no flash; once free again every choice looks alike.
        return disabled && picked === value ? ' is-picked' : '';
    };
    return (
        <div className={`spel-pad${padKind(choices, views)}${disabled ? ' is-off' : ''}${className ? ` ${className}` : ''}`} role="group" aria-label={label}
            style={{ '--pad-chars': padChars(choices, views), '--pad-rows': Math.ceil(choices.length / 2), '--pad-rows-3': Math.ceil(choices.length / 3) } as CSSProperties}
            onPointerDown={onDown} onClick={onClick}>
            {choices.map((c, i) => (
                <button key={c} type="button" className={`spel-pad-key${views?.[i]?.visual ? ` is-picture is-${views[i].visual!.kind}` : ''}${markOf(c)}`} data-choice={c} disabled={disabled} aria-label={choiceLabel(c, views?.[i])}>
                    {views?.[i]?.visual ? <span className="spel-pad-pic"><SpelChoiceFace value={c} view={views[i]} /></span> : <SpelChoiceFace value={c} view={views?.[i] ?? undefined} />}
                </button>
            ))}
        </div>
    );
}
