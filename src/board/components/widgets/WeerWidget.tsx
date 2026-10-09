import { useEffect, useState } from 'react';
import { weerModel, describe, forecastUrl, windText } from '../../settings/weerModel';
import { fontScale, widgetAccent } from '../../settings/baseProps';
import type { BoardWidget } from '../../boardTypes';

interface DayData { date: string; code: number; tMin: number; tMax: number }
interface WeerData {
    temp: number; code: number; tMin: number; tMax: number;
    sunrise: string; sunset: string; rainPct: number; rainMm: number;
    wind: number | null; windDir: number | null;
    days: DayData[];           // the days after today
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

// Live weather via open-meteo (free, no API key). Location = a teacher-chosen
// place (props.lat/lon/placeName via the settings' city search) or browser
// geolocation, falling back to Brussels when denied. Units, wind, forecast days,
// icon style and the refresh interval come from the ⚙ panel.
export default function WeerWidget({ widget }: { widget: BoardWidget }) {
    const p = weerModel(widget);
    const fs = fontScale(widget);
    const accent = widgetAccent(widget);
    const [data, setData] = useState<WeerData | null>(null);
    const [error, setError] = useState(false);
    const [tick, setTick] = useState(0);
    const fixedLat = typeof widget.props?.lat === 'number' ? widget.props.lat : null;
    const fixedLon = typeof widget.props?.lon === 'number' ? widget.props.lon : null;
    const placeName = typeof widget.props?.placeName === 'string' ? widget.props.placeName : null;

    useEffect(() => {
        if (!p.refreshMin) return;
        const iv = setInterval(() => setTick(t => t + 1), p.refreshMin * 60_000);
        return () => clearInterval(iv);
    }, [p.refreshMin]);

    useEffect(() => {
        let cancelled = false;
        const fetchWeather = (lat: number, lon: number) => {
            fetch(forecastUrl(lat, lon, { unit: p.unit, windUnit: p.windUnit, forecastDays: p.forecastDays })).then(r => r.json()).then(j => {
                if (cancelled) return;
                const d = j.daily ?? {};
                const days: DayData[] = [];
                for (let i = 1; i <= p.forecastDays; i++) {
                    const code = num(d.weather_code?.[i]), lo = num(d.temperature_2m_min?.[i]), hi = num(d.temperature_2m_max?.[i]);
                    if (code !== null && lo !== null && hi !== null && typeof d.time?.[i] === 'string') days.push({ date: d.time[i], code, tMin: Math.round(lo), tMax: Math.round(hi) });
                }
                setError(false);
                setData({
                    temp: Math.round(j.current.temperature_2m),
                    code: j.current.weather_code,
                    tMin: Math.round(d.temperature_2m_min[0]),
                    tMax: Math.round(d.temperature_2m_max[0]),
                    sunrise: String(d.sunrise[0]).slice(11, 16),
                    sunset: String(d.sunset[0]).slice(11, 16),
                    rainPct: d.precipitation_probability_max?.[0] ?? 0,
                    rainMm: d.precipitation_sum?.[0] ?? 0,
                    wind: num(j.current.wind_speed_10m),
                    windDir: num(j.current.wind_direction_10m),
                    days,
                });
            }).catch(() => { if (!cancelled) setError(true); });
        };
        if (fixedLat !== null && fixedLon !== null) {
            fetchWeather(fixedLat, fixedLon);
        } else {
            navigator.geolocation.getCurrentPosition(
                (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
                () => fetchWeather(50.85, 4.35),   // geolocation denied → Brussels
                { timeout: 5000 },
            );
        }
        return () => { cancelled = true; };
    }, [fixedLat, fixedLon, p.unit, p.windUnit, p.forecastDays, tick]);

    const textColor = '#111';
    const muted = 'rgba(0,0,0,0.6)';
    const mono = "'Azeret Mono', monospace";
    const deg = p.unit === 'F' ? '°F' : '°C';
    const icon = (code: number, px: number) => {
        const w = describe(code);
        return p.iconStyle === 'icoon'
            ? <w.Icon size={px * fs} weight="duotone" color={accent ?? '#1e40af'} aria-label={w.label} />
            : <span style={{ fontSize: `${px * fs}px`, lineHeight: 1 }}>{w.icon}</span>;
    };
    const line = (s: string) => <div style={{ fontSize: `${15 * fs}px`, color: muted }}>{s}</div>;
    const tint = accent ?? '#1e40af';

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '14px 18px',
            background: `color-mix(in srgb, ${tint} 6%, transparent)`,
            border: `1px solid color-mix(in srgb, ${tint} 25%, transparent)`, borderRadius: '10px',
            color: textColor, fontFamily: mono,
        }}>
            {p.showPlace && <span style={{ fontSize: `${13 * fs}px`, color: muted }}>📍 {placeName ?? 'Huidige locatie'}</span>}
            {error && <span style={{ fontSize: `${13 * fs}px`, color: muted }}>Weer niet beschikbaar</span>}
            {!data && !error && <span style={{ fontSize: `${13 * fs}px`, color: muted }}>Weer laden…</span>}
            {data && (
                <>
                    {p.showWeather && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {icon(data.code, 44)}
                            <span style={{ fontSize: `${18 * fs}px` }}>{describe(data.code).label}</span>
                        </div>
                    )}
                    {p.showTemp && <div style={{ fontSize: `${38 * fs}px`, fontWeight: 700 }}>{data.temp}{deg}</div>}
                    {p.showMinMax && line(`min ${data.tMin}° · max ${data.tMax}°`)}
                    {p.showSun && line(`🌅 ${data.sunrise} · 🌇 ${data.sunset}`)}
                    {p.showRainPct && line(`☔ ${data.rainPct}% kans`)}
                    {p.showRainMm && line(`💧 ${data.rainMm} mm`)}
                    {p.showWind && data.wind !== null && line(`💨 ${windText(data.wind, data.windDir, p.windUnit)}`)}
                    {data.days.length > 0 && (
                        <div data-weer-forecast style={{ display: 'flex', gap: '8px 18px', marginTop: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {data.days.map(day => (
                                <div key={day.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: `${48 * fs}px` }}>
                                    <span style={{ fontSize: `${12 * fs}px`, color: muted }}>{new Date(`${day.date}T12:00`).toLocaleDateString('nl-BE', { weekday: 'short' })}</span>
                                    {icon(day.code, 26)}
                                    <span style={{ fontSize: `${12 * fs}px`, whiteSpace: 'nowrap' }}>{day.tMin}°/{day.tMax}°</span>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
