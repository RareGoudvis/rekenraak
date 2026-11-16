import type { ReactNode } from 'react';
import { LEERJAREN, type Leerjaar } from '../../config/gradePresets';
import { Sticker } from '../kiosk/backdrops/parts';

// One small scene per leerjaar, a still from its backdrop (kiosk/backdrops): the same far layer, ground and main figure,
// in the same merged-sticker style. The art keeps to the bottom strip and the corners; the number stands on the sky.
const Grounds = ({ far }: { far: string }) => (
    <>
        <path className="ks-far1" d={far} />
        <path className="zy-ground-back" d="M0 76 Q30 68 60 74 T100 72 V100 H0Z" />
        <path className="zy-ground" d="M0 86 Q40 80 100 88 V100 H0Z" />
    </>
);

const ray = (cx: number, cy: number, a: number, r0: number, r1: number) => {
    const c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180);
    return `M${cx + c * r0} ${cy + s * r0} L${cx + c * r1} ${cy + s * r1}`;
};

const ART: Record<Leerjaar, ReactNode> = {
    1: <>
        <Grounds far="M-2 66 Q20 56 40 63 T80 60 T102 62 V100 H-2Z" />
        <path className="ks-wood" d="M66 56 h2 v7 h-2Z" /><circle className="ks-leaf" cx="67" cy="54" r="5" />
        <Sticker>
            <path className="ks-wood-dark" d="M3 86 L4 98 H34 L35 86 Z" />
            <path className="ks-honey" d="M7 87 Q6 62 19 60 Q32 62 31 87 Z" />
        </Sticker>
        <path className="ks-fine" d="M9 70 Q19 66 29 70 M7 78 Q19 74 31 78" />
        <ellipse className="ks-eye" cx="19" cy="83" rx="3.5" ry="2.5" />
        <Sticker>
            <path className="ks-rope is-leaf" d="M88 100 Q86 88 88 76" />
            {[0, 72, 144, 216, 288].map(a => (
                <circle key={a} className="ks-pink" cx={88 + Math.cos(a * Math.PI / 180) * 3.6} cy={74 + Math.sin(a * Math.PI / 180) * 3.6} r="2.8" />
            ))}
        </Sticker>
        <circle className="ks-honey ks-ns" cx="88" cy="74" r="2.2" />
        <g transform="translate(85 16)">
            <ellipse className="ks-wing" cx="-1" cy="-5" rx="3" ry="4" />
            <Sticker><ellipse className="ks-honey" cx="0" cy="0" rx="6" ry="4.5" /></Sticker>
            <path className="ks-fine" d="M-2 -4 V4 M1.5 -4.5 V4.5" />
            <circle className="ks-eye" cx="4" cy="-1" r="1" />
        </g>
        <ellipse className="ks-pink" cx="10" cy="32" rx="3" ry="1.8" transform="rotate(-30 10 32)" />
    </>,
    2: <>
        <Grounds far="M-2 62 Q20 52 44 60 T102 58 V100 H-2Z" />
        <path className="ks-pink" d="M20 56 Q20 49 26 49 Q32 49 32 56 Z" />
        <path className="ks-belly" d="M24 56 h4 v6 h-4Z" />
        <Sticker>
            <path className="ks-teal" d="M66 78 L63 64 L72 72 Z M90 72 L97 63 L96 78 Z" />
            <circle className="ks-teal" cx="80" cy="92" r="20" />
        </Sticker>
        <circle className="ks-white" cx="74" cy="82" r="5" />
        <circle className="ks-white" cx="86" cy="82" r="5" />
        <circle className="ks-eye" cx="75" cy="83" r="2.3" />
        <circle className="ks-eye" cx="85" cy="83" r="2.3" />
        <path className="zy-ground ks-ns" d="M52 100 Q62 88 102 90 V100 Z" />
        <path className="ks-fine" d="M52 100 Q62 88 102 90" />
        <g transform="translate(14 16)">
            <Sticker>
                <ellipse className="ks-white" cx="-6" cy="-2" rx="4.5" ry="2.5" />
                <ellipse className="ks-white" cx="6" cy="-2" rx="4.5" ry="2.5" />
                <circle className="ks-pink" cx="0" cy="0" r="5.5" />
            </Sticker>
            <circle className="ks-white" cx="1" cy="-1" r="2.2" />
            <circle className="ks-eye" cx="1.5" cy="-0.8" r="1.1" />
        </g>
        <circle className="ks-white" cx="90" cy="30" r="3" fillOpacity="0.4" />
    </>,
    3: <>
        <Grounds far="M-2 66 L14 56 L26 62 L40 52 L56 64 L102 62 V100 H-2Z" />
        <Sticker>
            <path className="ks-terra" d="M62 92 L78 62 Q80 58 84 58 L90 58 Q94 58 96 62 L112 92 Z" />
            <path className="ks-lava" d="M78 62 Q80 57 84 57 L90 57 Q94 57 96 62 L97 66 Q95 70 93 66 L91 71 Q89 74 87 70 Q84 75 82 69 Q80 72 78 67 Z" />
            <circle className="ks-smoke" cx="84" cy="48" r="4" />
            <circle className="ks-smoke" cx="90" cy="46" r="5" />
        </Sticker>
        <circle className="ks-eye" cx="82" cy="76" r="1.6" />
        <circle className="ks-eye" cx="92" cy="76" r="1.6" />
        <path className="ks-fine" d="M84 81 Q87 84 90 81" />
        <Sticker>
            <path className="ks-rope is-fern" d="M10 100 Q8 86 14 76" />
            {[0.3, 0.55, 0.8].map(t => (
                <ellipse key={t} className="ks-fern" cx={10 + t * 4} cy={100 - t * 22} rx="5" ry="2" transform={`rotate(-30 ${10 + t * 4} ${100 - t * 22})`} />
            ))}
        </Sticker>
        <circle className="ks-ember ks-ns" cx="72" cy="40" r="1.4" />
        <circle className="ks-ember ks-ns" cx="98" cy="34" r="1.2" />
    </>,
    4: <>
        <Grounds far="M-2 62 Q8 52 18 56 Q28 46 40 54 Q52 48 62 56 Q76 50 88 58 Q96 54 102 58 V100 H-2Z" />
        <Sticker><path className="ks-leaf-dark" d="M0 100 Q-2 72 22 58 Q26 84 0 100 Z" /></Sticker>
        <Sticker><path className="ks-leaf" d="M2 100 Q14 78 40 76 Q30 98 2 100 Z" /></Sticker>
        <path className="ks-fine" d="M2 98 Q12 76 20 62 M4 99 Q22 84 36 78" />
        <Sticker><path className="ks-red" d="M86 70 L90 70 L96 94 L92 95 Z" /></Sticker>
        <Sticker><path className="ks-wood" d="M102 70 Q86 74 66 80 Q64 83 67 84 Q86 80 102 78 Z" /></Sticker>
        <Sticker>
            <ellipse className="ks-red" cx="84" cy="64" rx="6" ry="9" />
            <circle className="ks-red" cx="81" cy="54" r="6" />
            <path className="ks-belly" d="M76 52 Q70 52 70 58 Q72 61 74 60 Q74 56 77 56 Z" />
            <path className="ks-blue" d="M86 58 Q93 62 90 72 L87 78 Q83 70 84 62 Z" />
        </Sticker>
        <circle className="ks-white" cx="80" cy="53" r="2.4" />
        <circle className="ks-eye" cx="80" cy="53" r="1.2" />
        <path className="ks-rain" d="M12 18 l-1 6 M30 8 l-1 6 M92 20 l-1 6 M70 10 l-1 6" />
    </>,
    5: <>
        <Grounds far="M-2 66 L14 54 L24 60 L40 46 L56 62 L70 56 L102 66 V100 H-2Z" />
        <path className="ks-white ks-ns" d="M40 46 L45 50 Q43 52 41 50 Q39 53 37 50 Q35 52 34 50 Z M14 54 L18 57 Q16 59 14 57 Q12 59 10 57 Z" />
        <Sticker>
            <path className="ks-wood" d="M84 90 h5 v8 h-5 Z" />
            <path className="ks-pine" d="M72 90 L86 64 L100 90 Q93 93 86 90 Q79 93 72 90 Z" />
            <path className="ks-pine" d="M75 76 L86 52 L97 76 Q91 79 86 76 Q81 79 75 76 Z" />
        </Sticker>
        <path className="ks-white ks-ns" d="M86 52 L90.5 61 Q88 63 86 61 Q84 63 81.5 61 Z" />
        <path className="ks-fine" d="M75 76 Q81 79 86 76 Q91 79 97 76" />
        <Sticker>
            <circle className="ks-white" cx="16" cy="88" r="9" />
            <circle className="ks-white" cx="16" cy="73" r="6.5" />
            <rect className="ks-hat" x="11" y="60" width="10" height="7" rx="1" />
            <rect className="ks-hat" x="8.5" y="66" width="15" height="2.6" rx="1.3" />
        </Sticker>
        <circle className="ks-eye" cx="14" cy="72" r="0.9" />
        <circle className="ks-eye" cx="18" cy="72" r="0.9" />
        <path className="ks-orange ks-ns" d="M16 74 L22 75.5 L16 76.5 Z" />
        <path className="ks-red ks-ns" d="M10.5 78 Q16 81 21.5 78 L21.5 80 Q16 83 10.5 80 Z" />
        {[[40, 12], [64, 20], [90, 10], [8, 40], [94, 40]].map(([x, y]) => <circle key={x} className="ks-white" cx={x} cy={y} r="2.2" />)}
    </>,
    6: <>
        {[0, 45, 90, 135, 180, 225, 270, 315].map(a => <path key={a} className="zy-ray" d={ray(88, 14, a, 10, 13)} />)}
        <circle className="ks-sun" cx="88" cy="14" r="7.5" />
        <Grounds far="M-2 64 Q20 54 40 62 T102 60 V100 H-2Z" />
        <path className="ks-far1" d="M30 66 L42 52 L54 66 Z" />
        <path className="ks-shade" d="M42 52 L54 66 L45 66 Z" />
        <Sticker>
            <rect className="ks-cactus" x="11" y="64" width="9" height="34" rx="4.5" />
            <rect className="ks-cactus" x="4" y="72" width="5" height="12" rx="2.5" />
            <rect className="ks-cactus" x="4" y="80" width="10" height="5" rx="2.5" />
            <rect className="ks-cactus" x="22" y="70" width="5" height="10" rx="2.5" />
            <rect className="ks-cactus" x="17" y="76" width="10" height="5" rx="2.5" />
            <circle className="ks-pink" cx="15.5" cy="63" r="2.4" />
        </Sticker>
        <g transform="translate(-8 0)">
        <Sticker>
            <rect className="ks-sand-dark" x="70" y="80" width="3" height="15" rx="1.5" />
            <rect className="ks-sand-dark" x="76" y="80" width="3" height="15" rx="1.5" />
            <rect className="ks-sand-dark" x="86" y="80" width="3" height="15" rx="1.5" />
            <rect className="ks-sand-dark" x="92" y="80" width="3" height="15" rx="1.5" />
            <path className="ks-sand-dark" d="M67 82 Q67 76 72 74 Q76 66 81 66 Q86 66 89 72 Q93 74 96 76 Q98 84 82 86 Q67 86 67 82 Z" />
            <path className="ks-sand-dark" d="M93 78 Q97 74 98 62 L102 62 Q102 76 97 82 Z" />
            <ellipse className="ks-sand-dark" cx="101" cy="60" rx="5" ry="3.4" />
        </Sticker>
        <circle className="ks-eye" cx="101" cy="59" r="0.9" />
        </g>
    </>,
};

function Vignette({ g }: { g: Leerjaar }) {
    return <svg className="zy-art" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden>{ART[g]}</svg>;
}

// The top bar of the topics screen: six rounded tiles, one per leerjaar, each a little world of that leerjaar (the chosen one
// larger with a thick border in its world's colour). Nothing chosen yet = the bar glows (kiosk.css) and says "Kies je leerjaar".
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
