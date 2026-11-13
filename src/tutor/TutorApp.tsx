import { useEffect, useState } from 'react';
import { ArrowLeft, CaretRight, QrCode } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { decodeTutor, TUTOR_HASH_PREFIX, type TutorItem, type TutorSheet } from '../services/oefenen/tutorPayload';
import { breukHoeveelheidSteps, handigSteps, workedSteps, type StepLine } from '../services/math/workedSteps';
import { formatMathNumber, opGlyph } from '../services/math/formatters';
import { itemLabel } from '../components/viewer/itemNumbering';
import type { Equation } from '../services/math/types';
import Scanner from './Scanner';
import StepsView from './StepsView';
import QuestionSteps from '../oefenen/kiosk/QuestionSteps';
import TutorGroups from './TutorGroups';
import { StepTokens } from '../components/viewer/StepTokens';

// The stappenhulp (tutor.html): a sheet's QR → a menu of its sums → one sum's worked steps,
// revealed a line at a time. It never checks the pupil's work and sends nothing anywhere.

const LAST_KEY = 'rekenraak_tutor_last_v1';

type Loaded = { sheet: TutorSheet; error: null } | { sheet: null; error: string | null };

function load(hash: string): Loaded {
    if (hash.startsWith(TUTOR_HASH_PREFIX)) {
        try {
            const sheet = decodeTutor(hash);
            // Remembered on this device only, so a reload or a closed tab comes back to the same sheet.
            try { localStorage.setItem(LAST_KEY, hash); } catch { /* private mode: fine without it */ }
            return { sheet, error: null };
        } catch (e) {
            return { sheet: null, error: e instanceof Error ? e.message : 'Deze QR-code kan niet gelezen worden.' };
        }
    }
    try {
        const last = localStorage.getItem(LAST_KEY);
        if (last) return { sheet: decodeTutor(last), error: null };
    } catch { /* nothing remembered */ }
    return { sheet: null, error: null };
}

function sumText(eq: Equation): string {
    const ops = eq.operators ?? eq.operands.slice(1).map(() => eq.operator);
    const missing = eq.missingIndex ?? -1;
    const terms = eq.operands.map((o, i) => (i === missing ? '…' : formatMathNumber(o as number)));
    const lhs = terms.reduce((acc, t, i) => `${acc} ${opGlyph(ops[i - 1])} ${t}`);
    return missing >= 0 ? `${lhs} = ${formatMathNumber(eq.answer as number)}` : lhs;
}

// The sum as printed: a + b, or t/n van g with the breuk stacked.
function itemSum(item: TutorItem): ReactNode {
    if (item.kind === 'sum') return sumText(item.eq);
    const { numerator: t, denominator: n, total: g } = item.ex;
    return <StepTokens tokens={[{ t: 'frac', n: t, d: n }, { t: 'word', w: ' van ' }, { t: 'num', v: g ?? 0 }]} fmt={formatMathNumber} />;
}

// The lines a tappable item opens; null keeps it greyed (the sheet said no steps, or this page knows none).
function itemSteps(item: TutorItem | null): StepLine[] | null {
    if (!item) return null;
    // A sum is worked out here, not taken from the print: a sheet printed before a strategy existed marked it greyed.
    if (item.kind === 'sum') return workedSteps(item.eq);
    if (!item.steps) return null;
    return breukHoeveelheidSteps(item.ex);
}

// Breuk van een hoeveelheid: the breukvragen beside the objects, which fill in with every revealed answer.
function HoeveelheidCard({ item, lines }: { item: Extract<TutorItem, { kind: 'hoeveelheid' }>; lines: StepLine[] }) {
    const [answered, setAnswered] = useState(0);
    return (
        <div className="tutor-card">
            <div className="tutor-sum">{itemSum(item)}</div>
            <TutorGroups ex={item.ex} answered={answered} />
            <QuestionSteps lines={lines} look="tutor" onReveal={setAnswered} />
        </div>
    );
}

