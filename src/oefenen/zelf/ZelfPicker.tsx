import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Play } from '@phosphor-icons/react';
import { useEenvoudigData } from '../../components/eenvoudig/useEenvoudigData';
import { EENVOUDIG_NAV } from '../../config/eenvoudig/nav';
import { LEERJAREN, type Leerjaar } from '../../config/gradePresets';
import { useOefenStore } from '../useOefenStore';
import { tryFullscreen } from '../kiosk/fullscreen';
import KidBackdrop from '../kiosk/KidBackdrop';
import { useSpelStore, type SpelStart } from '../spelen/useSpelStore';
import { choiceCanPlay, spelContentOf } from '../spelen/spelQuestion';
import SpelOptions from '../spelen/SpelOptions';
import { pickerToday } from '../spelen/seasons';
import type { SKINS } from '../spelen/skins/registry';
import { SECTION_TINT, topicIcon } from './topicIcons';
import LeerjaarBar from './LeerjaarBar';
import TopicCard from './TopicCard';
import GameRow from './GameRow';
import { gamesFor, topicCardOf } from './topicGames';
import { gradeTint, readGrade, saveGrade } from './zelfGrade';
import { ZELF_COUNTS, ZELF_MINUTES, buildZelfSessie, choiceMayHaveMab, choicesFor, modeKey, usableVariants, type ZelfChoice, type ZelfMode } from './zelfSessie';

type Skin = (typeof SKINS)[number];

const sectionTint = (name: string | undefined) => ({ '--tint': name ? SECTION_TINT[name] : undefined } as React.CSSProperties);

const SECTION_OF_TOPIC: Record<string, string> = Object.fromEntries(EENVOUDIG_NAV.flatMap(sec => sec.topics.map(t => [t.id, sec.name])));

// The two ways to practise, drawn like the game cards: a sheet with lines, two balloons.
const OEFENEN_ICON = (
    <svg className="zelf-panel-icon" viewBox="0 0 72 72" aria-hidden>
        <circle className="zm-paper" cx="36" cy="36" r="32" />
        <rect className="zm-sheet" x="20" y="16" width="32" height="40" rx="4" />
        <path className="zm-line" d="M27 28 h18 M27 36 h18 M27 44 h11" />
    </svg>
);
const SPELEN_ICON = (
    <svg className="zelf-panel-icon" viewBox="0 0 72 72" aria-hidden>
        <circle className="zm-paper" cx="36" cy="36" r="32" />
        <path className="zm-string" d="M29 43 q-2 8 4 14 M45 46 q2 6 -6 11" />
        <ellipse className="zm-b0" cx="29" cy="30" rx="11" ry="13" />
        <ellipse className="zm-b1" cx="45" cy="34" rx="10" ry="12" />
    </svg>
);

