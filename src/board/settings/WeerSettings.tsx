import { useState } from 'react';
import { Section, Toggle, Hint, Button, ButtonRow, Segmented, Slider } from './controls';
import { useSetProps } from './baseProps';
import { weerModel, REFRESH_OPTIONS } from './weerModel';
import { useBoardStore } from '../useBoardStore';
import type { BoardWidget } from '../boardTypes';

interface Place { name: string; admin1?: string; latitude: number; longitude: number }

export default function WeerSettings({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const w = weerModel(widget);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Place[]>([]);

    const search = () => {
        if (!query.trim()) return;
        fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=6&language=nl`)
            .then(r => r.json())
            .then(j => setResults(j.results ?? []))
            .catch(() => setResults([]));
    };
    const pick = (r: Place) => {
        set({ lat: r.latitude, lon: r.longitude, placeName: r.name });
        setResults([]); setQuery('');
    };
    const useCurrent = () => {
        const props = { ...widget.props };
        delete props.lat; delete props.lon; delete props.placeName;
        updateWidget(widget.id, { props });
    };

    return (
        <>
            <Section title={`Locatie: ${typeof widget.props?.placeName === 'string' ? widget.props.placeName : 'huidige locatie'}`}>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <input value={query} placeholder="Zoek gemeente…" aria-label="Zoek gemeente"
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') search(); }}
                        style={inputStyle} />
                    <Button onClick={search}>Zoek</Button>
                </div>
                {results.map((r, i) => (
                    <Button key={i} onClick={() => pick(r)}>{r.name}{r.admin1 ? ` (${r.admin1})` : ''}</Button>
                ))}
                <ButtonRow><Button onClick={useCurrent}>Gebruik huidige locatie</Button></ButtonRow>
            </Section>
            <Section title="Weergave">
                <Toggle label="Weer (icoon + naam)" checked={w.showWeather} onChange={(v) => set({ showWeather: v })} />
                <Toggle label="Temperatuur nu" checked={w.showTemp} onChange={(v) => set({ showTemp: v })} />
                <Toggle label="Min / max vandaag" checked={w.showMinMax} onChange={(v) => set({ showMinMax: v })} />
                <Toggle label="Zonsopgang / -ondergang" checked={w.showSun} onChange={(v) => set({ showSun: v })} />
                <Toggle label="Kans op neerslag" checked={w.showRainPct} onChange={(v) => set({ showRainPct: v })} />
                <Toggle label="Hoeveelheid neerslag" checked={w.showRainMm} onChange={(v) => set({ showRainMm: v })} />
                <Toggle label="Wind" checked={w.showWind} onChange={(v) => set({ showWind: v })} />
                <Toggle label="Plaatsnaam" checked={w.showPlace} onChange={(v) => set({ showPlace: v })} />
                <Slider label="Voorspelling" value={w.forecastDays} min={0} max={5} onChange={(v) => set({ forecastDays: v })}
                    format={(v) => (v === 0 ? 'enkel vandaag' : v === 1 ? '1 dag' : `${v} dagen`)} />
                <Segmented label="Iconen" value={w.iconStyle} onChange={(v) => set({ iconStyle: v })}
                    options={[{ value: 'emoji', label: 'Kleurrijk' }, { value: 'icoon', label: 'Lijntekening' }]} />
            </Section>
            <Section title="Eenheden">
                <Segmented label="Temperatuur" value={w.unit} onChange={(v) => set({ unit: v })}
                    options={[{ value: 'C', label: '°C' }, { value: 'F', label: '°F' }]} />
                <Segmented label="Windsnelheid" value={w.windUnit} onChange={(v) => set({ windUnit: v })}
                    options={[{ value: 'kmh', label: 'km/u' }, { value: 'ms', label: 'm/s' }, { value: 'bft', label: 'Beaufort' }]} />
            </Section>
            <Section title="Vernieuwen">
                <Segmented label="Weer opnieuw ophalen" value={w.refreshMin} onChange={(v) => set({ refreshMin: v })}
                    options={REFRESH_OPTIONS.map(m => ({ value: m, label: m === 0 ? 'Bij openen' : `${m} min` }))} />
                <Hint>Bron: open-meteo.com.</Hint>
            </Section>
        </>
    );
}

const inputStyle: React.CSSProperties = {
    flex: 1, minWidth: 0, height: '36px', padding: '0 10px', borderRadius: 'var(--radius-xs)',
    border: '1px solid var(--separator)', background: 'var(--bg-surface-2)', color: 'var(--text-main)',
    fontSize: 'var(--text-sm)', outline: 'none',
};
