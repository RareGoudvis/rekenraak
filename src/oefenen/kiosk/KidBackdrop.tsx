import { sceneOf } from './backdrops';

// The pupil pages' sky (kiosk.css .kid-backdrop): drawn clouds and a hill along the bottom, plus balloons on the
// first screen or confetti on the end screen. Static SVG behind the content, decoration only.
// A known leerjaar swaps the sky and hill for that leerjaar's scene (backdrops/).
const CONFETTI = (
    <svg className="kid-confetti" viewBox="0 0 1180 340" preserveAspectRatio="xMidYMin slice">
        <rect className="kc-0" x="180" y="90" width="14" height="22" rx="3" transform="rotate(-20 187 101)" />
        <rect className="kc-1" x="980" y="120" width="14" height="22" rx="3" transform="rotate(25 987 131)" />
        <circle className="kc-2" cx="250" cy="210" r="8" />
        <circle className="kc-3" cx="930" cy="230" r="8" />
        <rect className="kc-1" x="120" y="300" width="12" height="20" rx="3" transform="rotate(15 126 310)" />
        <rect className="kc-0" x="1040" y="300" width="12" height="20" rx="3" transform="rotate(-15 1046 310)" />
    </svg>
);

const CLOUD = 'M70 130 q0 -26 30 -26 q10 -24 40 -19 q27 -11 41 13 q27 0 27 24 q0 17 -21 17 h-101 q-16 0 -16 -9 z';

export default function KidBackdrop({ clouds = true, extra, grade }: { clouds?: boolean; extra?: 'balloons' | 'confetti'; grade?: number | null }) {
    const scene = sceneOf(grade);
    if (scene) return <div className={`kid-backdrop is-theme ks-${grade}`} aria-hidden>{scene}{extra === 'confetti' && CONFETTI}</div>;
    return (
        <div className="kid-backdrop" aria-hidden>
            {clouds && (
                <>
                    <svg className="kid-cloud kid-cloud-l" viewBox="64 68 150 76"><path d={CLOUD} /></svg>
                    <svg className="kid-cloud kid-cloud-r" viewBox="64 68 150 76"><path d={CLOUD} /></svg>
                </>
            )}
            {extra === 'balloons' && (
                <svg className="kid-balloons" viewBox="0 0 140 170">
                    <path d="M70 92 q-6 40 6 74 M118 133 q-4 24 -26 33 M24 140 q6 16 40 26" />
                    <ellipse className="kb-0" cx="70" cy="50" rx="34" ry="42" />
                    <ellipse className="kb-1" cx="118" cy="98" rx="20" ry="35" />
                    <ellipse className="kb-2" cx="24" cy="106" rx="20" ry="34" />
                </svg>
            )}
            {extra === 'confetti' && CONFETTI}
            <svg className="kid-hill" viewBox="0 0 1180 100" preserveAspectRatio="none">
                <path d="M0 40 Q 300 0 620 30 T 1180 10 V 104 H 0 Z" vectorEffect="non-scaling-stroke" />
            </svg>
        </div>
    );
}
