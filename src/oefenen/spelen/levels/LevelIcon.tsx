import type { SkinOptionIcon } from '../skins/types';
import './levels.css';

// The small picture on a level button: a clock (crossed out = no time pressure) and 0–3 flames.
export default function LevelIcon({ icon }: { icon: SkinOptionIcon }) {
    const flames = Math.max(0, Math.min(3, icon.flames ?? 0));
    if (!icon.clock && !flames) return null;
    return (
        <span className="lv-icon" aria-hidden>
            {icon.clock && (
                <svg className="lv-clock" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9.5" className="lv-face" />
                    <path d="M12 6.5V12l3.6 2.4" className="lv-hand" />
                    {icon.clock === 'off' && <path d="M3.5 3.5l17 17" className="lv-slash" />}
                </svg>
            )}
            {Array.from({ length: flames }, (_, i) => (
                <svg key={i} className="lv-flame" viewBox="0 0 16 24">
                    <path d="M8 1.5c1.2 4 6.5 6.6 6.5 12.6a6.5 6.5 0 0 1-13 0c0-3.4 2-5.4 3.2-8.2.9 2 1.6 3 2.6 3.4C7.6 7 7.2 4.4 8 1.5z" className="lv-fire" />
                    <path d="M8 12.6c1 1.6 3 2.8 3 5a3 3 0 0 1-6 0c0-1.6 1.4-3 3-5z" className="lv-core" />
                </svg>
            ))}
        </span>
    );
}
