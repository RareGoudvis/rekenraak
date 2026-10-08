import { Section, Segmented, TextArea, Button, ButtonRow } from './controls';
import { useSetProps } from './baseProps';
import type { BoardWidget } from '../boardTypes';

export default function ChecklistSettings({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const items = typeof widget.props?.items === 'string' ? widget.props.items : 'boek klaar\npotlood klaar\naan de slag!';
    const round = widget.props?.round === true;
    return (
        <>
            <Section title="Items">
                <TextArea label="Eén per lijn" value={items} rows={6} onChange={(v) => set({ items: v, checked: [] })} />
            </Section>
            <Section title="Vinkstijl">
                <Segmented value={round ? 'rond' : 'vierkant'} onChange={(v) => set({ round: v === 'rond' })}
                    options={[{ value: 'vierkant', label: 'Vierkant' }, { value: 'rond', label: 'Rond' }]} />
                <ButtonRow><Button onClick={() => set({ checked: [] })}>Alles afvinken ongedaan maken</Button></ButtonRow>
            </Section>
        </>
    );
}
