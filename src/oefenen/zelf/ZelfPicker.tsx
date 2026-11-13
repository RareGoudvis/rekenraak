import { useState } from 'react';
import { ArrowLeft, Play } from '@phosphor-icons/react';
import { useEenvoudigData } from '../../components/eenvoudig/useEenvoudigData';
import { EENVOUDIG_NAV } from '../../config/eenvoudig/nav';
import { LEERJAREN, type Leerjaar } from '../../config/gradePresets';
import { useOefenStore } from '../useOefenStore';
import { tryFullscreen } from '../kiosk/fullscreen';
import { ZELF_COUNTS, ZELF_MINUTES, buildZelfSessie, choicesFor, modeKey, usableVariants, type ZelfChoice, type ZelfMode } from './zelfSessie';

// The page opened without a link: a pupil picks leerjaar, onderwerp, oefening and how much, and starts alone.
export default function ZelfPicker() {
    const data = useEenvoudigData();
    const openZelf = useOefenStore(s => s.openZelf);
    const [grade, setGrade] = useState<Leerjaar | null>(null);
    const [topicId, setTopicId] = useState<string | null>(null);
    const [choice, setChoice] = useState<ZelfChoice | null>(null);
    const [mode, setMode] = useState<ZelfMode>({ kind: 'count', n: 5 });

    const choices = data && grade !== null && topicId !== null ? choicesFor(data, grade, topicId) : [];
    // A topic with one choice skips that step, so Back from "Hoeveel" leaves the topic too.
    const back = () => {
        if (choice) { setChoice(null); if (choices.length <= 1) setTopicId(null); }
        else if (topicId) setTopicId(null);
        else setGrade(null);
    };
    const backBtn = grade !== null && (
        <button type="button" className="kiosk-btn kiosk-btn-quiet zelf-back" onClick={back}>
            <ArrowLeft aria-hidden /> Terug
        </button>
    );

    if (grade === null) {
        return (
            <main className="oefen-center zelf">
                <p className="kiosk-start-brand">RekenRaak – Zelf oefenen</p>
                <h1 className="oefen-title">Welk leerjaar?</h1>
                <div className="zelf-grid zelf-grid-grades">
                    {LEERJAREN.map(g => (
                        <button key={g} type="button" className="zelf-choice zelf-choice-num" onClick={() => setGrade(g)}>{g}</button>
                    ))}
                </div>
                <p className="kiosk-start-note">Heb je een link of QR-code van je juf of meester? Open die dan.</p>
            </main>
        );
    }

    if (!data) return <main className="oefen-center zelf">{backBtn}<p className="oefen-lead">Even laden…</p></main>;
    const topics = usableVariants(data, grade);

    if (topicId === null) {
        return (
            <main className="oefen-center zelf">
                {backBtn}
                <h1 className="oefen-title">Wat wil je oefenen?</h1>
                {EENVOUDIG_NAV.map(section => {
                    const list = section.topics.filter(t => topics.has(t.id));
                    if (!list.length) return null;
                    return (
                        <section key={section.name} className="zelf-section" aria-label={section.name}>
                            <h2 className="zelf-section-title">{section.name}</h2>
                            <div className="zelf-grid">
                                {list.map(t => (
                                    <button key={t.id} type="button" className="zelf-choice" onClick={() => {
                                        setTopicId(t.id);
                                        const only = choicesFor(data, grade, t.id);
                                        if (only.length === 1) setChoice(only[0]);
                                    }}>{t.label}</button>
                                ))}
                            </div>
                        </section>
                    );
                })}
            </main>
        );
    }

    const topicLabel = EENVOUDIG_NAV.flatMap(sec => sec.topics).find(t => t.id === topicId)?.label ?? '';

    if (choice === null) {
        return (
            <main className="oefen-center zelf">
                {backBtn}
                <h1 className="oefen-title">{topicLabel}</h1>
                <p className="oefen-lead">Wat wil je oefenen?</p>
                <div className="zelf-grid zelf-grid-choices">
                    {choices.map(c => (
                        <button key={c.key} type="button" className="zelf-choice zelf-choice-big" onClick={() => setChoice(c)}>{c.label}</button>
                    ))}
                </div>
            </main>
        );
    }

    const options: { mode: ZelfMode; text: string }[] = [
        ...ZELF_COUNTS.map(n => ({ mode: { kind: 'count', n } as ZelfMode, text: `${n} oefeningen` })),
        ...ZELF_MINUTES.map(min => ({ mode: { kind: 'timer', min } as ZelfMode, text: `${min} ${min === 1 ? 'minuut' : 'minuten'}` })),
    ];
    const group = (kind: ZelfMode['kind'], label: string) => (
        <div role="group" aria-label={label} className="zelf-grid zelf-amount">
            {options.filter(o => o.mode.kind === kind).map(o => {
                const picked = modeKey(o.mode) === modeKey(mode);
                return (
                    <button key={modeKey(o.mode)} type="button" aria-pressed={picked} className={`zelf-choice${picked ? ' is-picked' : ''}`} onClick={() => setMode(o.mode)}>{o.text}</button>
                );
            })}
        </div>
    );

    return (
        <main className="oefen-center zelf">
            {backBtn}
            <h1 className="oefen-title">Hoeveel wil je doen?</h1>
            <p className="oefen-lead">{topicLabel}: {choice.label}</p>
            {group('count', 'Aantal oefeningen')}
            <p className="zelf-or">of op tijd</p>
            {group('timer', 'Aantal minuten')}
            <button type="button" className="kiosk-btn kiosk-btn-primary kiosk-btn-big"
                onClick={() => { tryFullscreen(); openZelf(buildZelfSessie(choice, mode, Date.now(), grade ?? undefined)); }}>
                <Play weight="fill" aria-hidden /> Begin met oefenen
            </button>
        </main>
    );
}