// The page opened without a link: a pupil picks leerjaar (the top bar, remembered) and onderwerp (a picture card),
// then on one Keuze screen the oefening and either Automatiseren (how much) or a game from the games bar.
export default function ZelfPicker() {
    const data = useEenvoudigData();
    const openZelf = useOefenStore(s => s.openZelf);
    // Back from a game (Ander spel, Terug): the Keuze screen of the same choice, the games bar in view.
    const [from] = useState(() => useSpelStore.getState().pickerAt);
    useEffect(() => { useSpelStore.getState().takePickerAt(); }, []);
    const [grade, setGrade] = useState<Leerjaar | null>(() => from?.grade ?? readGrade());
    const [topicId, setTopicId] = useState<string | null>(from?.topicId ?? null);
    const [choice, setChoice] = useState<ZelfChoice | null>(from?.choice ?? null);
    // A game whose options come first (Kasteel, Zombies, Bom …).
    const [setup, setSetup] = useState<Skin | null>(null);
    const [mode, setMode] = useState<ZelfMode>({ kind: 'count', n: 5 });
    const [mab, setMab] = useState(true);
    // MAB above the steps: leerjaar 1–3 and a choice with whole sums up to 1000 (owner, 2026-11-13).
    const mabPossible = useMemo(() => choice !== null && grade !== null && grade <= 3 && choiceMayHaveMab(choice), [choice, grade]);
    // Every game that plays the chosen oefening (none = no games bar).
    const games = useMemo(
        () => (choice && grade !== null && choiceCanPlay(choice, grade) ? gamesFor(spelContentOf(choice, grade), pickerToday()) : []),
        [choice, grade],
    );
    // A tapped choice brings the next steps into view (a long list of choices pushes them below the fold).
    const nextRef = useRef<HTMLDivElement>(null);
    const gamesRef = useRef<HTMLElement>(null);
    const tapped = useRef(false);
    useEffect(() => {
        if (!tapped.current || !choice) return;
        tapped.current = false;
        const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        nextRef.current?.scrollIntoView?.({ block: 'nearest', behavior: smooth ? 'smooth' : 'auto' });
    }, [choice]);
    // Back from a game: the games bar in view, where the pupil picks another one.
    const cameBack = useRef(!!from);
    useEffect(() => {
        if (!cameBack.current || !gamesRef.current) return;
        cameBack.current = false;
        gamesRef.current.scrollIntoView?.({ block: 'nearest' });
    });

    // Before a leerjaar is picked the topics of every leerjaar show (dimmed).
    const anyGrade = useMemo(() => data && new Set(LEERJAREN.flatMap(g => [...usableVariants(data, g).keys()])), [data]);
    const shown = useMemo(() => (grade !== null ? (data ? new Set(usableVariants(data, grade).keys()) : null) : anyGrade), [data, grade, anyGrade]);
    // The picture and stickers per topic card (topicGames.ts).
    const cards = useMemo(() => new Map(data && shown ? [...shown].map(id => [id, topicCardOf(data, grade, id)] as const) : []), [data, shown, grade]);
    const choices = data && grade !== null && topicId !== null ? choicesFor(data, grade, topicId) : [];
    const back = () => {
        if (setup) setSetup(null);
        else { setTopicId(null); setChoice(null); }
    };
    const bar = grade !== null && (
        <div className="zelf-bar">
            <button type="button" className="kiosk-btn kiosk-btn-quiet zelf-back" onClick={back}>
                <ArrowLeft aria-hidden /> Terug
            </button>
            <span className="kiosk-pill zelf-grade-chip">
                <span className="zelf-badge is-sm" style={gradeTint(grade)} aria-hidden>{grade}</span>
                Leerjaar {grade}
            </span>
        </div>
    );

    if (topicId === null) {
        const pickGrade = (g: Leerjaar) => { setGrade(g); saveGrade(g); };
        return (
            <>
                <KidBackdrop clouds={false} grade={grade} />
                <main key="home" className="oefen-center zelf zelf-home">
                    <LeerjaarBar grade={grade} onPick={pickGrade} />
                    {/* The title waits for the topics, so "Wat wil je oefenen?" always comes with them. */}
                    {!data || !shown ? <p className="oefen-lead">Even laden…</p> : <h1 className="oefen-title zelf-home-title">Wat wil je oefenen?</h1>}
                    {data && shown && (
                        // No leerjaar yet: every topic shows, dimmed and out of reach until a number is picked.
                        <div className={`zelf-topics${grade === null ? ' is-dim' : ''}`} inert={grade === null}>
                            {EENVOUDIG_NAV.map(section => {
                                const list = section.topics.filter(t => shown.has(t.id));
                                if (!list.length) return null;
                                return (
                                    <section key={section.name} className="zelf-section" aria-label={section.name} style={sectionTint(section.name)}>
                                        <h2 className="zelf-section-title">{section.name}</h2>
                                        <div className="zelf-grid zelf-grid-topics">
                                            {list.map(t => (
                                                <TopicCard key={t.id} id={t.id} label={t.label} game={cards.get(t.id)?.game ?? null} hasGame={!!cards.get(t.id)?.hasGame}
                                                    disabled={grade === null} onPick={() => {
                                                        if (grade === null) return;
                                                        setTopicId(t.id);
                                                        // A topic with one oefening needs no pick: the screen opens on its next step.
                                                        const only = choicesFor(data, grade, t.id);
                                                        setChoice(only.length === 1 ? only[0] : null);
                                                    }} />
                                            ))}
                                        </div>
                                    </section>
                                );
                            })}
                        </div>
                    )}
                    <p className="zelf-home-note">Heb je een link of QR-code van je juf of meester? Open die dan.</p>
                </main>
            </>
        );
    }

    if (!data || grade === null) return <><KidBackdrop grade={grade} /><main className="oefen-center zelf">{bar}<p className="oefen-lead">Even laden…</p></main></>;

    const topicLabel = EENVOUDIG_NAV.flatMap(sec => sec.topics).find(t => t.id === topicId)?.label ?? '';
    const { icon: topicGlyph, size: topicSize } = topicIcon(topicId, topicLabel);

    // A game card: that game with this oefening; Nakijken, Ander spel and Terug come back to this screen.
    const play = (skin: Skin, meta: SpelStart['meta'] = skin.meta) => {
        if (!choice) return;
        if (meta === skin.meta && meta.options?.length) { setSetup(skin); return; }
        tryFullscreen();
        useSpelStore.getState().start({ choice, grade, topicId, meta });
    };

    if (setup && choice) {
        return (
            <>
                <KidBackdrop clouds={false} grade={grade} />
                <main key="setup" className="oefen-center zelf">
                    {bar}
                    <p className="oefen-lead">{topicLabel}: {choice.label}</p>
                    <SpelOptions meta={setup.meta} onStart={meta => play(setup, meta)} onBack={() => setSetup(null)} />
                </main>
            </>
        );
    }

    const options: { mode: ZelfMode; text: string }[] = [
        ...ZELF_COUNTS.map(n => ({ mode: { kind: 'count', n } as ZelfMode, text: `${n} oefeningen` })),
        ...ZELF_MINUTES.map(min => ({ mode: { kind: 'timer', min } as ZelfMode, text: `${min} ${min === 1 ? 'minuut' : 'minuten'}` })),
    ];
    const group = (kind: ZelfMode['kind'], label: string) => (
        <div role="group" aria-label={label} className="zelf-amount-row">
            {options.filter(o => o.mode.kind === kind).map(o => (
                <button key={modeKey(o.mode)} type="button" aria-pressed={modeKey(o.mode) === modeKey(mode)} className="zelf-choice"
                    onClick={() => setMode(o.mode)}>{o.text}</button>
            ))}
        </div>
    );

    return (
        <>
            <KidBackdrop clouds={false} grade={grade} />
            {/* Its own element per screen: a fresh scroll position, never the topics list's. */}
            <main key={`keuze-${topicId}`} className="oefen-center zelf">
                {bar}
                <div className="zelf-head" style={sectionTint(SECTION_OF_TOPIC[topicId])}>
                    <span className={`zelf-badge is-lg${topicSize}`} aria-hidden>{topicGlyph}</span>
                    <h1 className="oefen-title">{topicLabel}</h1>
                </div>
                <div className="zelf-steps">
                    {choices.length > 1 && (
                        <section className="zelf-step">
                            <h2 className="zelf-step-title"><span className="zelf-step-num" aria-hidden>1</span>Welke oefening?</h2>
                            <div className="zelf-grid">
                                {choices.map(c => (
                                    <button key={c.key} type="button" className="zelf-choice" aria-pressed={choice?.key === c.key}
                                        onClick={() => { tapped.current = true; setChoice(c); }}>{c.label}</button>
                                ))}
                            </div>
                        </section>
                    )}
                    {choice && (
                        <div ref={nextRef} className="zelf-steps">
                            {/* Automatiseren: plain practice, how much, then start. */}
                            <section className="zelf-step zelf-panel" aria-labelledby="zelf-auto-title">
                                <div className="zelf-panel-head">
                                    {OEFENEN_ICON}
                                    <div className="zelf-panel-text">
                                        <h2 id="zelf-auto-title" className="zelf-panel-title">Automatiseren</h2>
                                        <p className="zelf-panel-why">Rustig oefenen, met hulp na een foutje</p>
                                    </div>
                                </div>
                                <div className="zelf-amount-row is-stack">
                                    {group('count', 'Aantal oefeningen')}
                                    <div className="zelf-amount-time">
                                        <span className="zelf-amount-or">of op tijd</span>
                                        {group('timer', 'Aantal minuten')}
                                    </div>
                                </div>
                                <div className="zelf-amounts">
                                    {mabPossible ? (
                                        <button type="button" className="kiosk-btn zelf-mab" aria-pressed={mab} onClick={() => setMab(m => !m)}>
                                            {mab ? 'Hulp met MAB-blokjes: aan' : 'Hulp met MAB-blokjes: uit'}
                                        </button>
                                    ) : <span />}
                                    <button type="button" className="kiosk-btn kiosk-btn-primary kiosk-btn-big zelf-go"
                                        onClick={() => { tryFullscreen(); openZelf(buildZelfSessie(choice, mode, Date.now(), grade, mabPossible && !mab)); }}>
                                        <Play weight="fill" aria-hidden /> Begin met oefenen
                                    </button>
                                </div>
                            </section>
                            {games.length > 0 && (
                                <section ref={gamesRef} className="zelf-step zelf-panel is-games" aria-labelledby="zelf-games-title">
                                    <div className="zelf-panel-head">
                                        {SPELEN_ICON}
                                        <div className="zelf-panel-text">
                                            <h2 id="zelf-games-title" className="zelf-panel-title">Of speel een spel</h2>
                                        </div>
                                    </div>
                                    <GameRow games={games} onPlay={skin => play(skin)} />
                                </section>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
