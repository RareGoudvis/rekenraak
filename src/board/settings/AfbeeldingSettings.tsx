import { useRef } from 'react';
import { ArrowCounterClockwise, ArrowClockwise } from '@phosphor-icons/react';
import { Section, Segmented, Slider, Button, ButtonRow, TextField, Hint } from './controls';
import { useSetProps } from './baseProps';
import { afbeeldingProps } from './afbeeldingModel';
import { readImageFile } from './imageFile';
import type { BoardWidget } from '../boardTypes';

const turn = (deg: number, by: number) => (((deg + by) % 360) + 360) % 360 as 0 | 90 | 180 | 270;

export default function AfbeeldingSettings({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const m = afbeeldingProps(widget);
    const fileRef = useRef<HTMLInputElement>(null);

    return (
        <>
            <Section title="Afbeelding">
                <input ref={fileRef} type="file" accept="image/*" hidden
                    onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) set({ src: await readImageFile(f) }); }} />
                <ButtonRow><Button onClick={() => fileRef.current?.click()}>Andere afbeelding kiezen…</Button></ButtonRow>
            </Section>
            <Section title="Passen">
                <Segmented value={m.fit} onChange={(v) => set({ fit: v })}
                    options={[{ value: 'natuurlijk', label: 'Origineel' }, { value: 'passend', label: 'Passend' }, { value: 'vullend', label: 'Vullend' }, { value: 'uitrekken', label: 'Rekken' }]} />
                {m.fit !== 'natuurlijk' && (
                    <Segmented label="Verhouding" value={m.ratio} onChange={(v) => set({ ratio: v })}
                        options={[{ value: '4:3', label: '4:3' }, { value: '1:1', label: '1:1' }, { value: '16:9', label: '16:9' }, { value: '3:4', label: '3:4' }]} />
                )}
            </Section>
            <Section title="Draaien en spiegelen">
                <ButtonRow>
                    <Button label="Kwartslag links" onClick={() => set({ rotate: turn(m.rotate, -90) })}><ArrowCounterClockwise size={14} /> 90°</Button>
                    <Button label="Kwartslag rechts" onClick={() => set({ rotate: turn(m.rotate, 90) })}><ArrowClockwise size={14} /> 90°</Button>
                </ButtonRow>
                <ButtonRow>
                    <Button pressed={m.flipH} onClick={() => set({ flipH: !m.flipH })}>Spiegel ↔</Button>
                    <Button pressed={m.flipV} onClick={() => set({ flipV: !m.flipV })}>Spiegel ↕</Button>
                </ButtonRow>
            </Section>
            <Section title="Rand">
                <Slider label="Afgeronde hoeken" value={m.radius} min={0} max={60} format={(v) => `${v} px`} onChange={(v) => set({ radius: v })} />
                <Slider label="Kaderdikte" value={m.borderWidth} min={0} max={16} format={(v) => (v ? `${v} px` : 'geen')} onChange={(v) => set({ borderWidth: v })} />
                {m.borderWidth > 0 && <Hint>Het kader krijgt de accentkleur (onder Kaart).</Hint>}
                <Slider label="Zichtbaarheid" value={Math.round(m.opacity * 100)} min={10} max={100} step={5} format={(v) => `${v}%`} onChange={(v) => set({ opacity: v / 100 })} />
            </Section>
            <Section title="Onderschrift">
                <TextField label="Tekst" value={m.caption} placeholder="bv. De Schelde in Antwerpen" onChange={(v) => set({ caption: v })} />
                {m.caption && (
                    <>
                        <Segmented label="Plaats" value={m.captionPos} onChange={(v) => set({ captionPos: v })}
                            options={[{ value: 'boven', label: 'Boven' }, { value: 'onder', label: 'Onder' }, { value: 'over', label: 'Over de foto' }]} />
                        <Slider label="Grootte" value={m.captionSize} min={10} max={48} format={(v) => `${v} px`} onChange={(v) => set({ captionSize: v })} />
                    </>
                )}
            </Section>
        </>
    );
}
