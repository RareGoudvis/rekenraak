import { useEffect, useRef, useState } from 'react';
import { Microphone, MicrophoneSlash } from '@phosphor-icons/react';
import { useBoardStore } from '../../useBoardStore';
import { geluidProps, bandOf, bandColor, rmsToLevel, type GeluidModel, type Band } from '../../settings/geluidModel';
import { playTone } from '../../settings/tones';
import type { BoardWidget } from '../../boardTypes';

export default function GeluidWidget({ widget }: { widget: BoardWidget }) {
    const m = geluidProps(widget);
    return m.mode === 'meter' ? <NoiseMeter widget={widget} m={m} /> : <Poster widget={widget} m={m} />;
}

// Classroom noise-level poster (owner reference): coloured rows; the teacher taps the level
// that applies right now — active row full-strength, rest dimmed.
function Poster({ widget, m }: { widget: BoardWidget; m: GeluidModel }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
            {m.posterLevels.map((l, n) => {
                const on = m.level === n;
                return (
                    <button
                        key={n} type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => updateWidget(widget.id, { props: { ...widget.props, level: n } })}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left',
                            padding: '8px 12px', borderRadius: '12px', cursor: 'pointer',
                            background: l.color, opacity: on ? 1 : 0.35,
                            border: on ? '3px solid #111' : '3px solid transparent',
                            transform: on ? 'scale(1.02)' : 'none', transition: 'all 120ms',
                        }}
                    >
                        <span style={{
                            width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                            background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: "'Azeret Mono', monospace", fontWeight: 800, fontSize: '24px', color: '#111',
                            border: '2px solid rgba(0,0,0,0.35)',
                        }}>{n}</span>
                        <span>
                            <span style={{ display: 'block', fontFamily: "'Azeret Mono', monospace", fontWeight: 800, fontSize: '19px', color: '#111' }}>{l.title}</span>
                            {m.showDesc && l.desc && <span style={{ display: 'block', fontSize: '12px', fontStyle: 'italic', color: 'rgba(0,0,0,0.75)' }}>{l.desc}</span>}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

// Live microphone level (0..100, ~12 updates/s). Nothing is recorded: the analyser reads the
// current buffer and drops it. `raw` ignores the calibration so calibrating can measure it;
// `peak` is the highest raw level of the last 2 s (peak hold).
function useMicLevel(on: boolean, sensitivity: number): { raw: number; peak: number; error: string } {
    const [{ raw, peak }, setLevels] = useState({ raw: 0, peak: 0 });
    const [error, setError] = useState('');
    useEffect(() => {
        if (!on) return;
        let stream: MediaStream | null = null, ac: AudioContext | null = null, raf = 0, cancelled = false;
        if (!navigator.mediaDevices?.getUserMedia) {
            queueMicrotask(() => setError('Geen microfoon beschikbaar in deze browser.'));
            return;
        }
        navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => {
            if (cancelled) { s.getTracks().forEach(t => t.stop()); return; }
            stream = s;
            ac = new AudioContext();
            const an = ac.createAnalyser();
            an.fftSize = 2048;
            ac.createMediaStreamSource(s).connect(an);
            const buf = new Float32Array(an.fftSize);
            let last = 0, peakV = 0, peakAt = 0;
            const loop = (t: number) => {
                raf = requestAnimationFrame(loop);
                if (t - last < 80) return;
                last = t;
                an.getFloatTimeDomainData(buf);
                let sum = 0;
                for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
                const v = rmsToLevel(Math.sqrt(sum / buf.length), sensitivity);
                if (v >= peakV || t - peakAt > 2000) { peakV = v; peakAt = t; }
                setLevels({ raw: v, peak: peakV });
            };
            raf = requestAnimationFrame(loop);
            setError('');
        }).catch(() => { if (!cancelled) setError('Geen toegang tot de microfoon.'); });
        return () => {
            cancelled = true;
            cancelAnimationFrame(raf);
            stream?.getTracks().forEach(t => t.stop());
            void ac?.close();
        };
    }, [on, sensitivity]);
    return { raw: on ? raw : 0, peak: on ? peak : 0, error };
}

function NoiseMeter({ widget, m }: { widget: BoardWidget; m: GeluidModel }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const [listening, setListening] = useState(false);
    const { raw, peak, error } = useMicLevel(listening, m.sensitivity);
    const level = Math.max(0, Math.min(100, raw - m.calibration));
    const band = bandOf(level, m);
    const col = bandColor(band, m);

    // Alarm: one tone per 3 s while red, never when muted.
    const lastAlarm = useRef(0);
    useEffect(() => {
        if (band !== 'te-luid' || !m.alarmSound || m.muted) return;
        const now = Date.now();
        if (now - lastAlarm.current < 3000) return;
        lastAlarm.current = now;
        playTone(m.alarmTone);
    }, [band, m.alarmSound, m.muted, m.alarmTone]);

    // Calibration request from the settings panel: average the raw level for 2 s, store it.
    const calibrateAt = typeof widget.props?.calibrateAt === 'number' ? widget.props.calibrateAt : 0;
    const samples = useRef<number[]>([]);
    const [calibrating, setCalibrating] = useState(false);
    const [prevReq, setPrevReq] = useState(calibrateAt);
    if (prevReq !== calibrateAt) {
        setPrevReq(calibrateAt);
        setCalibrating(true);
        setListening(true);
    }
    useEffect(() => {
        if (!calibrating) return;
        samples.current = [];
        const t = setTimeout(() => {
            const s = samples.current;
            const floor = s.length ? s.reduce((a, b) => a + b, 0) / s.length : 0;
            const w = useBoardStore.getState().pages.flatMap(p => p.widgets).find(x => x.id === widget.id);
            // A small margin above the measured hum so a silent class reads as 0.
            if (w) updateWidget(widget.id, { props: { ...w.props, calibration: Math.round(Math.min(80, floor + 3)) } });
            setCalibrating(false);
        }, 2000);
        return () => clearTimeout(t);
    }, [calibrating, widget.id, updateWidget]);
    useEffect(() => { if (calibrating) samples.current.push(raw); }, [raw, calibrating]);

    const flash = listening && band === 'te-luid' && m.alarmFlash;

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', padding: '16px',
            background: flash ? `color-mix(in srgb, ${m.alarmColor} 18%, transparent)` : undefined,
            animation: flash ? 'rk-blink 0.8s step-start infinite' : undefined,
        }}>
            {m.display === 'verkeerslicht' ? <TrafficLight band={listening ? band : null} m={m} />
                : m.display === 'smiley' ? <Smiley band={band} color={listening ? col : '#d1d5db'} />
                    : <Bar level={listening ? level : 0} peak={m.peakHold && listening ? Math.max(0, peak - m.calibration) : null} m={m} color={col} />}
            <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: '13px', color: 'rgba(0,0,0,0.6)', minHeight: '18px', textAlign: 'center' }}>
                {calibrating ? 'Kalibreren… (stilte)' : error}
            </div>
            <button
                type="button" className="ui-hover" onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setListening(!listening)}
                style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    height: '44px', padding: '0 20px', borderRadius: '10px', cursor: 'pointer',
                    border: '1px solid var(--accent-purple)', background: 'var(--bg-active)',
                    color: 'var(--text-main)', fontSize: '14px', fontFamily: "'Azeret Mono', monospace",
                }}>
                {listening ? <><MicrophoneSlash size={18} /> Stop meten</> : <><Microphone size={18} /> Start meten</>}
            </button>
            <style>{'@keyframes rk-blink { 50% { opacity: 0.6; } }'}</style>
        </div>
    );
}

