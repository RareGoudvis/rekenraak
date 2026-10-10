import type { MathBlock, GeldRekenenExercise } from '../../services/math/types';
import { formatEuro } from '../../services/geld/geldRekenenGenerator';
import FragmentableGrid from './FragmentableGrid';
import type { GeldRekenenConstraints } from '../../services/math/constraintTypes';
import { solutionText } from './solutionStyle';
import { ANSWER_ROW_H } from './BlockWidthContext';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const SALMON = '#f4cbb8';

// Sizes below are factors of the sheet tokens (--sheet-size-math / --sheet-size-text), not fixed px

const cell: React.CSSProperties = {
    border: '1px solid #000', minHeight: ANSWER_ROW_H, display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 0.75)', boxSizing: 'border-box', padding: '2px 6px',
    // An amount never breaks at its thousands space ("€ 9 / 028,60"); its column holds it.
    whiteSpace: 'nowrap',
};

export default function GeldRekenenViewer({ block, showSolutions }: Props) {
    const exercises: GeldRekenenExercise[] = block.geldRekenenExercises || [];
    const c = block.constraints as GeldRekenenConstraints;
    const subType: string = c.subType ?? 'korting';
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    const headers = subType === 'korting'
        ? ['prijs', 'korting', 'korting in €', 'nieuwe prijs']
        : subType === 'winst'
            ? ['aankoopprijs', 'verkoopprijs', 'winst of verlies?']
            : ['kapitaal', 'rentevoet', 'tijd', 'intrest'];

    // Plain-text form of every cell this exercise prints, in column order — used only to
    // measure column width (in `ch`), not to render (row() below does that, honouring
    // showSolutions). Sized off the SOLVED value regardless of showSolutions so the column
    // doesn't collapse when the answer is hidden and then clip once it's revealed.
    const cellText = (ex: GeldRekenenExercise): string[] => {
        if (ex.subType === 'korting') {
            const kortingCents = ((ex.priceCents ?? 0) * (ex.percent ?? 0)) / 100;
            return [formatEuro(ex.priceCents ?? 0), `${ex.percent} %`, formatEuro(kortingCents), formatEuro((ex.priceCents ?? 0) - kortingCents)];
        }
        if (ex.subType === 'winst') {
            const diff = (ex.sellCents ?? 0) - (ex.buyCents ?? 0);
            return [formatEuro(ex.buyCents ?? 0), formatEuro(ex.sellCents ?? 0), `${diff >= 0 ? 'winst' : 'verlies'} ${formatEuro(Math.abs(diff))}`];
        }
        const intrest = ((ex.capitalCents ?? 0) * (ex.percent ?? 0)) / 100 * ((ex.months ?? 12) / 12);
        return [formatEuro(ex.capitalCents ?? 0), `${ex.percent} %`, ex.months === 6 ? '6 maanden' : '1 jaar', formatEuro(intrest)];
    };
    // Column width in `ch` (mono, so exact) off the widest value THIS rep actually prints —
    // was a fixed 160-220px split that could only ever be full width (owner review R3).
    // A value always gets its full width (+2ch for the 6px padding either side): the old 10/14ch
    // cap split "€ 9 028,60" and "verlies € 404". Only the header words, which may wrap, are
    // capped — 'winst' has one fewer, wordier column so its cap is looser than the 4-column tables.
    const CH_CAP = subType === 'winst' ? 14 : 10;
    const grid = headers.map((h, i) => {
        const valueChars = Math.max(2, ...exercises.map(ex => cellText(ex)[i]?.length ?? 0));
        return `${Math.max(valueChars + 2, Math.min(CH_CAP, h.length + 2))}ch`;
    }).join(' ');
    // `ch` in gridTemplateColumns resolves against the GRID CONTAINER's own font, not the
    // cells inside it (see VerbandenViewer) — match the cells' own mono/size here.
    const gridFont: React.CSSProperties = { fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 0.75)' };

    const answer = (text: string) => (
        <div style={{ ...cell, ...solutionText }}>{showSolutions ? text : ''}</div>
    );

    const row = (ex: GeldRekenenExercise) => {
        if (ex.subType === 'korting') {
            const kortingCents = ((ex.priceCents ?? 0) * (ex.percent ?? 0)) / 100;
            return (
                <>
                    <div style={cell}>{formatEuro(ex.priceCents ?? 0)}</div>
                    <div style={cell}>{ex.percent} %</div>
                    {answer(formatEuro(kortingCents))}
                    {answer(formatEuro((ex.priceCents ?? 0) - kortingCents))}
                </>
            );
        }
        if (ex.subType === 'winst') {
            const diff = (ex.sellCents ?? 0) - (ex.buyCents ?? 0);
            return (
                <>
                    <div style={cell}>{formatEuro(ex.buyCents ?? 0)}</div>
                    <div style={cell}>{formatEuro(ex.sellCents ?? 0)}</div>
                    {answer(`${diff >= 0 ? 'winst' : 'verlies'} ${formatEuro(Math.abs(diff))}`)}
                </>
            );
        }
        // intrest — jaarintrest, pro rata for 6 maanden.
        const intrest = ((ex.capitalCents ?? 0) * (ex.percent ?? 0)) / 100 * ((ex.months ?? 12) / 12);
        return (
            <>
                <div style={cell}>{formatEuro(ex.capitalCents ?? 0)}</div>
                <div style={cell}>{ex.percent} %</div>
                <div style={cell}>{ex.months === 6 ? '6 maanden' : '1 jaar'}</div>
                {answer(formatEuro(intrest))}
            </>
        );
    };

    // One rooster for the whole block; rows flow across pages per FragmentableGrid row.
    return (
        <FragmentableGrid
            cols={1}
            columnGap={0}
            rowGap={0}
            items={[
                <div key="head" className="print-exercise" style={{ display: 'grid', gridTemplateColumns: grid, width: 'fit-content', ...gridFont }}>
                    {headers.map(h => <div key={h} style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold', fontSize: 'calc(var(--sheet-size-text) * 0.6)', whiteSpace: 'normal' }}>{h}</div>)}
                </div>,
                ...exercises.map(ex => (
                    <div key={ex.id} className="print-exercise" style={{ display: 'grid', gridTemplateColumns: grid, width: 'fit-content', ...gridFont, marginBottom: `${Math.max(0, gap - 14)}px` }}>
                        {row(ex)}
                    </div>
                )),
            ]}
        />
    );
}
