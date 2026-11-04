import { useState } from 'react';
import { Section, Segmented, Slider, Hint, Button, ButtonRow } from './controls';
import { NumberField, PaletteRow } from './mathControls';
import { useSetProps } from './baseProps';
import { getallenlijnProps, numberLineTicks, type NumberLineTap } from '../mathTools/getallenlijn';
import { INK_COLORS, clean } from '../mathTools/shared';
import type { BoardWidget } from '../boardTypes';

const TAP_HINT: Record<NumberLineTap, string> = {
    geen: 'De lijn reageert niet op tikken: schrijf erop met de pen.',
    markeren: 'Tik op een streepje om er een stip te zetten (nog eens tikken haalt hem weg).',
    springen: 'Tik op het startgetal en dan op waar de sprong landt; elke landing is de volgende start.',
    verbergen: 'Tik op een streepje om het getal te verbergen (invulvakje) of terug te tonen.',
};

export default function GetallenlijnSettings({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const g = getallenlijnProps(widget);
    const ticks = numberLineTicks(g);
    const [jump, setJump] = useState({ from: g.min, size: g.step, count: 3 });

    const drawJumps = () => {
        const out = [];
        let at = jump.from;
        for (let i = 0; i < jump.count; i++) {
            const to = clean(at + jump.size);
            if (to > g.max || to < g.min) break;
            out.push({ from: at, to, color: g.inkColor });
            at = to;
        }
        set({ jumps: [...g.jumps, ...out] });
    };
    const hideEvery = (n: number) => set({ hidden: ticks.filter((_, i) => i % n !== 0) });
    const hideRandom = (k: number) => {
        const inner = ticks.slice(1, -1).sort(() => Math.random() - 0.5);
        set({ hidden: inner.slice(0, Math.min(k, inner.length)) });
    };

    return (
        <>
            <Section title="Bereik">
                <NumberField label="Van" value={g.min} onChange={(v) => set({ min: v })} />
                <NumberField label="Tot" value={g.max} onChange={(v) => set({ max: v })} />
                <Segmented label="Getallen" value={g.numberType} onChange={(v) => set({ numberType: v })}
                    options={[{ value: 'natuurlijk', label: 'Natuurlijk' }, { value: 'kommagetal', label: 'Kommagetal' }, { value: 'breuk', label: 'Breuk' }]} />
                {g.numberType === 'breuk'
                    ? <Slider label="Noemer (streepje = 1/n)" value={g.fractionDen} min={2} max={20} onChange={(v) => set({ fractionDen: v })} />
                    : <NumberField label="Stap tussen streepjes" value={clean(Math.round(g.step * 1e4) / 1e4)} min={0.001} onChange={(v) => set({ step: v, ticks: undefined })} />}
                <Hint>Negatieve getallen: zet "Van" onder nul. {ticks.length} streepjes.</Hint>
            </Section>
            <Section title="Labels">
                <Segmented label="Getallen tonen" value={g.labels} onChange={(v) => set({ labels: v })}
                    options={[{ value: 'alles', label: 'Alle' }, { value: 'uiteinden', label: 'Uiteinden' }, { value: 'geen', label: 'Geen' }]} />
                {g.labels === 'alles' && (
                    <Slider label="Getal om de zoveel streepjes" value={g.labelEvery} min={1} max={10} onChange={(v) => set({ labelEvery: v })} />
                )}
            </Section>
            <Section title="Lijn">
                <Segmented label="Pijlpunt" value={g.arrows} onChange={(v) => set({ arrows: v })}
                    options={[{ value: 'geen', label: 'Geen' }, { value: 'rechts', label: 'Rechts' }, { value: 'beide', label: 'Beide' }]} />
                <Segmented label="Richting" value={g.orientation} onChange={(v) => set({ orientation: v })}
                    options={[{ value: 'horizontaal', label: 'Horizontaal' }, { value: 'verticaal', label: 'Verticaal' }]} />
            </Section>
            <Section title="Tikken op de lijn">
                <Segmented label="Een tik" value={g.tapMode} onChange={(v) => set({ tapMode: v })}
                    options={[{ value: 'geen', label: 'Niets' }, { value: 'markeren', label: 'Stip' }, { value: 'springen', label: 'Sprong' }, { value: 'verbergen', label: 'Verberg' }]} />
                <Hint>{TAP_HINT[g.tapMode]}</Hint>
                <PaletteRow label="Kleur van stip en sprong" value={g.inkColor} palette={INK_COLORS} onChange={(v) => set({ inkColor: v })} />
            </Section>
            <Section title="Sprongen">
                <NumberField label="Vanaf" value={jump.from} onChange={(v) => setJump({ ...jump, from: v })} />
                <NumberField label="Sprong van (+/−)" value={jump.size} onChange={(v) => setJump({ ...jump, size: v })} />
                <Slider label="Aantal sprongen" value={jump.count} min={1} max={12} onChange={(v) => setJump({ ...jump, count: v })} />
                <ButtonRow>
                    <Button onClick={drawJumps}>Sprongen tekenen</Button>
                    <Button onClick={() => set({ jumps: [] })}>Wis sprongen ({g.jumps.length})</Button>
                </ButtonRow>
                <ButtonRow>
                    <Button onClick={() => set({ markers: [] })}>Wis stippen ({g.markers.length})</Button>
                </ButtonRow>
            </Section>
            <Section title="Invullen">
                <ButtonRow>
                    <Button onClick={() => hideEvery(2)}>Verberg om de 2</Button>
                    <Button onClick={() => hideRandom(3)}>Verberg 3 willekeurig</Button>
                    <Button onClick={() => set({ hidden: ticks.slice(1, -1) })}>Enkel uiteinden</Button>
                    <Button onClick={() => set({ hidden: [] })}>Toon alle ({g.hidden.length})</Button>
                </ButtonRow>
            </Section>
        </>
    );
}
