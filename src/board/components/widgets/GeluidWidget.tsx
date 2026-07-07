import { useEffect, useRef, useState } from 'react';
import { Microphone, MicrophoneSlash } from '@phosphor-icons/react';

// 5-level classroom noise meter. Mic starts on tap (browser requires a user
// gesture) and stops when toggled off or the widget unmounts.
const LEVEL_COLORS = ['#16a34a', '#84cc16', '#eab308', '#f97316', '#dc2626'];
const LEVEL_LABELS = ['stil', 'fluisteren', 'praten', 'druk', 'te luid!'];

export default function GeluidWidget({ dark }: { dark: boolean }) {
    const [running, setRunning] = useState(false);
    const [level, setLevel] = useState(0);      // 0 = silent … 4 = too loud
    const [denied, setDenied] = useState(false);
    const cleanup = useRef<(() => void) | null>(null);

    const stop = () => { cleanup.current?.(); cleanup.current = null; setRunning(false); setLevel(0); };

    const start = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const ctx = new AudioContext();
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 1024;
            ctx.createMediaStreamSource(stream).connect(analyser);
            const buf = new Uint8Array(analyser.fftSize);
            let smooth = 0;
            const iv = setInterval(() => {
                analyser.getByteTimeDomainData(buf);
                let sum = 0;
                for (let i = 0; i < buf.length; i++) { const d = (buf[i] - 128) / 128; sum += d * d; }
                const rms = Math.sqrt(sum / buf.length);
                // Exponential smoothing keeps the meter calm on speech bursts.
                smooth = smooth * 0.8 + rms * 0.2;
                setLevel(Math.min(4, Math.floor(smooth * 22)));
            }, 120);
            cleanup.current = () => { clearInterval(iv); stream.getTracks().forEach(t => t.stop()); ctx.close(); };
            setRunning(true);
            setDenied(false);
        } catch {
            setDenied(true);
        }
    };

    useEffect(() => () => cleanup.current?.(), []);

    const textColor = dark ? '#fff' : '#111';
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '16px',
            background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(30,64,175,0.06)',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.2)' : 'rgba(30,64,175,0.25)'}`, borderRadius: '10px',
        }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }} aria-label="Geluidsniveau">
                {LEVEL_COLORS.map((c, i) => (
                    <div key={i} style={{
                        width: '38px', height: `${26 + i * 14}px`, borderRadius: '6px',
                        background: running && level >= i ? c : (dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'),
                        transition: 'background 120ms',
                    }} />
                ))}
            </div>
            <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: '18px', fontWeight: 700, color: running ? LEVEL_COLORS[level] : textColor, minHeight: '24px' }}>
                {denied ? 'Geen microfoon-toegang' : running ? LEVEL_LABELS[level] : ''}
            </div>
            <button
                type="button" className="ui-hover" onPointerDown={(e) => e.stopPropagation()}
                onClick={() => (running ? stop() : start())}
                style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px', height: '44px', padding: '0 18px',
                    borderRadius: '10px', border: '1px solid var(--accent-purple)', background: 'var(--bg-active)',
                    color: 'var(--text-main)', fontSize: '14px', cursor: 'pointer', fontFamily: "'Azeret Mono', monospace",
                }}>
                {running ? <><MicrophoneSlash size={18} /> Stop</> : <><Microphone size={18} /> Start meten</>}
            </button>
        </div>
    );
}
