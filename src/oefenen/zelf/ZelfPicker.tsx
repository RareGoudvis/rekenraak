import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, GameController, Notebook, Play } from '@phosphor-icons/react';
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
import OverButton from './OverPage';
import { gamesFor, topicCardOf } from './topicGames';
import { gradeTint, readGrade, saveGrade } from './zelfGrade';
import { readRange, readTafels, readWay, saveRange, saveTafels, saveWay, type ZelfWay } from './zelfPicks';
import { gameBlurb } from './gameBlurbs';
import { zelfTopicLabel } from './zelfLabels';
import { ZELF_SUBJECTS, subjectTopicLabel, zelfSubjectOf } from './zelfSubjects';
import { subjectBadge, subjectPicture } from './subjectArt';
import {
    TAFELS_DEFAULT, ZELF_COUNTS, ZELF_MINUTES, ZELF_RANGES, buildZelfSessie, choiceMayHaveMab, choicesFor, isTafelTopic, modeKey, tafelChoice,
    tafelPickOf, tafelsOffer, zelfMaxOf, zelfUsable, zelfRangeButtons, type TafelOp, type ZelfChoice, type ZelfMode,
} from './zelfSessie';

type Skin = (typeof SKINS)[number];

const sectionTint = (name: string | undefined) => ({ '--tint': name ? SECTION_TINT[name] : undefined } as React.CSSProperties);

// "10 000": thousands apart, never broken over two lines.
const fmtNumber = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');

// A choice tile's label; its longest word goes to the CSS, which shrinks the text until that word fits the tile.
const longestWord = (text: string) => Math.max(...text.split(/\s+/).map(w => w.length));
const ChoiceText = ({ text }: { text: string }) => (
    <span className="zelf-choice-text" style={{ '--zelf-word': longestWord(text) } as React.CSSProperties}>{text}</span>
);

const TAFEL_OPS: { op: TafelOp; text: string }[] = [{ op: 'x', text: 'Maal ×' }, { op: ':', text: 'Deel :' }, { op: 'beide', text: 'Allebei × en :' }];

const SECTION_OF_TOPIC: Record<string, string> = Object.fromEntries(EENVOUDIG_NAV.flatMap(sec => sec.topics.map(t => [t.id, sec.name])));

// The two ways on the Keuze screen: their tile text, icon and tint (oefenen blue, spelen orange).
const WAYS: { way: ZelfWay; title: string; why: string; Icon: typeof Notebook }[] = [
    { way: 'oefenen', title: 'Oefenen', why: 'Gewone oefeningen maken.', Icon: Notebook },
    { way: 'spelen', title: 'Spelen', why: 'Kies een spelletje!', Icon: GameController },
];

