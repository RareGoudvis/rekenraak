import { LEERJAREN, type Leerjaar } from '../../config/gradePresets';

// One tiny vignette per leerjaar, echoing its backdrop (kiosk/backdrops): bees, monster, lava, jungle, snow, desert.
// Colours come from the .zelf-year.is-N tokens in kiosk.css (--w-sky, --w-ground, --w-a, --w-b).
function Vignette({ g }: { g: Leerjaar }) {
    // The art lives in the bottom strip and the corners; the number stands on the clean upper middle.
    const ground = <path className="zy-ground" d="M0 72 Q30 62 60 70 T100 66 V100 H0Z" />;
    const art = {
        1: <>{ground}<path className="zy-b" d="M6 78 Q6 56 22 54 Q38 56 38 78Z" /><path className="zy-line" d="M9 66 Q22 62 35 66" /><ellipse className="zy-dark" cx="22" cy="77" rx="5" ry="3.5" /><path className="zy-line" d="M82 90 V68" /><circle className="zy-w" cx="82" cy="64" r="5" /><circle className="zy-a" cx="82" cy="64" r="2.5" /><ellipse className="zy-a" cx="86" cy="16" rx="7" ry="5" /><path className="zy-line" d="M84 12 V20 M88 12 V20" /></>,
        2: <>{ground}<circle className="zy-a" cx="78" cy="96" r="24" /><path className="zy-a" d="M62 78 L60 62 L72 72Z M88 72 L98 62 L98 80Z" /><circle className="zy-w" cx="72" cy="84" r="6" /><circle className="zy-w" cx="86" cy="84" r="6" /><circle className="zy-dark" cx="73" cy="85" r="2.5" /><circle className="zy-dark" cx="85" cy="85" r="2.5" /><circle className="zy-b" cx="14" cy="80" r="8" /></>,
        3: <><path className="zy-ground" d="M0 74 H100 V100 H0Z" /><path className="zy-a" d="M0 84 Q20 76 40 86 T80 84 T100 88 V100 H0Z" /><path className="zy-b" d="M70 76 L82 56 L94 76Z" /><path className="zy-a" d="M77 64 Q82 56 87 64Z" /><circle className="zy-b" cx="14" cy="72" r="8" /></>,
        4: <>{ground}<path className="zy-a" d="M0 100 Q-4 70 24 56 Q30 82 0 100Z" /><path className="zy-b" d="M100 100 Q96 66 78 52 Q64 84 100 100Z" /><path className="zy-line" d="M2 96 Q12 74 22 60 M98 96 Q88 72 80 56" /></>,
        5: <><path className="zy-ground" d="M0 74 Q40 62 100 76 V100 H0Z" /><path className="zy-a" d="M78 76 L88 56 L98 76Z" /><path className="zy-a" d="M81 64 L88 46 L95 64Z" /><circle className="zy-w" cx="12" cy="14" r="3" /><circle className="zy-w" cx="88" cy="12" r="3" /><circle className="zy-w" cx="10" cy="62" r="3" /><circle className="zy-w" cx="30" cy="84" r="3" /></>,
        6: <><circle className="zy-b" cx="86" cy="16" r="8" /><path className="zy-ground" d="M0 74 Q28 62 54 72 T100 68 V100 H0Z" /><path className="zy-a" d="M0 90 Q36 78 100 90 V100 H0Z" /><path className="zy-cactus" d="M14 82 V58 Q14 52 19 52 Q24 52 24 58 V82Z M7 66 Q7 61 12 63 V72 Q7 72 7 66Z M26 62 Q31 62 31 67 V70 Q26 70 26 67Z" /></>,
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
