import { useState } from 'react';
import { Section, Toggle, Hint, Button, ButtonRow } from './controls';
import { useSetProps } from './baseProps';
import { weerProps } from '../widgetSizing';
import { useBoardStore } from '../useBoardStore';
import type { BoardWidget } from '../boardTypes';

interface Place { name: string; admin1?: string; latitude: number; longitude: number }

export default function WeerSettings({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const w = weerProps(widget);
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
