import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Play } from '@phosphor-icons/react';
import { useEenvoudigData } from '../../components/eenvoudig/useEenvoudigData';
import { EENVOUDIG_NAV } from '../../config/eenvoudig/nav';
import { LEERJAREN, type Leerjaar } from '../../config/gradePresets';
import { useOefenStore } from '../useOefenStore';
import { tryFullscreen } from '../kiosk/fullscreen';
import FullscreenExitButton from '../kiosk/FullscreenExitButton';
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
import { readRange, readTafels, saveRange, saveTafels } from './zelfPicks';
import {
    TAFELS_DEFAULT, ZELF_COUNTS, ZELF_MINUTES, ZELF_RANGES, buildZelfSessie, choiceMayHaveMab, choicesFor, isTafelTopic, modeKey, tafelChoice,
    tafelPickOf, tafelsOffer, usableVariants, zelfMaxOf, type TafelOp, type ZelfChoice, type ZelfMode,
} from './zelfSessie';

type Skin = (typeof SKINS)[number];

const sectionTint = (name: string | undefined) => ({ '--tint': name ? SECTION_TINT[name] : undefined } as React.CSSProperties);

// "10 000": thousands apart, never broken over two lines.
const fmtNumber = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');

const TAFEL_OPS: { op: TafelOp; text: string }[] = [{ op: 'x', text: 'Maal ×' }, { op: ':', text: 'Deel :' }, { op: 'beide', text: 'Allebei × en :' }];

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
    // "Tot hoeveel?" per leerjaar (remembered per device); leerjaar 1 and 4 offer two ranges.
    const [rangePick, setRangePick] = useState<Partial<Record<Leerjaar, number>>>({});
    const range = grade !== null ? rangePick[grade] ?? readRange(grade, ZELF_RANGES[grade]) : undefined;
    // "Welke tafels?" and × / : on a tafels topic (remembered per leerjaar; × or : follows the topic until the pupil picks).
    const [fromTafel] = useState(() => (from?.choice ? tafelPickOf(from.choice) : null));
    const [tafelPick, setTafelPick] = useState<number[] | null>(fromTafel?.tables ?? null);
    const [tafelOp, setTafelOp] = useState<TafelOp | null>(fromTafel?.op ?? null);
    const isTafel = topicId !== null && isTafelTopic(topicId);
    const tableKey = grade !== null ? (tafelPick ?? readTafels(grade, tafelsOffer(grade), TAFELS_DEFAULT)).join(',') : '';
    const tables = useMemo(() => (tableKey ? tableKey.split(',').map(Number) : []), [tableKey]);
    const op: TafelOp = tafelOp ?? (topicId && /Deeltafels$/.test(topicId) ? ':' : 'x');
    // The oefening the screen starts: the picked choice, or on a tafels topic the one the toggles make.
    const active = useMemo(
        () => (isTafel && grade !== null && topicId !== null ? tafelChoice(grade, topicId, tables, op) : choice),
        [isTafel, grade, topicId, tables, op, choice],
    );
    // A game whose options come first (Kasteel, Zombies, Bom …).
    const [setup, setSetup] = useState<Skin | null>(null);
    const [mode, setMode] = useState<ZelfMode>({ kind: 'count', n: 5 });
    const [mab, setMab] = useState(true);
    // MAB above the steps: leerjaar 1–3 and a choice with whole sums up to 1000 (owner, 2026-11-13).
    const mabPossible = useMemo(() => active !== null && grade !== null && grade <= 3 && choiceMayHaveMab(active), [active, grade]);
    // Every game that plays the chosen oefening (none = no games bar).
    const games = useMemo(
        () => (active && grade !== null && choiceCanPlay(active, grade) ? gamesFor(spelContentOf(active, grade), pickerToday()) : []),
        [active, grade],
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
    const choices = data && grade !== null && topicId !== null && !isTafel ? choicesFor(data, grade, topicId, range) : [];
    const back = () => {
        if (setup) setSetup(null);
        else { setTopicId(null); setChoice(null); setTafelOp(null); setTafelPick(null); }
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
            <FullscreenExitButton />
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
                                                        const only = isTafelTopic(t.id) ? [] : choicesFor(data, grade, t.id, range);
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
        if (!active) return;
        if (meta === skin.meta && meta.options?.length) { setSetup(skin); return; }
        tryFullscreen();
        useSpelStore.getState().start({ choice: active, grade, topicId, meta });
    };

    // Tot hoeveel: the card range each of the leerjaar's ranges gives this topic; a choice only where they differ.
    const ranges = ZELF_RANGES[grade];
    const maxes = ranges.map(r => zelfMaxOf(data, topicId, grade, r));
    const rangeShown = maxes.some(m => m !== null) ? zelfMaxOf(data, topicId, grade, range ?? ranges[0]) : null;
    const rangeChoice = ranges.length > 1 && maxes.every(m => m !== null) && new Set(maxes).size === ranges.length;
    const pickRange = (r: number) => {
        setRangePick(p => ({ ...p, [grade]: r }));
        saveRange(grade, r);
        // The same oefening in the new range when it has one; a topic with one oefening keeps it picked.
        const next = choicesFor(data, grade, topicId, r);
        setChoice(c => next.find(n => n.label === c?.label) ?? (next.length === 1 ? next[0] : null));
    };
    const setTables = (list: number[]) => { setTafelPick(list); saveTafels(grade, list); };
    const offer = tafelsOffer(grade);
    let stepNo = 0;
    const stepTitle = (text: string, id?: string) => (
        <h2 className="zelf-step-title" id={id}><span className="zelf-step-num" aria-hidden>{++stepNo}</span>{text}</h2>
    );

    if (setup && active) {
        return (
            <>
                <KidBackdrop clouds={false} grade={grade} />
                <main key="setup" className="oefen-center zelf">
                    {bar}
                    <p className="oefen-lead">{topicLabel}: {active.label}</p>
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
                {rangeShown !== null && (rangeChoice ? (
                    <div className="zelf-range" role="group" aria-labelledby="zelf-range-label">
                        <span id="zelf-range-label" className="zelf-range-label">Tot hoeveel?</span>
                        {ranges.map(r => (
                            <button key={r} type="button" className="zelf-choice zelf-range-btn" aria-pressed={r === range} onClick={() => pickRange(r)}>tot {fmtNumber(r)}</button>
                        ))}
                    </div>
                ) : <p className="zelf-range is-fixed"><span className="kiosk-pill zelf-range-pill">tot {fmtNumber(rangeShown)}</span></p>)}
                <div className="zelf-steps">
                    {isTafel && (
                        <>
                            <section className="zelf-step" aria-labelledby="zelf-tafels-title">
                                {stepTitle('Welke tafels?', 'zelf-tafels-title')}
                                <div className="zelf-tafels" role="group" aria-label="Welke tafels?">
                                    {offer.map(t => {
                                        const on = tables.includes(t);
                                        return (
                                            <button key={t} type="button" className="zelf-tafel" aria-pressed={on} aria-label={`Tafel van ${t}`}
                                                onClick={() => setTables(on ? tables.filter(x => x !== t) : [...tables, t].sort((a, b) => a - b))}>{t}</button>
                                        );
                                    })}
                                </div>
                                <div className="zelf-tafels-quick">
                                    <button type="button" className="kiosk-btn" onClick={() => setTables([...offer])}>Alle</button>
                                    <button type="button" className="kiosk-btn" onClick={() => setTables([])}>Geen</button>
                                </div>
                            </section>
                            <section className="zelf-step" aria-labelledby="zelf-op-title">
                                {stepTitle('Maal of deel?', 'zelf-op-title')}
                                <div className="zelf-grid zelf-ops" role="group" aria-labelledby="zelf-op-title">
                                    {TAFEL_OPS.map(o => (
                                        <button key={o.op} type="button" className="zelf-choice" aria-pressed={o.op === op} onClick={() => setTafelOp(o.op)}>{o.text}</button>
                                    ))}
                                </div>
                            </section>
                        </>
                    )}
                    {choices.length > 1 && (
                        <section className="zelf-step">
                            {stepTitle('Welke oefening?')}
                            <div className="zelf-grid">
                                {choices.map(c => (
                                    <button key={c.key} type="button" className="zelf-choice" aria-pressed={choice?.key === c.key}
                                        onClick={() => { tapped.current = true; setChoice(c); }}>{c.label}</button>
                                ))}
                            </div>
                        </section>
                    )}
                    {(active || isTafel) && (
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
                                    <button type="button" className="kiosk-btn kiosk-btn-primary kiosk-btn-big zelf-go" disabled={!active}
                                        onClick={() => { if (!active) return; tryFullscreen(); openZelf(buildZelfSessie(active, mode, Date.now(), grade, mabPossible && !mab)); }}>
                                        <Play weight="fill" aria-hidden /> Begin met oefenen
                                    </button>
                                </div>
                                {!active && <p className="zelf-hint" role="status">Kies minstens één tafel.</p>}
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