function Bar({ level, peak, m, color }: { level: number; peak: number | null; m: GeluidModel; color: string }) {
    return (
        <div data-geluid-display="balk" style={{ position: 'relative', width: '300px', height: '56px', borderRadius: '12px', overflow: 'hidden', border: '2px solid rgba(0,0,0,0.25)' }}>
            {/* Faint band backdrop shows where the thresholds sit. */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', opacity: 0.18 }}>
                <div style={{ width: `${m.warnAt}%`, background: m.quietColor }} />
                <div style={{ width: `${m.alarmAt - m.warnAt}%`, background: m.warnColor }} />
                <div style={{ flex: 1, background: m.alarmColor }} />
            </div>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${level}%`, background: color, transition: 'width 80ms linear' }} />
            {peak !== null && peak > 0 && <div data-geluid-peak style={{ position: 'absolute', top: 0, bottom: 0, left: `calc(${peak}% - 2px)`, width: '4px', background: '#111' }} />}
        </div>
    );
}

function TrafficLight({ band, m }: { band: Band | null; m: GeluidModel }) {
    const lamps: Array<[Band, string]> = [['te-luid', m.alarmColor], ['let-op', m.warnColor], ['stil', m.quietColor]];
    return (
        <div data-geluid-display="verkeerslicht" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px', borderRadius: '22px', background: '#1f2937' }}>
            {lamps.map(([b, c]) => (
                <span key={b} style={{ width: '64px', height: '64px', borderRadius: '50%', background: c, opacity: band === b ? 1 : 0.2, boxShadow: band === b ? `0 0 24px ${c}` : 'none' }} />
            ))}
        </div>
    );
}

function Smiley({ band, color }: { band: Band; color: string }) {
    // Mouth curve: smile when quiet, flat on orange, frown when too loud.
    const mouth = band === 'stil' ? 'M 35 62 Q 50 76 65 62' : band === 'let-op' ? 'M 35 66 L 65 66' : 'M 35 70 Q 50 56 65 70';
    return (
        <svg data-geluid-display="smiley" width={150} height={150} viewBox="0 0 100 100">
            <circle cx={50} cy={50} r={46} fill={color} stroke="#111" strokeWidth={3} />
            <circle cx={36} cy={40} r={5} fill="#111" />
            <circle cx={64} cy={40} r={5} fill="#111" />
            <path d={mouth} fill="none" stroke="#111" strokeWidth={4} strokeLinecap="round" />
        </svg>
    );
}
