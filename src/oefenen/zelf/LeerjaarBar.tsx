import { LEERJAREN, type Leerjaar } from '../../config/gradePresets';
import { gradeTint } from './zelfGrade';

// The top bar of the topics screen: the R badge with "Zelf oefenen" on the left (the page's only header), then six big
// numbers, the chosen one large and ringed. Nothing chosen yet = the bar glows (kiosk.css, never under reduced motion)
// and says "Kies je leerjaar".
export default function LeerjaarBar({ grade, onPick }: { grade: Leerjaar | null; onPick(g: Leerjaar): void }) {
    const unset = grade === null;
    return (
        <section className={`zelf-years${unset ? ' is-unset' : ''}`} aria-labelledby="zelf-years-label">
            <p className="zelf-years-brand"><span className="zelf-years-logo" aria-hidden>R</span><span className="zelf-years-brand-text">Zelf oefenen</span></p>
            <div className="zelf-years-pick">
                <h2 id="zelf-years-label" className="zelf-years-label">{unset ? 'Kies je leerjaar' : 'leerjaar'}</h2>
                <div className="zelf-years-row">
                    {LEERJAREN.map(g => (
                        <button key={g} type="button" className="zelf-year" style={gradeTint(g)} aria-pressed={g === grade}
                            aria-label={`Leerjaar ${g}`} onClick={() => onPick(g)}>{g}</button>
                    ))}
                </div>
            </div>
        </section>
    );
}
