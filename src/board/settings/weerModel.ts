import { Sun, CloudSun, Cloud, CloudFog, CloudRain, CloudSnow, CloudLightning, type Icon } from '@phosphor-icons/react';
import { weerProps, type WeerProps } from '../widgetSizing';
import type { BoardWidget } from '../boardTypes';

// Weer widget on top of weerProps: units, wind, forecast days, icon style, refresh interval.

export type WindUnit = 'kmh' | 'ms' | 'bft';
export interface WeerModel extends WeerProps {
    unit: 'C' | 'F';
    windUnit: WindUnit;
    showWind: boolean;
    forecastDays: number;      // 0-5 days after today
    iconStyle: 'emoji' | 'icoon';
    refreshMin: number;        // 0 = only when the board opens (today)
    showPlace: boolean;
}

export const REFRESH_OPTIONS = [0, 15, 30, 60] as const;

export function weerModel(widget: BoardWidget): WeerModel {
    const p = widget.props ?? {};
    return {
        ...weerProps(widget),
        unit: p.unit === 'F' ? 'F' : 'C',
        windUnit: p.windUnit === 'ms' || p.windUnit === 'bft' ? p.windUnit : 'kmh',
        showWind: p.showWind === true,
        forecastDays: Number.isInteger(p.forecastDays) ? Math.min(5, Math.max(0, p.forecastDays as number)) : 0,
        iconStyle: p.iconStyle === 'icoon' ? 'icoon' : 'emoji',
        refreshMin: REFRESH_OPTIONS.includes(p.refreshMin as 0) ? p.refreshMin as number : 0,
        showPlace: p.showPlace !== false,
    };
}

// WMO weather codes → emoji, line icon + Dutch label (compact classroom set).
export function describe(code: number): { icon: string; Icon: Icon; label: string } {
    if (code === 0) return { icon: '☀️', Icon: Sun, label: 'zonnig' };
    if (code <= 2) return { icon: '🌤️', Icon: CloudSun, label: 'licht bewolkt' };
    if (code === 3) return { icon: '☁️', Icon: Cloud, label: 'bewolkt' };
    if (code <= 48) return { icon: '🌫️', Icon: CloudFog, label: 'mist' };
    if (code <= 57) return { icon: '🌦️', Icon: CloudRain, label: 'motregen' };
    if (code <= 67) return { icon: '🌧️', Icon: CloudRain, label: 'regen' };
    if (code <= 77) return { icon: '🌨️', Icon: CloudSnow, label: 'sneeuw' };
    if (code <= 82) return { icon: '🌧️', Icon: CloudRain, label: 'buien' };
    if (code <= 86) return { icon: '🌨️', Icon: CloudSnow, label: 'sneeuwbuien' };
    return { icon: '⛈️', Icon: CloudLightning, label: 'onweer' };
}

export function forecastUrl(lat: number, lon: number, m: Pick<WeerModel, 'unit' | 'windUnit' | 'forecastDays'>): string {
    return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
        + `&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m`
        + `&daily=weather_code,temperature_2m_min,temperature_2m_max,sunrise,sunset,precipitation_probability_max,precipitation_sum`
        + (m.unit === 'F' ? '&temperature_unit=fahrenheit' : '')
        // Beaufort is computed from km/h.
        + (m.windUnit === 'ms' ? '&wind_speed_unit=ms' : '')
        + `&timezone=auto&forecast_days=${1 + m.forecastDays}`;
}

// Beaufort scale upper bounds in km/h (0 = stil … 12 = orkaan).
const BFT_KMH = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];
export function beaufort(kmh: number): number {
    const i = BFT_KMH.findIndex(b => kmh < b);
    return i === -1 ? 12 : i;
}

const COMPASS = ['N', 'NO', 'O', 'ZO', 'Z', 'ZW', 'W', 'NW'];
export const compass = (deg: number) => COMPASS[Math.round(((deg % 360) + 360) % 360 / 45) % 8];

export function windText(speed: number, dirDeg: number | null, unit: WindUnit): string {
    const dir = dirDeg === null ? '' : `${compass(dirDeg)} `;
    if (unit === 'bft') return `${dir}${beaufort(speed)} Bft`;
    return `${dir}${Math.round(speed)} ${unit === 'ms' ? 'm/s' : 'km/u'}`;
}
