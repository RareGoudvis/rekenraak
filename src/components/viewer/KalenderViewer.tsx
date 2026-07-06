import type { MathBlock, KalenderExercise } from '../../services/math/types';
import { DAY_ABBR, DAY_NAMES, MONTH_NAMES, daysInMonth, formatDate } from '../../services/kalender/kalenderGenerator';
import FragmentableGrid from './FragmentableGrid';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const SOL = '#e11d48';
const SALMON = '#f4cbb8';

// Week starts on maandag (Belgian calendars); JS getDay() is zondag-based.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

function MonthGrid({ year, month }: { year: number; month: number }) {
    const total = daysInMonth(year, month);
    const firstCol = WEEK_ORDER.indexOf(new Date(year, month, 1).getDay());
    const cells: (number | null)[] = [...Array(firstCol).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
    const cell: React.CSSProperties = {
        border: '1px solid #000', height: '28px', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: mono, fontSize: '12px', boxSizing: 'border-box',
    };
    return (
        <div style={{ width: 'fit-content' }}>
            <div style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold', width: `${7 * 40}px`, fontSize: '13px' }}>
                {MONTH_NAMES[month]} {year}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 40px)' }}>
                {WEEK_ORDER.map(d => <div key={d} style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold' }}>{DAY_ABBR[d]}</div>)}
                {cells.map((d, i) => <div key={i} style={cell}>{d ?? ''}</div>)}
            </div>
        </div>
    );
}

export default function KalenderViewer({ block, showSolutions }: Props) {
    const exercises: KalenderExercise[] = block.kalenderExercises || [];
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Genereer oefeningen via het rechterpaneel)</div>;
    }

    const answer = (text: string, width = 150) => showSolutions
        ? <span style={{ color: SOL, fontFamily: mono, fontSize: '14px' }}>{text}</span>
        : <span style={{ borderBottom: '1.5px solid #000', minWidth: `${width}px`, height: '15px', display: 'inline-block' }} />;

    return (
        <FragmentableGrid
            cols={1}
            columnGap={24}
            rowGap={gap}
            items={exercises.map(ex => {
                if (ex.subType === 'maandrooster') {
                    return (
                        <div key={ex.id} className="print-exercise" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <MonthGrid year={ex.year} month={ex.month} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {(ex.questions ?? []).map((q, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '10px', fontSize: '14px' }}>
                                        <span>{q.text}</span>
                                        {answer(q.answer, 120)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                }
                if (ex.subType === 'datum-rekenen') {
                    const base = new Date(ex.year, ex.month, ex.baseDate ?? 1);
                    const target = new Date(ex.year, ex.month, (ex.baseDate ?? 1) + (ex.offsetDays ?? 0));
                    const rel = (ex.offsetDays ?? 0) >= 0 ? `Over ${ex.offsetDays} dagen` : `${Math.abs(ex.offsetDays ?? 0)} dagen geleden`;
                    const sol = `${DAY_NAMES[target.getDay()]} ${formatDate(target.getFullYear(), target.getMonth(), target.getDate())}`;
                    return (
                        <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'baseline', gap: '10px', fontSize: '14px', flexWrap: 'wrap' }}>
                            <span>Vandaag is het {DAY_NAMES[base.getDay()]} {formatDate(ex.year, ex.month, ex.baseDate ?? 1)}. {rel} {(ex.offsetDays ?? 0) >= 0 ? 'is' : 'was'} het</span>
                            {answer(sol, 200)}
                        </div>
                    );
                }
                // notatie: 4 mei 2026 = 04/05/2026 (both directions)
                const dd = String(ex.day).padStart(2, '0');
                const mm = String(ex.month + 1).padStart(2, '0');
                const words = formatDate(ex.year, ex.month, ex.day ?? 1);
                const digits = `${dd}/${mm}/${ex.year}`;
                return (
                    <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'baseline', gap: '10px', fontSize: '14px', fontFamily: mono }}>
                        <span>{ex.direction === 'naar-woorden' ? digits : words} =</span>
                        {answer(ex.direction === 'naar-woorden' ? words : digits, 150)}
                    </div>
                );
            })}
        />
    );
}
