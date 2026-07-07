import type { MathBlock, GeldRekenenExercise } from '../../services/math/types';
import { formatEuro } from '../../services/geld/geldRekenenGenerator';
import FragmentableGrid from './FragmentableGrid';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const SOL = '#e11d48';
const SALMON = '#f4cbb8';

const cell: React.CSSProperties = {
    border: '1px solid #000', minHeight: '34px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontFamily: mono, fontSize: '13px', boxSizing: 'border-box', padding: '2px 8px',
};

export default function GeldRekenenViewer({ block, showSolutions }: Props) {
    const exercises: GeldRekenenExercise[] = block.geldRekenenExercises || [];
    const subType: string = block.constraints.subType ?? 'korting';
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Genereer oefeningen via het rechterpaneel)</div>;
    }

    const headers = subType === 'korting'
        ? ['prijs', 'korting', 'korting in €', 'nieuwe prijs']
        : subType === 'winst'
            ? ['aankoopprijs', 'verkoopprijs', 'winst of verlies?']
            : ['kapitaal', 'rentevoet', 'tijd', 'intrest'];
    // Fill the page width (was 390-420px); the wider answer cells also give pupils
    // more room to write amounts, and a 4-digit price no longer risks wrapping.
    const widths = subType === 'winst' ? '190px 190px 220px' : '160px 120px 160px 160px';

    const answer = (text: string) => (
        <div style={{ ...cell, color: SOL }}>{showSolutions ? text : ''}</div>
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
                <div key="head" className="print-exercise" style={{ display: 'grid', gridTemplateColumns: widths, width: 'fit-content' }}>
                    {headers.map(h => <div key={h} style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold', fontSize: '12px' }}>{h}</div>)}
                </div>,
                ...exercises.map(ex => (
                    <div key={ex.id} className="print-exercise" style={{ display: 'grid', gridTemplateColumns: widths, width: 'fit-content', marginBottom: `${Math.max(0, gap - 14)}px` }}>
                        {row(ex)}
                    </div>
                )),
            ]}
        />
    );
}