// The page opened without a link: a pupil picks leerjaar (the top bar, remembered) and onderwerp (a picture card),
// then on one Keuze screen the oefening and one of two ways: Oefenen (how much) or Spelen (the games).
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
    // Oefenen or Spelen: back from a game opens Spelen, else the device's last pick, else neither (two tiles).
    const [way, setWay] = useState<ZelfWay | null>(() => (from ? 'spelen' : readWay()));
    // A tapped choice brings the next steps into view (a long list of choices pushes them below the fold).
    const nextRef = useRef<HTMLDivElement>(null);
    const waysRef = useRef<HTMLDivElement>(null);
    const tapped = useRef(false);
    // Bring the Oefenen / Spelen tiles to the top after this render: smooth after a tap, at once when coming back from a game.
    const toWays = useRef<ScrollBehavior | null>(from ? 'instant' : null);
    useEffect(() => {
        if (!tapped.current || !choice) return;
        tapped.current = false;
        nextRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    }, [choice]);
    // The tiles on top, the open part right under them (the games run below the fold).
    useEffect(() => {
        if (!toWays.current || !waysRef.current) return;
        waysRef.current.scrollIntoView?.({ block: 'start', behavior: toWays.current });
        toWays.current = null;
    });
    const pickWay = (w: ZelfWay) => { toWays.current = 'smooth'; setWay(w); saveWay(w); };
    // Before a leerjaar is picked the topics of every leerjaar show (dimmed).
    const anyGrade = useMemo(() => data && new Set(LEERJAREN.flatMap(g => [...zelfUsable(data, g).keys()])), [data]);
    const shown = useMemo(() => (grade !== null ? (data ? new Set(zelfUsable(data, grade).keys()) : null) : anyGrade), [data, grade, anyGrade]);
    // The picture and stickers per topic card (topicGames.ts).
    const cards = useMemo(() => new Map(data && shown ? [...shown, ...ZELF_SUBJECTS.flatMap(sub => sub.topics.map(t => t.id))].map(id => [id, topicCardOf(data, grade, id)] as const) : []), [data, shown, grade]);
    const choices = data && grade !== null && topicId !== null && !isTafel ? choicesFor(data, grade, topicId, range) : [];
    const back = () => {
        if (setup) { toWays.current = 'instant'; setSetup(null); }
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
        const pickTopic = (id: string) => {
            if (grade === null || !data) return;
            setTopicId(id);
            // A topic with one oefening needs no pick: the screen opens on its next step.
            const only = isTafelTopic(id) ? [] : choicesFor(data, grade, id, range);
            setChoice(only.length === 1 ? only[0] : null);
        };
        return (
            <>
                <KidBackdrop clouds={false} grade={grade} />
                <main key="home" className="oefen-center zelf zelf-home">
                    <LeerjaarBar grade={grade} onPick={pickGrade} />
                    {/* The page title for screen readers only (owner, 2026-11-16: obvious on screen, the room goes to the cards); it waits for the topics. */}
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
                                                <TopicCard key={t.id} id={t.id} label={zelfTopicLabel(t)} game={cards.get(t.id)?.game ?? null} hasGame={!!cards.get(t.id)?.hasGame}
                                                    disabled={grade === null} onPick={() => pickTopic(t.id)} />
                                            ))}
                                        </div>
                                    </section>
                                );
                            })}
                            {/* Subjects beside the maths (Frans from leerjaar 5): their own section, colour and drawn cards. */}
                            {ZELF_SUBJECTS.filter(sub => grade === null || sub.grades.includes(grade)).map(sub => (
                                <section key={sub.section} className="zelf-section" aria-label={sub.section} style={{ '--tint': sub.tint } as React.CSSProperties}>
                                    <h2 className="zelf-section-title">{sub.section}</h2>
                                    <div className="zelf-grid zelf-grid-topics">
                                        {sub.topics.map(t => (
                                            <TopicCard key={t.id} id={t.id} label={t.label} game={null} hasGame={!!cards.get(t.id)?.hasGame}
                                                picture={subjectPicture(t.id)} disabled={grade === null} onPick={() => pickTopic(t.id)} />
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}
                    <footer className="zelf-home-foot">
                        <p className="zelf-home-note">Heb je een link of QR-code van je juf of meester? Open die dan.</p>
                        <OverButton />
                    </footer>
                </main>
            </>
        );
    }

    if (!data || grade === null) return <><KidBackdrop grade={grade} /><main className="oefen-center zelf">{bar}<p className="oefen-lead">Even laden…</p></main></>;

    const topicNav = EENVOUDIG_NAV.flatMap(sec => sec.topics).find(t => t.id === topicId);
    const subject = zelfSubjectOf(topicId);
    const topicLabel = topicNav ? zelfTopicLabel(topicNav) : subjectTopicLabel(topicId) ?? '';
    const { icon: topicGlyph, size: topicSize } = subject ? { icon: subjectBadge(subject.section), size: '' } : topicIcon(topicId, topicLabel);

    // A game card: that game with this oefening; Nakijken, Ander spel and Terug come back to this screen.
    const play = (skin: Skin, meta: SpelStart['meta'] = skin.meta) => {
        if (!active) return;
        if (meta === skin.meta && meta.options?.length) { setSetup(skin); return; }
        tryFullscreen();
        useSpelStore.getState().start({ choice: active, grade, topicId, meta });
    };

    // Tot hoeveel: buttons for the ranges this topic has cards of (zelfRangeButtons), else the range it plays as a pill.
    const ranges = ZELF_RANGES[grade];
    const rangeShown = ranges.some(r => zelfMaxOf(data, topicId, grade, r) !== null) ? zelfMaxOf(data, topicId, grade, range ?? ranges[0]) : null;
    const rangeButtons = zelfRangeButtons(data, topicId, grade);
    const rangeChoice = rangeButtons.length > 0;
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
                    <SpelOptions meta={setup.meta} blurb={gameBlurb(setup.meta.id, '')} note={`${topicLabel}: ${active.label}`}
                        onStart={meta => play(setup, meta)} onBack={() => { toWays.current = 'instant'; setSetup(null); }} />
                </main>
            </>
        );
    }

    // Hoe lang: a count row and a minutes row as segments, like a game's options; the mode lives in exactly one of them.
    const options: { mode: ZelfMode; text: string; name: string }[] = [
        ...ZELF_COUNTS.map(n => ({ mode: { kind: 'count', n } as ZelfMode, text: String(n), name: `${n} oefeningen` })),
        ...ZELF_MINUTES.map(min => ({ mode: { kind: 'timer', min } as ZelfMode, text: String(min), name: `${min} ${min === 1 ? 'minuut' : 'minuten'}` })),
    ];
    const seg = (id: string, label: string, buttons: React.ReactNode, unit?: string) => (
        <div className="kid-option">
            <p className="kid-option-label" id={id}>{label}</p>
            <div className="zelf-seg-unit">
                <div role="group" aria-labelledby={id} className="kid-seg">{buttons}</div>
                {unit && <span className="zelf-seg-word" aria-hidden>{unit}</span>}
            </div>
        </div>
    );
    const group = (kind: ZelfMode['kind'], id: string, label: string, unit?: string) => seg(id, label, options.filter(o => o.mode.kind === kind).map(o => (
        <button key={modeKey(o.mode)} type="button" aria-pressed={modeKey(o.mode) === modeKey(mode)} aria-label={o.name} className="kid-seg-btn"
            onClick={() => setMode(o.mode)}>{o.text}</button>
    )), unit);

    // Games for this oefening = the two tiles; a tafels topic keeps them while no tafel is picked (the hint says why).
    const everyTafel = isTafel && !active ? tafelChoice(grade, topicId, offer, op) : null;
    const split = games.length > 0 || (everyTafel !== null && choiceCanPlay(everyTafel, grade));
    // Oefenen: how much, MAB, then start. Alone (no games) it carries its own head, as the only way.
    const oefenPart = (alone: boolean) => (
        <section id="zelf-part-oefenen" className="zelf-step zelf-panel zelf-part is-oefenen"
            aria-labelledby={alone ? 'zelf-oefen-title' : 'zelf-way-oefenen-title'}>
            {alone && (
                <div className="zelf-panel-head">
                    <span className="zelf-way-icon" aria-hidden><Notebook weight="duotone" /></span>
                    <div className="zelf-panel-text">
                        <h2 id="zelf-oefen-title" className="zelf-panel-title">Oefenen</h2>
                        <p className="zelf-panel-why">Gewone oefeningen maken.</p>
                    </div>
                </div>
            )}
            <h3 className="zelf-howlong">Hoe lang wil je oefenen?</h3>
            <div className="zelf-amounts">
                {group('count', 'zelf-opt-count', 'Aantal oefeningen')}
                {group('timer', 'zelf-opt-time', 'Tijd', 'minuten')}
                {mabPossible && seg('zelf-opt-mab', 'Hulp met MAB-blokjes', [true, false].map(on => (
                    <button key={String(on)} type="button" aria-pressed={mab === on} className="kid-seg-btn" onClick={() => setMab(on)}>{on ? 'Aan' : 'Uit'}</button>
                )))}
                <button type="button" className="kiosk-btn kiosk-btn-primary kiosk-btn-big zelf-go" disabled={!active}
                    onClick={() => { if (!active) return; tryFullscreen(); openZelf(buildZelfSessie(active, mode, Date.now(), grade, mabPossible && !mab)); }}>
                    <Play weight="fill" aria-hidden /> Begin met oefenen
                </button>
            </div>
            {!active && <p className="zelf-hint" role="status">Kies minstens één tafel.</p>}
        </section>
    );

    return (
        <>
            <KidBackdrop clouds={false} grade={grade} />
            {/* Its own element per screen: a fresh scroll position, never the topics list's. */}
            <main key={`keuze-${topicId}`} className="oefen-center zelf">
                {bar}
                <div className="zelf-head" style={subject ? { '--tint': subject.tint } as React.CSSProperties : sectionTint(SECTION_OF_TOPIC[topicId])}>
                    <span className={`zelf-badge is-lg${topicSize}`} aria-hidden>{topicGlyph}</span>
                    <h1 className="oefen-title">{topicLabel}</h1>
                </div>
                {rangeShown !== null && (rangeChoice ? (
                    <div className="zelf-range" role="group" aria-labelledby="zelf-range-label">
                        <span id="zelf-range-label" className="zelf-range-label">Tot hoeveel?</span>
                        {rangeButtons.map(r => (
                            <button key={r} type="button" className="zelf-choice zelf-range-btn" aria-pressed={r === rangeShown} onClick={() => pickRange(r)}>tot {fmtNumber(r)}</button>
                        ))}
                    </div>
                ) : <p className="zelf-range is-fixed"><span className="kiosk-pill zelf-range-pill">tot {fmtNumber(rangeShown)}</span></p>)}
                <div className="zelf-steps">
                    {isTafel && (
                        <>
                            <section className="zelf-step" aria-labelledby="zelf-tafels-title">
                                {stepTitle('Welke tafels?', 'zelf-tafels-title')}
                                {/* 1 to 10 on the first row, the bigger tafels (11–15, 25, 50, 100) on the second. */}
                                <div className="zelf-tafels" role="group" aria-label="Welke tafels?">
                                    {[offer.filter(t => t <= 10), offer.filter(t => t > 10)].filter(row => row.length > 0).map(row => (
                                        <div key={row[0]} className="zelf-tafels-row">
                                            {row.map(t => {
                                                const on = tables.includes(t);
                                                return (
                                                    <button key={t} type="button" className="zelf-tafel" aria-pressed={on} aria-label={`Tafel van ${t}`}
                                                        onClick={() => setTables(on ? tables.filter(x => x !== t) : [...tables, t].sort((a, b) => a - b))}>{t}</button>
                                                );
                                            })}
                                        </div>
                                    ))}
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
                                        <button key={o.op} type="button" className="zelf-choice" aria-pressed={o.op === op} onClick={() => setTafelOp(o.op)}><ChoiceText text={o.text} /></button>
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
                                        onClick={() => { tapped.current = true; setChoice(c); }}><ChoiceText text={c.label} /></button>
                                ))}
                            </div>
                        </section>
                    )}
                    {(active || isTafel) && (
                        <div ref={nextRef} className="zelf-steps">
                            {split ? (
                                <>
                                    {/* Oefenen or Spelen: two big tiles, one part open below them (a segmented choice, never a new page). */}
                                    <div ref={waysRef} className="zelf-ways" role="group" aria-label="Oefenen of spelen">
                                        {WAYS.map(w => (
                                            <button key={w.way} type="button" className={`zelf-way is-${w.way}`} aria-pressed={way === w.way}
                                                aria-label={w.title} aria-describedby={`zelf-way-${w.way}-why`} aria-controls={way === w.way ? `zelf-part-${w.way}` : undefined}
                                                onClick={() => pickWay(w.way)}>
                                                <span className="zelf-way-icon" aria-hidden><w.Icon weight="duotone" /></span>
                                                <span className="zelf-way-text">
                                                    <span id={`zelf-way-${w.way}-title`} className="zelf-way-title">{w.title}</span>
                                                    <span id={`zelf-way-${w.way}-why`} className="zelf-way-why">{w.why}</span>
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                    {way === 'oefenen' && oefenPart(false)}
                                    {way === 'spelen' && (
                                        <section id="zelf-part-spelen"
                                            className="zelf-step zelf-panel zelf-part is-spelen" aria-labelledby="zelf-way-spelen-title">
                                            {games.length > 0 ? <GameRow games={games} onPlay={skin => play(skin)} /> : <p className="zelf-hint is-left" role="status">Kies minstens één tafel.</p>}
                                        </section>
                                    )}
                                </>
                            ) : oefenPart(true)}
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
