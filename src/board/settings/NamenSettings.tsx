import { useState } from 'react';
import { Section, TextArea, Hint } from './controls';
import { NAMES_KEY } from '../widgetSizing';

// Class list is app-wide (localStorage), not per widget — a teacher has one class.
export default function NamenSettings() {
    const [names, setNames] = useState(() => localStorage.getItem(NAMES_KEY) ?? '');
    const save = (v: string) => { setNames(v); localStorage.setItem(NAMES_KEY, v); };
    const count = names.split('\n').map(s => s.trim()).filter(Boolean).length;
    return (
        <Section title={`Namenlijst (${count})`}>
            <TextArea label="Eén naam per lijn" value={names} rows={12} placeholder={'Emma\nNoah\nLina\n…'} onChange={save} />
            <Hint>Wordt lokaal bewaard op dit toestel en gedeeld door alle borden.</Hint>
        </Section>
    );
}
