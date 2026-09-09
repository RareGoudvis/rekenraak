import type { MathBlock, GetalFunctieExercise, GetalFunctie } from '../../services/math/types';
import FragmentableGrid from './FragmentableGrid';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const SOL = '#e11d48';
const SALMON = '#f4cbb8';

const FUNCTIE_LABEL: Record<GetalFunctie, string> = {
    hoeveelheid: 'hoeveelheid', rang: 'rangorde', maat: 'maat', code: 'code',
};
const FUNCTIE_FULL: Record<GetalFunctie, string> = {
    hoeveelheid: 'hoeveelheidsgetal', rang: 'rangordegetal', maat: 'maatgetal', code: 'codegetal',
};

export default function GetalFunctieViewer({ block, showSolutions }: Props) {
    const exercises: GetalFunctieExercise[] = block.getalFunctieExercises || [];
    const functies: GetalFunctie[] = block.constraints.functies ?? ['hoeveelheid', 'rang', 'maat', 'code'];
    const answerMode: string = block.constraints.answerMode ?? 'aankruisen';
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    // ── SCHRIJVEN: sentence + write-line ───────────────────────────────────────
    if (answerMode === 'schrijven') {
        return (
            <FragmentableGrid
                cols={1}
                columnGap={24}
                rowGap={gap}
                items={exercises.map(ex => (
                    <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'baseline', gap: '10px', fontSize: '15px', flexWrap: 'wrap' }}>
                        <span>{ex.sentence}</span>
                        {showSolutions
                            ? <span style={{ color: SOL, fontFamily: mono, fontSize: '14px' }}>{FUNCTIE_FULL[ex.functie]}</span>
                            : <span style={{ borderBottom: '1.5px solid #000', minWidth: '140px', height: '15px', display: 'inline-block' }} />}
                    </div>
                ))}
            />
        );
    }

    // ── AANKRUISEN: one table, sentence column + a tick column per functie ─────
    const cols = functies.length ? functies : (['hoeveelheid', 'rang', 'maat', 'code'] as GetalFunctie[]);
    const grid = `minmax(230px, 1fr) ${cols.map(() => '86px').join(' ')}`;
    const cell: React.CSSProperties = {
        border: '1px solid #000', minHeight: '32px', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '13px', boxSizing: 'border-box', padding: '3px 8px',
    };
    return (
        <FragmentableGrid
            cols={1}
            columnGap={0}
            rowGap={0}
            items={[
                <div key="head" className="print-exercise" style={{ display: 'grid', gridTemplateColumns: grid }}>
                    <div style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold', justifyContent: 'flex-start' }}>zin</div>
                    {cols.map(f => <div key={f} style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold', fontSize: '11px' }}>{FUNCTIE_LABEL[f]}</div>)}
                </div>,
                ...exercises.map(ex => (
                    <div key={ex.id} className="print-exercise" style={{ display: 'grid', gridTemplateColumns: grid }}>
                        <div style={{ ...cell, justifyContent: 'flex-start', textAlign: 'left' }}>{ex.sentence}</div>
                        {cols.map(f => (
                            <div key={f} style={{ ...cell, color: SOL, fontFamily: mono, fontWeight: 'bold' }}>
                                {showSolutions && f === ex.functie ? '✕' : ''}
                            </div>
                        ))}
                    </div>
                )),
            ]}
        />
    );
}
