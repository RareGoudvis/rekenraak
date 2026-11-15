import { LEERJAREN, type Leerjaar } from '../../config/gradePresets';

// One tiny vignette per leerjaar, echoing its backdrop (kiosk/backdrops): bees, monster, lava, jungle, snow, desert.
// Colours come from the .zelf-year.is-N tokens in kiosk.css (--w-sky, --w-ground, --w-a, --w-b).
function Vignette({ g }: { g: Leerjaar }) {
    const ground = <path className="zy-ground" d="M0 70 Q30 56 60 66 T100 60 V100 H0Z" />;
    const art = {
        1: <>{ground}<path className="zy-b" d="M14 72 Q14 40 36 36 Q58 40 58 72Z" /><path className="zy-line" d="M18 54 Q36 48 54 54 M17 64 Q36 58 55 64" /><ellipse className="zy-dark" cx="36" cy="70" rx="6" ry="4" /><circle className="zy-a" cx="78" cy="24" r="6" /><ellipse className="zy-a" cx="82" cy="40" rx="7" ry="5" /><path className="zy-line" d="M80 36 V44 M84 36 V44" /></>,
        2: <>{ground}<circle className="zy-a" cx="64" cy="56" r="26" /><path className="zy-a" d="M46 40 L44 22 L58 34Z M74 34 L84 20 L84 42Z" /><circle className="zy-w" cx="56" cy="50" r="7" /><circle className="zy-w" cx="73" cy="50" r="7" /><circle className="zy-dark" cx="58" cy="52" r="3" /><circle className="zy-dark" cx="71" cy="52" r="3" /><path className="zy-line" d="M58 66 Q65 72 72 66" /></>,
        3: <>{ground}<path className="zy-a" d="M0 78 Q22 66 40 80 T80 76 T100 84 V100 H0Z" /><path className="zy-b" d="M60 70 L72 30 L84 70Z" /><path className="zy-a" d="M68 44 Q72 30 76 44Z" /><circle className="zy-b" cx="26" cy="56" r="9" /></>,
        4: <>{ground}<path className="zy-a" d="M10 90 Q0 50 40 30 Q50 64 10 90Z" /><path className="zy-b" d="M42 92 Q36 44 82 22 Q92 66 42 92Z" /><path className="zy-line" d="M10 88 Q22 60 38 36 M42 90 Q56 58 80 28" /></>,
        5: <><path className="zy-ground" d="M0 66 Q40 48 100 70 V100 H0Z" /><path className="zy-a" d="M62 70 L74 40 L86 70Z" /><path className="zy-a" d="M66 54 L74 28 L82 54Z" /><circle className="zy-w" cx="20" cy="22" r="3.5" /><circle className="zy-w" cx="42" cy="36" r="3" /><circle className="zy-w" cx="30" cy="52" r="3.5" /><circle className="zy-w" cx="88" cy="16" r="3" /><circle className="zy-w" cx="56" cy="14" r="3" /></>,
        6: <><circle className="zy-b" cx="80" cy="22" r="9" /><path className="zy-ground" d="M0 72 Q28 54 54 68 T100 62 V100 H0Z" /><path className="zy-a" d="M0 88 Q36 70 100 86 V100 H0Z" /><path className="zy-cactus" d="M28 76 V42 Q28 36 34 36 Q40 36 40 42 V76Z M20 56 Q20 50 26 52 V62 Q20 62 20 56Z M42 50 Q48 50 48 56 V60 Q42 60 42 56Z" /></>,
    }[g];
    return <svg className="zy-art" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden>{art}</svg>;
}

// The top bar of the topics screen: six rounded tiles, one per leerjaar, each a little world of that leerjaar (the chosen one
// larger with a thick border in its world's colour). Nothing chosen yet = the bar glows (kiosk.css, never under reduced
// motion) and says "Kies je leerjaar".
export default function LeerjaarBar({ grade, onPick }: { grade: Leerjaar | null; onPick(g: Leerjaar): void }) {
    const unset = grade === null;
    return (
        <section className={`zelf-years${unset ? ' is-unset' : ''}`} aria-labelledby="zelf-years-label">
            <h2 id="zelf-years-label" className="zelf-years-label">{unset ? 'Kies je leerjaar' : 'leerjaar'}</h2>
            <div className="zelf-years-row">
                {LEERJAREN.map(g => (
                    <button key={g} type="button" className={`zelf-year is-${g}`} aria-pressed={g === grade}
                        aria-label={`Leerjaar ${g}`} onClick={() => onPick(g)}>
                        <Vignette g={g} />
                        <span className="zy-num" aria-hidden>{g}</span>
                    </button>
                ))}
            </div>
        </section>
    );
}
