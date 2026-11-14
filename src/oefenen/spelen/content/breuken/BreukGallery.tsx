// Dev-only gallery of the breuk pictures and sample questions (gallery.html, not a Vite build input).
// ?kind=pizza shows one kind at 120 px, ?view=groot every kind at 240 px, ?view=vragen sample rounds.
import type { CSSProperties } from 'react';
import BreukPicture from './BreukPicture';
import { BREUK_KINDS, type BreukKind } from './breukGeometry';
import { breukRound, breukDenominators } from './breukQuestions';

const page: CSSProperties = { height: 'auto', minHeight: '100vh', padding: 16, background: 'var(--kid-sky)', fontFamily: 'var(--kid-font)', color: 'var(--kid-ink)' };
const card: CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 6, background: 'var(--kid-card)', border: 'var(--kid-line) solid var(--kid-ink)', borderRadius: 'var(--kid-radius-sm)' };
const wrap: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start' };
const h: CSSProperties = { margin: '0 0 10px', fontSize: 22 };

function samples(d: number): number[] {
    return [...new Set([1, Math.floor(d / 2), d - 1])].filter(n => n >= 1 && n < d);
}

function KindSheet({ kind, size }: { kind: BreukKind; size: number }) {
    return (
        <section style={{ marginBottom: 18 }}>
            <h2 style={h}>{kind}, {size} px</h2>
            <div style={wrap}>
                {breukDenominators(4).flatMap(d => samples(d).map(n => (
                    <div key={`${n}/${d}`} style={card}>
                        <BreukPicture n={n} d={d} kind={kind} size={size} />
                        <span style={{ fontWeight: 800 }}>{n}/{d}</span>
                    </div>
                )))}
            </div>
        </section>
    );
}

function Big() {
    const picks: [number, number][] = [[1, 2], [2, 3], [3, 8], [5, 12]];
    return (
        <section>
            <h2 style={h}>240 px</h2>
            {BREUK_KINDS.map(kind => (
                <div key={kind} style={{ ...wrap, marginBottom: 10 }}>
                    {picks.map(([n, d]) => (
                        <div key={`${n}/${d}`} style={card}><BreukPicture n={n} d={d} kind={kind} size={240} /></div>
                    ))}
                </div>
            ))}
        </section>
    );
}

function Vragen() {
    return (
        <section>
            {[2, 3, 4].map(lj => (
                <div key={lj} style={{ marginBottom: 14 }}>
                    <h2 style={h}>Leerjaar {lj}</h2>
                    <div style={wrap}>
                        {breukRound(lj, 1234 + lj, 5).map(q => (
                            <div key={q.key} style={{ ...card, flexDirection: 'row', gap: 8 }}>
                                {q.direction === 'picture-to-text'
                                    ? <BreukPicture n={q.prompt.n} d={q.prompt.d} kind={q.prompt.kind} size={96} />
                                    : <b style={{ fontSize: 28, minWidth: 60, textAlign: 'center' }}>{q.prompt.text}</b>}
                                <span aria-hidden>→</span>
                                {q.options.map((o, i) => (
                                    <div key={o.text} style={{ padding: 2, borderRadius: 10, outline: i === q.answer ? '3px solid var(--kid-go)' : 'none' }}>
                                        {q.direction === 'picture-to-text'
                                            ? <b style={{ display: 'block', fontSize: 22, padding: '4px 6px' }}>{o.text}</b>
                                            : <BreukPicture n={o.n} d={o.d} kind={o.kind} size={72} />}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </section>
    );
}

export default function BreukGallery() {
    const q = new URLSearchParams(window.location.search);
    const kind = q.get('kind') as BreukKind | null;
    const view = q.get('view');
    return (
        <main className="oefen-body" style={page}>
            {kind && BREUK_KINDS.includes(kind) ? <KindSheet kind={kind} size={Number(q.get('size')) || 120} />
                : view === 'groot' ? <Big />
                    : view === 'vragen' ? <Vragen />
                        : BREUK_KINDS.map(k => <KindSheet key={k} kind={k} size={120} />)}
        </main>
    );
}
