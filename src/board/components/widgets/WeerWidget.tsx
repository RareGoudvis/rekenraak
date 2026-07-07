import { useEffect, useState } from 'react';
import { weerProps } from '../../widgetSizing';
import type { BoardWidget } from '../../boardTypes';

// WMO weather codes → emoji + Dutch label (compact classroom set).
function describe(code: number): { icon: string; label: string } {
    if (code === 0) return { icon: '☀️', label: 'zonnig' };
    if (code <= 2) return { icon: '🌤️', label: 'licht bewolkt' };
    if (code === 3) return { icon: '☁️', label: 'bewolkt' };
    if (code <= 48) return { icon: '🌫️', label: 'mist' };
    if (code <= 57) return { icon: '🌦️', label: 'motregen' };
    if (code <= 67) return { icon: '🌧️', label: 'regen' };
    if (code <= 77) return { icon: '🌨️', label: 'sneeuw' };
    if (code <= 82) return { icon: '🌧️', label: 'buien' };
    if (code <= 86) return { icon: '🌨️', label: 'sneeuwbuien' };
    return { icon: '⛈️', label: 'onweer' };
}

interface WeerData {
    temp: number; code: number; tMin: number; tMax: number;
    sunrise: string; sunset: string; rainPct: number; rainMm: number;
}

// Live weather via open-meteo (free, no API key). Location = browser
// geolocation, falls back to Brussels when denied.
export default function WeerWidget({ widget, dark }: { widget: BoardWidget; dark: boolean }) {
    const p = weerProps(widget);
    const [data, setData] = useState<WeerData | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const fetchWeather = (lat: number, lon: number) => {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
                + `&current=temperature_2m,weather_code`
                + `&daily=temperature_2m_min,temperature_2m_max,sunrise,sunset,precipitation_probability_max,precipitation_sum`
                + `&timezone=auto&forecast_days=1`;
            fetch(url).then(r => r.json()).then(j => {
                if (cancelled) return;
                setData({
                    temp: Math.round(j.current.temperature_2m),
                    code: j.current.weather_code,
                    tMin: Math.round(j.daily.temperature_2m_min[0]),
                    tMax: Math.round(j.daily.temperature_2m_max[0]),
                    sunrise: String(j.daily.sunrise[0]).slice(11, 16),
                    sunset: String(j.daily.sunset[0]).slice(11, 16),
                    rainPct: j.daily.precipitation_probability_max?.[0] ?? 0,
                    rainMm: j.daily.precipitation_sum?.[0] ?? 0,
                });
            }).catch(() => { if (!cancelled) setError(true); });
        };
        navigator.geolocation.getCurrentPosition(
            (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
            () => fetchWeather(50.85, 4.35),   // geolocation denied → Brussels
            { timeout: 5000 },
        );
        return () => { cancelled = true; };
    }, []);

    const textColor = dark ? '#fff' : '#111';
    const muted = dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';
    const mono = "'Azeret Mono', monospace";

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '14px 18px',
            background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(30,64,175,0.06)',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.2)' : 'rgba(30,64,175,0.25)'}`, borderRadius: '10px',
            color: textColor, fontFamily: mono,
        }}>
            {error && <span style={{ fontSize: '13px', color: muted }}>Weer niet beschikbaar</span>}
            {!data && !error && <span style={{ fontSize: '13px', color: muted }}>Weer laden…</span>}
            {data && (
                <>
                    {p.showWeather && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '44px', lineHeight: 1 }}>{describe(data.code).icon}</span>
                            <span style={{ fontSize: '18px' }}>{describe(data.code).label}</span>
                        </div>
                    )}
                    {p.showTemp && <div style={{ fontSize: '38px', fontWeight: 700 }}>{data.temp}°C</div>}
                    {p.showMinMax && <div style={{ fontSize: '15px', color: muted }}>min {data.tMin}° · max {data.tMax}°</div>}
                    {p.showSun && <div style={{ fontSize: '15px', color: muted }}>🌅 {data.sunrise} · 🌇 {data.sunset}</div>}
                    {p.showRainPct && <div style={{ fontSize: '15px', color: muted }}>☔ {data.rainPct}% kans</div>}
                    {p.showRainMm && <div style={{ fontSize: '15px', color: muted }}>💧 {data.rainMm} mm</div>}
                </>
            )}
        </div>
    );
}
