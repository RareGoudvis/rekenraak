import { LEERJAREN, type Leerjaar } from '../../config/gradePresets';
import { gradeTint } from './zelfGrade';

// The top bar of the topics screen: six big numbers, the chosen one large and ringed. Nothing chosen yet =
// the bar glows (kiosk.css, never under reduced motion) and says "Kies je leerjaar".
export default function LeerjaarBar({ grade, onPick }: { grade: Leerjaar | null; onPick(g: Leerjaar): void }) {
    const unset = grade === null;
    return (
        <section className={`zelf-years${unset ? ' is-unset' : ''}`} aria-labelledby="zelf-years-label">
            <h2 id="zelf-years-label" className="zelf-years-label">{unset ? 'Kies je leerjaar' : 'leerjaar'}</h2>
            <div className="zelf-years-row">
                {LEERJAREN.map(g => (
                    <button key={g} type="button" className="zelf-year" style={gradeTint(g)} aria-pressed={g === grade}
                        aria-label={`Leerjaar ${g}`} onClick={() => onPick(g)}>{g}</button>
                ))}
            </div>
        </section>
    );
}
