import { Section, TextField, FontSizeRow, ColorSwatches, Toggle, ResetRow, SaveDefaultRow } from './controls';
import { fontSizeKey, widgetAccent, useSetProps } from './baseProps';
import { TITLE_DEFAULTS } from '../widgetSizing';
import type { BoardWidget } from '../boardTypes';

// The part of every ⚙ panel that is the same for all kinds (see registry.ts).
export default function BaselineSettings({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const title = typeof widget.props?.title === 'string' ? widget.props.title : '';
    return (
        <>
            <Section title="Kaart">
                <TextField label="Titel" value={title} placeholder={TITLE_DEFAULTS[widget.kind]} onChange={(v) => set({ title: v })} />
                <Toggle label="Titelbalk tonen" checked={widget.props?.showHeader !== false} onChange={(v) => set({ showHeader: v })} />
                <FontSizeRow value={fontSizeKey(widget)} onChange={(v) => set({ fontSize: v })} />
                <ColorSwatches label="Accentkleur" value={widgetAccent(widget)} onChange={(v) => set({ accent: v ?? undefined })} />
            </Section>
            <Section title="Standaard">
                <SaveDefaultRow widget={widget} />
                <ResetRow widget={widget} />
            </Section>
        </>
    );
}
