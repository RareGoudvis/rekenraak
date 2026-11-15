import type { SpelChoiceView, SpelVisual } from './content/pack';
import { answerTextOf, signFitOf, type AnswerContext } from './spelFormat';
import { useSpelStore } from './useSpelStore';

// The hooks behind the shared sign (SpelVisual.tsx): how a sign's answers read, and how wide its longest line is.

export interface SignContextProps {
    question: { text: string; visual?: SpelVisual; key?: string };
    feedback: { expected: string } | null;
    // A choice skin's options and how they look; a keypad skin leaves them out (the session's question knows them).
    choices?: readonly string[] | null;
    views?: readonly SpelChoiceView[] | null;
    // A very narrow sign (a zombie's): a long sum may wrap before its "=".
    breakAtRelation?: boolean;
}

/** How the sign's answers read: a choice skin's own choices and views, else the session's question of the same key. */
export function useAnswerContext(question: SignContextProps['question'], choices: SignContextProps['choices'], views: SignContextProps['views']): AnswerContext & { answer?: string } {
    const live = useSpelStore(s => s.question);
    if (choices) return { text: question.text, choices, views };
    return live && question.key !== undefined && live.key === question.key ? live : { text: question.text, choices: [] };
}

/** The sign's width in characters (spelFormat signFitOf) for a skin that sizes its own sign (Zombies): its --sign-chars. */
export function useSignChars(sign: Omit<SignContextProps, 'question'> & { question: SignContextProps['question'] | null }): number {
    const question = sign.question ?? { text: '' };
    const ctx = useAnswerContext(question, sign.choices, sign.views);
    const right = ctx.answer ?? sign.feedback?.expected;
    return signFitOf(question, right === undefined ? '' : answerTextOf(ctx, right), sign.breakAtRelation).chars;
}
