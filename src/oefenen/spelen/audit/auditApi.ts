import { loadEenvoudigData, type EenvoudigData } from '../../../config/eenvoudig/cards';
import { EENVOUDIG_NAV } from '../../../config/eenvoudig/nav';
import type { Leerjaar } from '../../../config/gradePresets';
import { nextExercise } from '../../../services/oefenen/scheduler';
import { buildZelfSessie, choicesFor, type ZelfChoice } from '../../zelf/zelfSessie';
import { mulberry32 } from '../distractors';
import { skinsFor } from '../accepts';
import { SKINS, skinById } from '../skins/registry';
import { resolveMeta } from '../skins/options';
import { choiceCanPlay, spelChoiceOf, spelContentOf, spelQuestionOf, type SpelQuestion } from '../spelQuestion';
import { useSpelStore } from '../useSpelStore';
import { useDuelStore } from '../skins/touwtrekken/duelStore';

// Dev-only presentation audit (present.html): every playable Zelf choice per leerjaar, a few real questions each, shown
// in a real skin, flash or end screen. A Playwright script drives window.__spelAudit and takes the screenshots.

interface Pick { grade: number; topic: string; label: string }

let data: EenvoudigData | null = null;
const ready = loadEenvoudigData().then(d => { data = d; });

const topics = () => EENVOUDIG_NAV.flatMap(s => s.topics).filter(t => t.hasCards).map(t => t.id);
const choiceOf = (p: Pick): ZelfChoice | undefined => choicesFor(data!, p.grade as Leerjaar, p.topic).find(c => c.label === p.label);

// A choice's questions as a game draws them: each played variant in turn, seeded.
function questionsOf(choice: ZelfChoice, grade: number, n: number, seed: number, choiceCount = 4): SpelQuestion[] {
    const played = spelChoiceOf(choice, grade);
    const s = buildZelfSessie(played, { kind: 'count', n: 10 }, seed, grade);
    const rng = mulberry32(seed);
    const seen = new Set<string>();
    const out: SpelQuestion[] = [];
    for (let i = 0; out.length < n && i < n * 12; i++) {
        const slot = i % s.types.length;
        const made = nextExercise(s, s.types[slot], seen, rng);
        const q = made && spelQuestionOf(s.types[slot], slot, made, choiceCount);
        if (q && made) { out.push(q); seen.add(made.key); }
    }
    return out;
}

const plain = (q: SpelQuestion) => ({
    text: q.text, answer: q.answer, kind: q.kind, choices: q.choices, visual: q.visual?.kind,
    views: q.views?.map(v => v.text ?? `[${v.visual?.kind}]`), leaf: undefined as string | undefined,
});

export function installAudit() {
    const audit = {
        ready,
        /** Every playable choice with its content, the games that take it and n sample questions. */
        list(n = 3) {
            const out = [];
            for (const grade of [1, 2, 3, 4, 5, 6]) for (const topic of topics()) for (const c of choicesFor(data!, grade as Leerjaar, topic)) {
                if (!choiceCanPlay(c, grade)) continue;
                const content = spelContentOf(c, grade)!;
                const played = spelChoiceOf(c, grade).vars;
                out.push({
                    grade, topic, label: c.label, leaves: [...new Set(played.map(v => v.leafId))], content,
                    skins: skinsFor(SKINS, content).map(s => s.meta.id),
                    questions: questionsOf(c, grade, n, 1000 + grade).map(plain),
                });
            }
            return out;
        },
        /** A real game screen: the skin on question qi of the choice, in play, the wrong flash, or the end screen with qi..qi+3 as mistakes. */
        // skin 'kasteel-duel' = Kasteel for 2 (its own screen); a duel screen gets the question on both halves.
        async show(p: Pick & { skin: string; phase: 'play' | 'wrong' | 'end'; qi?: number; seed?: number; chosen?: Record<string, string>; boardIndex?: number }) {
            const choice = choiceOf(p);
            const duelKasteel = p.skin === 'kasteel-duel';
            const entry = skinById(duelKasteel ? 'kasteel' : p.skin);
            if (!choice || !entry) return `missing ${!choice ? 'choice' : 'skin'}`;
            const meta = resolveMeta(entry.meta, duelKasteel ? { ...p.chosen, spelers: '2' } : p.chosen);
            const st = useSpelStore.getState();
            st.start({ choice, grade: p.grade as Leerjaar, topicId: p.topic, meta, now: Date.now() });
            if (meta.input === 'board') {
                if (p.phase === 'end') return 'board end: use a choice skin';
                // A later board's look (Honingraat: the meadow is board 2).
                if (p.boardIndex) useSpelStore.setState(s => ({ board: s.board && { ...s.board, index: p.boardIndex! } }));
                return 'ok';
            }
            const qs = questionsOf(choice, p.grade, (p.qi ?? 0) + 4, 1000 + p.grade, meta.choiceCount);
            const q = qs[p.qi ?? 0];
            if (!q) return 'no question';
            const wrong = q.choices.find(c => c !== q.answer) ?? '0';
            if (entry.Screen && (!entry.screenWhen || meta.chosen?.[entry.screenWhen.id] === entry.screenWhen.value)) {
                for (let i = 0; i < 100 && useDuelStore.getState().phase !== 'setup'; i++) await new Promise(r => setTimeout(r, 50));
                await new Promise(r => setTimeout(r, 300));
                useDuelStore.getState().start('samen');
                const side = { question: q, feedback: p.phase === 'wrong' ? { given: wrong, expected: q.answer, correct: false } : null, locked: false };
                const sides = useDuelStore.getState().sides;
                useDuelStore.setState({ sides: { left: { ...sides.left, ...side }, right: { ...sides.right, ...side } } });
                return 'ok';
            }
            if (p.phase === 'play') useSpelStore.setState({ question: q, phase: 'play', feedback: null });
            else if (p.phase === 'wrong') useSpelStore.setState({ question: q, phase: 'wrong', feedback: { given: wrong, expected: q.answer, correct: false } });
            else {
                const mistakes = qs.slice(p.qi ?? 0, (p.qi ?? 0) + 4).map(m => ({ question: m, given: m.choices.find(c => c !== m.answer) ?? '' }));
                useSpelStore.setState({ phase: 'end', mistakes, score: 7, outcome: 'done' });
            }
            return 'ok';
        },
    };
    (window as unknown as { __spelAudit: typeof audit }).__spelAudit = audit;
}
