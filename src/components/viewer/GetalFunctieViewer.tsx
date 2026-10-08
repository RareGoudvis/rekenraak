import type { MathBlock, GetalFunctieExercise, GetalFunctie } from '../../services/math/types';
import FragmentableGrid from './FragmentableGrid';
import type { GetalFunctieConstraints } from '../../services/math/constraintTypes';
import { solutionText } from './solutionStyle';
import { ANSWER_LINE_H, ANSWER_ROW_H, useShowScaffold } from './BlockWidthContext';
import { interactionProps, useViewerInteraction } from './ViewerInteractionContext';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const SALMON = '#f4cbb8';
// Sizes below are factors of the sheet tokens (--sheet-size-math / --sheet-size-text) so print scales with the docSettings sliders.

const FUNCTIE_LABEL: Record<GetalFunctie, string> = {
    hoeveelheid: 'hoeveelheid', rang: 'rangorde', maat: 'maat', code: 'code',
};
const FUNCTIE_FULL: Record<GetalFunctie, string> = {
    hoeveelheid: 'hoeveelheidsgetal', rang: 'rangordegetal', maat: 'maatgetal', code: 'codegetal',
};

export default function GetalFunctieViewer({ block, showSolutions }: Props) {
    const exercises: GetalFunctieExercise[] = block.getalFunctieExercises || [];
    const c = block.constraints as GetalFunctieConstraints;
    const functies: GetalFunctie[] = c.functies ?? ['hoeveelheid', 'rang', 'maat', 'code'];
    // Oefenmodus: null on the sheet; in the kiosk the pupil ticks a column of the table (Phase C).
    const ix = useViewerInteraction();
    const scaffold = useShowScaffold();
    // A card without the tap context types the word, so the sentence alone reads larger there.
    const answerMode: string = ix ? 'aankruisen' : scaffold ? (c.answerMode ?? 'aankruisen') : 'schrijven';
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    // ── SCHRIJVEN: sentence + write-line ───────────────────────────────────────
    if (answerMode === 'schrijven') {
        // A single exercise has no neighbours to sit beside, so it centres in the column
        // rather than hugging the left edge — the same "single" idea as minWidthSingle.
        const single = exercises.length === 1;
        return (
            <FragmentableGrid
                cols={1}
                columnGap={24}
                rowGap={gap}
                items={exercises.map(ex => (
                    <div key={ex.id} className="print-exercise" style={{
                        display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap',
                        justifyContent: single ? 'center' : 'flex-start', minWidth: 0,
                    }}>
                        {/* May wrap to two lines in a narrow column; the answer line below takes whatever width is left over rather than a fixed one. */}
                        <span style={{ fontSize: 'calc(var(--sheet-size-text) * 0.75)' }}>{ex.sentence}</span>
                        {showSolutions
                            ? <span style={{ ...solutionText, fontFamily: mono, fontSize: 'calc(var(--sheet-size-text) * 0.7)' }}>{FUNCTIE_FULL[ex.functie]}</span>
                            : <span style={{ borderBottom: '1.5px solid #000', flex: '1 1 120px', minWidth: '120px', height: ANSWER_LINE_H, display: 'inline-block' }} />}
                    </div>
                ))}
            />
        );
    }

    // ── AANKRUISEN: one table, sentence column + a tick column per functie ─────
    const cols = functies.length ? functies : (['hoeveelheid', 'rang', 'maat', 'code'] as GetalFunctie[]);
    // Kiosk: the sentence sits above the tick columns, so the card scales a 340 px table up to
    // a readable sentence and thumb-sized cells instead of shrinking a 570 px one.
    const grid = ix ? cols.map(() => '78px').join(' ') : `minmax(230px, 1fr) ${cols.map(() => '86px').join(' ')}`;
    const cell: React.CSSProperties = {
        border: '1px solid #000', minHeight: ANSWER_ROW_H, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 'calc(var(--sheet-size-text) * 0.65)', boxSizing: 'border-box', padding: '3px 8px',
    };
    return (
        <FragmentableGrid
            cols={1}
            columnGap={0}
            rowGap={0}
            items={[
                ...(ix ? exercises.map(ex => <div key={`zin-${ex.id}`} style={{ fontSize: 'calc(var(--sheet-size-text) * 0.75)', marginBottom: '8px' }}>{ex.sentence}</div>) : []),
                <div key="head" className="print-exercise" style={{ display: 'grid', gridTemplateColumns: grid }}>
                    {!ix && <div style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold', justifyContent: 'flex-start' }}>zin</div>}
                    {cols.map(f => <div key={f} style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold', fontSize: 'calc(var(--sheet-size-text) * 0.55)', ...(ix && { padding: '3px 2px' }) }}>{FUNCTIE_LABEL[f]}</div>)}
                </div>,
                ...exercises.map(ex => (
                    <div key={ex.id} className="print-exercise" style={{ display: 'grid', gridTemplateColumns: grid }}>
                        {!ix && <div style={{ ...cell, justifyContent: 'flex-start', textAlign: 'left' }}>{ex.sentence}</div>}
                        {cols.map((f, i) => (
                            // Kiosk: a tick cell is a tap target (≥ 44 px on a phone) and shows the pupil's cross.
                            <div key={f} {...interactionProps(ix, String(i))} style={{ ...cell, ...solutionText, fontFamily: mono, fontWeight: 'bold', ...(ix && { minHeight: '44px' }) }}>
                                {(showSolutions && f === ex.functie) || ix?.state.selected.includes(String(i)) ? '✕' : ''}
                            </div>
                        ))}
                    </div>
                )),
            ]}
        />
    );
}
