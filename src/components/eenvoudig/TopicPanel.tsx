import { useCallback, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import ExercisePreview from '../shared/ExercisePreview';
import { accentOf } from './topicAccent';
import { defaultMax, kindsOf, listCards, rangesOf, type CardType, type EenvoudigData } from '../../config/eenvoudig/cards';
import { resolveCard } from '../../config/eenvoudig/resolveCard';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { useEenvoudigUi } from './useEenvoudigUi';
import { addCardToSheet } from './addCard';
import { cardSpanFor, rememberedSpan, rememberSpan } from './cardSpan';
import { planPills } from './pills';
import type { ComboOpId } from './comboModel';

const fmtMax = (n: number) => `Tot ${n.toLocaleString('nl-BE')}`;

// "Zelf samenstellen" exists for the four hoofdrekenen bewerkingen.
const OWN_OP: Record<string, ComboOpId> = {
    'Hoofdrekenen · Optellen': '+', 'Hoofdrekenen · Aftrekken': '-',
    'Hoofdrekenen · Vermenigvuldigen': 'x', 'Hoofdrekenen · Delen': ':',
};

const accentStyle = (a: string) => ({ ['--ez-line' as string]: `var(--domain-${a}-line)` }) as CSSProperties;

function TypeCard({ x, accent }: { x: CardType; accent: string }) {
    const first = x.vars[0];
    const resolved = useMemo(() => { try { return resolveCard(first); } catch { return null; } }, [first]);
    const pills = useMemo(() => planPills(x), [x]);
    // Wide ink (a number line, a chain) gets a double slot; remembered per card so reopening does not jump.
    const [span, setSpan] = useState<1 | 2>(() => rememberedSpan(first.id));
    const onInk = useCallback((ink: { w: number; h: number }) => {
        const next = cardSpanFor(ink.w, ink.h);
        rememberSpan(first.id, next);
        setSpan(next);
    }, [first.id]);
    // A card whose example cannot be built would add a block nobody can see first: leave it out.
    if (!resolved) return null;
    return (
        <div
            className={span === 2 ? 'ez-tc ez-tc-2' : 'ez-tc'} role="button" tabIndex={0} title={x.name} style={accentStyle(accent)}
            onClick={() => addCardToSheet(first)}
            onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); addCardToSheet(first); } }}
        >
            <div className="ez-tc-h"><b>{x.name}</b></div>
            <div className="ez-tc-p">
                <ExercisePreview typeId={resolved.typeId} constraints={resolved.constraints} height={100} fitOne unclamped showSolutions={false} onInk={onInk} />
            </div>
            <div className="ez-tc-r">
                {pills.lead && <span className="ez-tc-l">{pills.lead}</span>}
                {pills.shown.map(p => (
                    <button key={p.index} type="button" className="ez-pill" title={x.vars[p.index].l}
                        onClick={e => { e.stopPropagation(); addCardToSheet(x.vars[p.index]); }}>{p.text}</button>
                ))}
                {pills.hidden > 0 && <span className="ez-pill ez-pill-all">+{pills.hidden}</span>}
                {pills.summary && <span className="ez-pill ez-pill-all">{pills.summary}</span>}
            </div>
        </div>
    );
}

export default function TopicPanel({ topicId, data }: { topicId: string; data: EenvoudigData }) {
    const { grade, max: pickedMax, kind, setMax, setKind } = useEenvoudigUi();
    const setPanel = useWorksheetStore(s => s.setEenvoudigPanel);
    const accent = accentOf(topicId);
    const ranges = rangesOf(data, topicId);
    const kinds = kindsOf(data, topicId);
    const max = defaultMax(data, topicId, grade, pickedMax);
    const cards = listCards(data, topicId, { grade, max: pickedMax, kind });
    const own = OWN_OP[topicId];
    const sections = [...new Set(cards.map(c => c.section))].sort((p, q) => (p === '' ? 0 : 1) - (q === '' ? 0 : 1));
    const lastSection = sections[sections.length - 1];
    const ownCard = own && kind !== 'breuk' && (
        <div className="ez-tc ez-tc-own" role="button" tabIndex={0}
            onClick={() => setPanel({ kind: 'combo', only: own })}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPanel({ kind: 'combo', only: own }); } }}>
            <span className="ez-tc-plus">+</span>
            <b>Zelf samenstellen</b>
            <small>Kies zelf de getallen{own === '+' || own === '-' ? ' en de brug' : ''}</small>
        </div>
    );

    return (
        <>
            {(ranges.length > 1 || kinds.length > 0) && (
                <div className="ez-range">
                    {ranges.map(n => (
                        <button key={n} type="button" aria-pressed={!kind && n === max} onClick={() => setMax(n)}>{fmtMax(n)}</button>
                    ))}
                    {kinds.length > 0 && ranges.length > 1 && <i className="ez-br" />}
                    {kinds.map(k => (
                        <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>{k === 'komma' ? 'Kommagetallen' : 'Breuken'}</button>
                    ))}
                </div>
            )}
            {sections.map(s => (
                <div key={s || 'main'}>
                    {s && <div className="ez-sec">{s}</div>}
                    <div className="ez-grid">
                        {cards.filter(c => c.section === s).map(c => <TypeCard key={c.vars[0].id} x={c} accent={accent} />)}
                        {s === lastSection && ownCard}
                    </div>
                </div>
            ))}
            {sections.length === 0 && ownCard && <div className="ez-grid">{ownCard}</div>}
        </>
    );
}
