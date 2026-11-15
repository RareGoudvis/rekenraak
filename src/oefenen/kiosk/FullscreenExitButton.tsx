import { ArrowsIn } from '@phosphor-icons/react';
import { exitFullscreen, useFullscreen } from './fullscreen';

// Visible only while fullscreen: the way out for a tablet without Esc.
export default function FullscreenExitButton() {
    const on = useFullscreen();
    if (!on) return null;
    return (
        <button type="button" className="kiosk-btn kiosk-btn-quiet kiosk-fs-btn" aria-label="Volledig scherm uit" title="Volledig scherm uit" onClick={exitFullscreen}>
            <ArrowsIn aria-hidden /> <span className="kiosk-fs-text">Volledig scherm uit</span>
        </button>
    );
}