export default function TutorApp() {
    const [state, setState] = useState<Loaded>(() => load(window.location.hash));
    const [open, setOpen] = useState<{ g: number; i: number } | null>(null);
    const [scanning, setScanning] = useState(false);

    useEffect(() => {
        const onHash = () => { setState(load(window.location.hash)); setOpen(null); setScanning(false); };
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);

    if (scanning) {
        return <Scanner onCancel={() => setScanning(false)} onHash={(hash) => { window.location.hash = hash; }} />;
    }

    if (!state.sheet) {
        return (
            <div className="tutor-app">
                <header className="tutor-bar"><h1>RekenRaak · Stappenhulp</h1></header>
                <main className="tutor-start">
                    <QrCode size={96} weight="regular" aria-hidden className="tutor-start-icon" />
                    <h2>Scan de QR-code onderaan je blad</h2>
                    <p>Dan zie je alle sommen van je blad en hoe je ze stap voor stap uitrekent.</p>
                    {state.error && <p className="tutor-error" role="alert">{state.error}</p>}
                    <button type="button" className="tutor-btn tutor-btn-primary" onClick={() => setScanning(true)}>Scan je blad</button>
                    <p className="tutor-quiet">De camera blijft op dit toestel. Er wordt niets doorgestuurd.</p>
                </main>
            </div>
        );
    }

    const { groups } = state.sheet;
    const current = open ? groups[open.g]?.items[open.i] : null;
    const currentSteps = itemSteps(current ?? null);
    if (open && current && currentSteps) {
        const g = groups[open.g];
        const label = itemLabel(g.numbering, open.i) ?? `oefening ${open.i + 1}`;
        return (
            <div className="tutor-app">
                <header className="tutor-bar">
                    <button type="button" className="tutor-back" onClick={() => setOpen(null)} aria-label="Terug naar alle sommen"><ArrowLeft /></button>
                    <h1>{g.n ? `Opdracht ${g.n} · ` : ''}{label}</h1>
                </header>
                <main className="tutor-main">
                    {current.kind === 'sum'
                        ? <StepsView key={`${open.g}-${open.i}`} sum={sumText(current.eq)} lines={currentSteps} handig={handigSteps(current.eq)} />
                        : <HoeveelheidCard key={`${open.g}-${open.i}`} item={current} lines={currentSteps} />}
                </main>
            </div>
        );
    }

    return (
        <div className="tutor-app">
            <header className="tutor-bar"><h1>Jouw blad</h1></header>
            <main className="tutor-main">
                <p className="tutor-quiet">Kies een som. Probeer ze eerst zelf op je blad.</p>
                {groups.map((g, gi) => (
                    <section key={gi} className="tutor-group">
                        <h2>{g.n ? `Opdracht ${g.n}` : 'Opdracht'}{g.title ? ` · ${g.title}` : ''}</h2>
                        <ul className="tutor-list">
                            {g.items.map((item, i) => {
                                const label = itemLabel(g.numbering, i) ?? `${i + 1}.`;
                                const steps = itemSteps(item);
                                return (
                                    <li key={i}>
                                        {steps ? (
                                            <button type="button" className="tutor-item" onClick={() => setOpen({ g: gi, i })}>
                                                <span className="tutor-item-label">{label}</span>
                                                <span className="tutor-item-sum"><span>{itemSum(item!)}</span></span>
                                                <CaretRight aria-hidden />
                                            </button>
                                        ) : (
                                            <div className="tutor-item is-off">
                                                <span className="tutor-item-label">{label}</span>
                                                <span className="tutor-item-sum">
                                                    {item ? <span>{itemSum(item)}</span> : '—'}
                                                    <small>Hiervoor zijn nog geen stappen</small>
                                                </span>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                ))}
                <button type="button" className="tutor-btn" onClick={() => setScanning(true)}>Een ander blad scannen</button>
            </main>
        </div>
    );
}
