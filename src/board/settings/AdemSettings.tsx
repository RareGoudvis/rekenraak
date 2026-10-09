import { Section, Segmented, Toggle, Slider, ColorSwatches, Button, ButtonRow, TextField } from './controls';
import { useSetProps } from './baseProps';
import { ademProps } from './ademModel';
import { BRIGHT_PALETTE } from './palettes';
import type { BoardWidget } from '../boardTypes';

// Common classroom patterns: calm square, 4-7-8 relaxing breath, short in / long out, box breathing.
const PRESETS = [
    { label: '4-4-4', p: { inSec: 4, holdSec: 4, outSec: 4, holdOutSec: 0 } },
    { label: '4-7-8', p: { inSec: 4, holdSec: 7, outSec: 8, holdOutSec: 0 } },
    { label: '3-0-5', p: { inSec: 3, holdSec: 0, outSec: 5, holdOutSec: 0 } },
    { label: 'Doos 4-4-4-4', p: { inSec: 4, holdSec: 4, outSec: 4, holdOutSec: 4 } },
];

const secs = (v: number) => `${v} s`;

export default function AdemSettings({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const p = ademProps(widget);
    return (
        <>
            <Section title="Ritme">
                <ButtonRow>
                    {PRESETS.map(x => (
                        <Button key={x.label} pressed={x.p.inSec === p.inSec && x.p.holdSec === p.holdSec && x.p.outSec === p.outSec && x.p.holdOutSec === p.holdOutSec}
                            onClick={() => set(x.p)}>{x.label}</Button>
                    ))}
                </ButtonRow>
                <Slider label="Adem in" value={p.inSec} min={1} max={20} step={0.5} format={secs} onChange={(v) => set({ inSec: v })} />
                <Slider label="Houd vast (vol)" value={p.holdSec} min={0} max={20} step={0.5} format={secs} onChange={(v) => set({ holdSec: v })} />
                <Slider label="Adem uit" value={p.outSec} min={1} max={20} step={0.5} format={secs} onChange={(v) => set({ outSec: v })} />
                <Slider label="Houd vast (leeg)" value={p.holdOutSec} min={0} max={20} step={0.5} format={secs} onChange={(v) => set({ holdOutSec: v })} />
                <Slider label="Snelheid" value={p.speed} min={0.5} max={2} step={0.25} format={(v) => `${v}×`} onChange={(v) => set({ speed: v })} />
                <Slider label="Aantal ademhalingen" value={p.cycles} min={0} max={30} format={(v) => (v === 0 ? 'eindeloos' : String(v))} onChange={(v) => set({ cycles: v })} />
            </Section>
            <Section title="Vorm">
                <Segmented value={p.shape} onChange={(v) => set({ shape: v })}
                    options={[{ value: 'cirkel', label: 'Cirkel' }, { value: 'vierkant', label: 'Vierkant' }, { value: 'bloem', label: 'Bloem' }]} />
                <ColorSwatches label="Kleur" value={p.color || null} palette={BRIGHT_PALETTE} noneLabel="Zoals accentkleur" onChange={(v) => set({ color: v ?? '' })} />
            </Section>
            <Section title="Begeleiding">
                <Toggle label="Tekst tonen" checked={p.guideText} onChange={(v) => set({ guideText: v })} />
                {p.guideText && (
                    <>
                        <TextField label="Bij inademen" value={p.labelIn} onChange={(v) => set({ labelIn: v })} />
                        <TextField label="Bij vasthouden" value={p.labelHold} onChange={(v) => set({ labelHold: v })} />
                        <TextField label="Bij uitademen" value={p.labelOut} onChange={(v) => set({ labelOut: v })} />
                    </>
                )}
                <Toggle label="Zacht geluid bij elke stap" checked={p.soundCue} onChange={(v) => set({ soundCue: v })} />
            </Section>
        </>
    );
}
