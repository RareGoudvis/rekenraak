import { Section, Toggle, TextArea } from './controls';
import { useSetProps } from './baseProps';
import { DATUM_COLORS } from '../widgetSizing';
import type { BoardWidget } from '../boardTypes';

export default function StappenplanSettings({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const text = typeof widget.props?.text === 'string' ? widget.props.text : '';
    const numbered = widget.props?.numbered !== false;
    const colorKey = typeof widget.props?.color === 'string' ? widget.props.color : 'blauw';
    return (
        <>
            <Section title="Stappen">
                <TextArea label="# = titel, ## = subtitel" value={text} rows={7} placeholder={'# Zo werk je\neerste stap\ntweede stap'} onChange={(v) => set({ text: v })} />
                <Toggle label="Nummering" checked={numbered} onChange={(v) => set({ numbered: v })} />
            </Section>
            <Section title="Kleur">
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {Object.entries(DATUM_COLORS).map(([key, c]) => (
                        <button key={key} type="button" aria-label={`Kleur ${key}`} title={key} aria-pressed={colorKey === key} onClick={() => set({ color: key })}
                            style={{ width: '34px', height: '34px', borderRadius: '50%', cursor: 'pointer', background: c.text, border: '2px solid var(--bg-surface)', boxShadow: colorKey === key ? '0 0 0 2px var(--accent)' : 'none' }} />
                    ))}
                </div>
            </Section>
        </>
    );
}
