import { createPortal } from 'react-dom';
import './rotatePrompt.css';

// "Draai je toestel": a phone held upright shows this over a game (every game), or over an Oefenmodus / Zelf
// exercise whose card is wider than the screen. It goes away by itself once the phone lies on its side.
// A portal on body: no screen's own positioning rule (the kiosk's .kid-backdrop ~ *) pulls it into the page flow.

export default function RotatePrompt({ lead = 'Leg je toestel plat, dan past alles.' }: { lead?: string }) {
    return createPortal(
        <div className="rotate-prompt" role="dialog" aria-modal="true" aria-labelledby="rotate-prompt-title">
            <svg className="rotate-art" viewBox="0 0 200 200" aria-hidden>
                <path className="rotate-arrow" d="M44 58 A78 78 0 0 1 150 40" />
                <path className="rotate-arrow-head" d="M138 26 L156 42 L134 52 Z" />
                <g className="rotate-phone">
                    <rect className="rotate-phone-body" x="68" y="44" width="64" height="112" rx="14" />
                    <rect className="rotate-phone-screen" x="76" y="56" width="48" height="84" rx="6" />
                    <circle className="rotate-phone-dot" cx="100" cy="148" r="4" />
                    <g className="rotate-phone-face">
                        <circle cx="91" cy="92" r="3.5" /><circle cx="109" cy="92" r="3.5" />
                        <path d="M90 104 Q100 112 110 104" />
                    </g>
                </g>
                <path className="rotate-spark is-1" d="M30 120 l6 0 M33 117 l0 6" />
                <path className="rotate-spark is-2" d="M166 128 l8 0 M170 124 l0 8" />
            </svg>
            <h1 id="rotate-prompt-title" className="rotate-title">Draai je toestel</h1>
            <p className="rotate-lead">{lead}</p>
        </div>,
        document.body,
    );
}
