import { useRef, useState } from 'react';
import { Section, Segmented, Toggle, Slider, ColorSwatches, Button, ButtonRow, Hint, TextArea, Row } from './controls';
import { useSetProps } from './baseProps';
import { dobbelProps, faceKind, MAX_DICE, MAX_FACE_IMAGES } from './dobbelModel';
import { readImageFile } from './imageFile';
import { LIGHT_PALETTE, BRIGHT_PALETTE } from './palettes';
import type { BoardWidget } from '../boardTypes';

// White is the none-swatch ("Wit"), so the palette leaves it out.
const DIE_PALETTE = [...LIGHT_PALETTE, ...BRIGHT_PALETTE].filter(c => c.hex !== '#ffffff');
// Dice faces render at ~80px; 160px keeps them sharp on a digibord without bloating the board file.
const FACE_IMAGE_PX = 160;

export default function DobbelsteenSettings({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const m = dobbelProps(widget);
    const kind = faceKind(m);
    const fileRef = useRef<HTMLInputElement>(null);
    const [perDie, setPerDie] = useState(() => new Set(m.dieColors.slice(0, m.count)).size > 1);

    const addImages = async (files: FileList | null) => {
        if (!files?.length) return;
        const urls = await Promise.all([...files].map(f => readImageFile(f, FACE_IMAGE_PX)));
        set({ faceImages: [...m.faceImages, ...urls].slice(0, MAX_FACE_IMAGES), values: [] });
    };
    const setDieColor = (i: number, c: string | null) => {
        const colors = Array.from({ length: Math.max(m.count, m.dieColors.length) }, (_, k) => m.dieColors[k] ?? '#ffffff');
        colors[i] = c ?? '#ffffff';
        set({ dieColors: colors });
    };

    return (
        <>
            <Section title="Dobbelstenen">
                <Segmented label="Aantal" value={m.count} onChange={(v) => set({ count: v })}
                    options={Array.from({ length: MAX_DICE }, (_, i) => ({ value: i + 1, label: String(i + 1) }))} />
            </Section>
            <Section title="Zijden">
                <Row label={`Getallen (${kind === 'pips' || kind === 'number' ? m.sides : '—'})`} stacked>
                    <ButtonRow>
                        {[4, 6, 8, 10, 12, 20].map(n => (
                            <Button key={n} pressed={(kind === 'pips' || kind === 'number') && m.sides === n}
                                onClick={() => set({ sides: n, custom: '', faceImages: [], values: [] })}>{n}</Button>
                        ))}
                    </ButtonRow>
                </Row>
                {(kind === 'pips' || kind === 'number') && (
                    <Slider label="Ander aantal zijden" value={m.sides} min={2} max={100} onChange={(v) => set({ sides: v, values: [] })} />
                )}
                <TextArea label="Eigen woorden (één per lijn)" value={m.custom} placeholder={'rood\nblauw\ngeel'} rows={4}
                    onChange={(v) => set({ custom: v, values: [] })} />
                <Row label={`Eigen afbeeldingen (${m.faceImages.length})`} stacked>
                    <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { void addImages(e.target.files); e.target.value = ''; }} />
                    {m.faceImages.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {m.faceImages.map((src, i) => (
                                <button key={i} type="button" title="Verwijderen" aria-label={`Afbeelding ${i + 1} verwijderen`}
                                    onClick={() => set({ faceImages: m.faceImages.filter((_, k) => k !== i), values: [] })}
                                    style={{ width: '40px', height: '40px', padding: '2px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--separator)', background: 'var(--bg-surface)', cursor: 'pointer' }}>
                                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                </button>
                            ))}
                        </div>
                    )}
                    <ButtonRow>
                        <Button onClick={() => fileRef.current?.click()}>Afbeeldingen toevoegen…</Button>
                        {m.faceImages.length > 0 && <Button onClick={() => set({ faceImages: [], values: [] })}>Alle wissen</Button>}
                    </ButtonRow>
                </Row>
                <Hint>Afbeeldingen gaan voor woorden, woorden voor getallen. Tik op een afbeelding om ze te verwijderen.</Hint>
            </Section>
            <Section title="Kleuren">
                <Row label="Alle dobbelstenen" stacked>
                    <ColorSwatches compact label="Kleur alle dobbelstenen" noneLabel="Wit"
                        value={m.dieColors[0] && m.dieColors[0] !== '#ffffff' && m.dieColors.slice(0, m.count).every(c => c === m.dieColors[0]) ? m.dieColors[0] : null}
                        palette={DIE_PALETTE} onChange={(c) => set({ dieColors: Array(m.count).fill(c ?? '#ffffff') })} />
                </Row>
                {m.count > 1 && <Toggle label="Elke dobbelsteen een eigen kleur" checked={perDie} onChange={setPerDie} />}
                {perDie && m.count > 1 && Array.from({ length: m.count }, (_, i) => (
                    <Row key={i} label={`Dobbelsteen ${i + 1}`} stacked>
                        <ColorSwatches compact label={`Kleur dobbelsteen ${i + 1}`} noneLabel="Wit"
                            value={m.dieColors[i] && m.dieColors[i] !== '#ffffff' ? m.dieColors[i] : null}
                            palette={DIE_PALETTE} onChange={(c) => setDieColor(i, c)} />
                    </Row>
                ))}
            </Section>
            <Section title="Rollen">
                <Toggle label="Rolanimatie" checked={m.animate} onChange={(v) => set({ animate: v })} />
                <Toggle label="Som tonen" checked={m.showSum} onChange={(v) => set({ showSum: v })} />
                <Toggle label="Tik vastzetten" checked={m.allowLock} onChange={(v) => set({ allowLock: v })} />
                {m.locked.some(Boolean) && (
                    <ButtonRow><Button onClick={() => set({ locked: [] })}>Alles losmaken</Button></ButtonRow>
                )}
                <Hint>Een vastgezette dobbelsteen rolt niet mee (bij meer dan één dobbelsteen).</Hint>
            </Section>
            <Section title="Geschiedenis">
                <Toggle label="Vorige worpen tonen" checked={m.showHistory} onChange={(v) => set({ showHistory: v })} />
                {m.history.length > 0 && (
                    <ButtonRow><Button onClick={() => set({ history: [] })}>Geschiedenis wissen ({m.history.length})</Button></ButtonRow>
                )}
            </Section>
        </>
    );
}
