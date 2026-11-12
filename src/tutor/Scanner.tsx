import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from '@phosphor-icons/react';
import { TUTOR_HASH_PREFIX } from '../services/oefenen/tutorPayload';

// The browser's own QR reader (Chrome on Chromebooks and Android). No library: where it is
// missing (Safari, Firefox) the phone's camera app opens the QR link just as well.
interface BarcodeDetectorLike { detect(source: CanvasImageSource): Promise<{ rawValue: string }[]> }
type DetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorLike;
const Detector = (globalThis as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;

export default function Scanner({ onCancel, onHash }: { onCancel(): void; onHash(hash: string): void }) {
    const video = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState<string | null>(Detector ? null : 'Deze browser kan zelf geen QR-code lezen. Open de camera-app van je toestel en richt die op de QR-code: dan opent deze pagina vanzelf.');

    useEffect(() => {
        if (!Detector) return;
        let stream: MediaStream | null = null;
        let timer = 0;
        let stopped = false;
        const detector = new Detector({ formats: ['qr_code'] });
        const look = async () => {
            if (stopped || !video.current) return;
            try {
                const found = await detector.detect(video.current);
                const hit = found.map(f => f.rawValue).find(v => v.includes(TUTOR_HASH_PREFIX));
                if (hit) { onHash(hit.slice(hit.indexOf(TUTOR_HASH_PREFIX))); return; }
                if (found.length) setError('Dit is geen QR-code van een RekenRaak-blad.');
            } catch { /* a frame that is not ready yet */ }
            timer = window.setTimeout(look, 300);
        };
        navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } })
            .then((s) => {
                stream = s;
                if (stopped) { s.getTracks().forEach(t => t.stop()); return; }
                if (video.current) { video.current.srcObject = s; void video.current.play(); look(); }
            })
            .catch(() => setError('De camera kon niet starten. Geef de pagina toestemming voor de camera, of gebruik de camera-app van je toestel.'));
        return () => { stopped = true; window.clearTimeout(timer); stream?.getTracks().forEach(t => t.stop()); };
    }, [onHash]);

    return (
        <div className="tutor-app">
            <header className="tutor-bar">
                <button type="button" className="tutor-back" onClick={onCancel} aria-label="Stoppen met scannen"><ArrowLeft /></button>
                <h1>Scan je blad</h1>
            </header>
            <main className="tutor-main">
                {Detector && <video ref={video} className="tutor-video" muted playsInline aria-label="Camerabeeld" />}
                {error ? <p className="tutor-error" role="alert">{error}</p> : <p className="tutor-quiet">Richt de camera op de QR-code onderaan je blad.</p>}
            </main>
        </div>
    );
}
