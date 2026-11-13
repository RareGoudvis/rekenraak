import type { BreukBewerkExercise } from '../../../services/math/types';
import { delersOf, veelvoudenTot } from '../../../services/steps/breukBewerkSteps';
import type { StepsVisualProps } from '../stepsVisual';
import './breukLijsten.css';

interface Rij { label: string; values: number[]; mark: string }

const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : x);

// The two lists of breuken bewerken (delers of teller and noemer, or veelvouden of both noemers) appear as
// the pupil answers them; once the shared-number question is answered, what both rows share is marked
// and the chosen one (grootste deler, nieuwe noemer) filled.
export default function BreukLijsten({ data: ex, lines, revealed }: StepsVisualProps<BreukBewerkExercise>) {
    if (lines.length === 0 || (ex?.subType !== 'vereenvoudigen' && ex?.subType !== 'gelijknamig')) return null;
    const shown = new Set(lines.slice(0, revealed).map(l => l.mark));
    const [a, b] = ex.inputs;
    let rows: Rij[], pick: number, pickMark: string;
    if (ex.subType === 'vereenvoudigen') {
        rows = [{ label: `Delers van ${a.n}`, values: delersOf(a.n), mark: 'teller' }, { label: `Delers van ${a.d}`, values: delersOf(a.d), mark: 'noemer' }];
        pick = gcd(a.n, a.d);
        pickMark = 'ggd';
    } else {
        pick = ex.answers[0].d;
        rows = [{ label: `Veelvouden van ${a.d}`, values: veelvoudenTot(a.d, pick), mark: 'rij0' }, { label: `Veelvouden van ${b.d}`, values: veelvoudenTot(b.d, pick), mark: 'rij1' }];
        pickMark = 'noemer';
    }
    const marked = shown.has(pickMark);
    const common = new Set(rows[0].values.filter(v => rows[1].values.includes(v)));
    return (
        <div className="steps-lijsten" aria-hidden="true">
            {rows.map(r => (
                <div key={r.mark} className="steps-lijst">
                    <span className="steps-lijst-label">{r.label}:</span>
                    {shown.has(r.mark)
                        ? r.values.map(v => (
                            <span key={v} className={`steps-lijst-chip${marked && v === pick ? ' is-pick' : marked && common.has(v) ? ' is-common' : ''}`}>{v}</span>
                        ))
                        : <span className="steps-lijst-chip is-empty">?</span>}
                </div>
            ))}
        </div>
    );
}
