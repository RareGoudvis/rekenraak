import { useRef } from 'react';
import { useConstraints } from '../useConstraints';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import SettingLabel from './SettingLabel';

// Settings for the sheet-furniture blocks (section rule, writing lines, squared grid,
// memory box, blank page). One plugin covers all of them, switching on constraints.kind,
// because they share the "no generator, all constraints" shape.
export default function LayoutConfig({ block }: { block: MathBlock }) {
    const [c, patch] = useConstraints<Record<string, unknown>>(block);
    const kind = (c.kind as string) ?? 'sectie';
    const set = (key: string, value: unknown) =>
        patch({ [key]: value });
    const bodyRef = useRef<HTMLTextAreaElement>(null);

    // Wraps the current selection in `before`/`after` (or inserts both with the caret
    // between them when nothing is selected), then restores the selection so a teacher
    // can chain markers ("select word, click B, click I") without re-aiming each time.
    const wrapSelection = (before: string, after: string) => {
        const ta = bodyRef.current;
        const body = (c.body as string) ?? '';
        const start = ta?.selectionStart ?? body.length;
        const end = ta?.selectionEnd ?? body.length;
        const selected = body.slice(start, end);
        set('body', body.slice(0, start) + before + selected + after + body.slice(end));
        requestAnimationFrame(() => {
            const el = bodyRef.current;
            if (!el) return;
            el.focus();
            el.setSelectionRange(start + before.length, start + before.length + selected.length);
        });
    };

    // Prefixes every line the selection touches (or just the current line) with a marker
    // that can depend on the line's position, so "1." numbers a multi-line selection
    // 1., 2., 3. in one click instead of one line at a time.
    const prefixLines = (marker: (lineIndex: number) => string) => {
        const ta = bodyRef.current;
        const body = (c.body as string) ?? '';
        const start = ta?.selectionStart ?? 0;
        const end = ta?.selectionEnd ?? 0;
        const lineStart = body.lastIndexOf('\n', start - 1) + 1;
        const lineEndFound = body.indexOf('\n', end);
        const lineEnd = lineEndFound === -1 ? body.length : lineEndFound;
        const before = body.slice(0, lineStart);
        const after = body.slice(lineEnd);
        const prefixed = body.slice(lineStart, lineEnd).split('\n').map((line, i) => marker(i) + line).join('\n');
        set('body', before + prefixed + after);
        requestAnimationFrame(() => {
            const el = bodyRef.current;
            if (!el) return;
            el.focus();
            el.setSelectionRange(before.length, before.length + prefixed.length);
        });
    };

    const textField = (key: string, label: string, info: string, placeholder = '') => (
        <div style={styles.section}>
            <SettingLabel text={label} info={info} />
            <input
                style={{ ...styles.numInput, width: '100%' }}
                value={(c[key] as string) ?? ''}
                placeholder={placeholder}
                onChange={(e) => set(key, e.target.value)}
            />
        </div>
    );

    const segment = (key: string, label: string, info: string, opts: Array<{ v: string; l: string }>, fallback: string) => (
        <div style={styles.section}>
            <SettingLabel text={label} info={info} />
            <div style={styles.buttonGroup}>
                {opts.map(o => (
                    <button key={o.v} style={styles.radioBtn(((c[key] as string) ?? fallback) === o.v)} onClick={() => set(key, o.v)}>{o.l}</button>
                ))}
            </div>
        </div>
    );

    const slider = (key: string, label: string, info: string, min: number, max: number, step: number, fallback: number, unit = '') => (
        <div style={styles.section}>
            <SettingLabel text={`${label}: ${Number(c[key] ?? fallback)}${unit}`} info={info} />
            <input
                type="range" min={min} max={max} step={step}
                value={Number(c[key] ?? fallback)}
                onChange={(e) => set(key, Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
        </div>
    );

    return (
        <div style={styles.container}>
            {kind === 'sectie' && (<>
                {textField('title', 'Titel:', 'Optionele kop onder de scheidingslijn.', 'Bv. Deel 2 — meten')}
                {segment('rule', 'Lijn:', 'De scheiding zelf. Kies Geen als je alleen een kop wil.', [
                    { v: 'lijn', l: 'Vol' }, { v: 'stippel', l: 'Stippel' }, { v: 'geen', l: 'Geen' },
                ], 'lijn')}
            </>)}

            {kind === 'schrijflijnen' && (<>
                {slider('lineCount', 'Aantal lijnen', 'Hoeveel schrijflijnen dit blok toont.', 1, 20, 1, 6)}
                {slider('lineSpacing', 'Lijnafstand', 'Afstand tussen de lijnen in millimeter.', 6, 20, 1, 10, ' mm')}
                {segment('lineStyle', 'Soort:', 'Schrijflijn voegt de stippellijn op halve hoogte toe.', [
                    { v: 'enkel', l: 'Enkel' }, { v: 'schrijf', l: 'Schrijflijn' },
                ], 'enkel')}
            </>)}

            {kind === 'raster' && (<>
                {slider('cellMm', 'Hokjesgrootte', 'Zijde van één hokje in millimeter.', 5, 20, 1, 10, ' mm')}
                {slider('rows', 'Aantal rijen', 'Hoeveel rijen hokjes hoog het raster is.', 1, 24, 1, 8)}
                <p style={styles.hint}>Het aantal kolommen volgt de breedte van het blok, zodat de hokjes vierkant blijven.</p>
            </>)}

            {kind === 'kader' && (<>
                {textField('title', 'Titel:', 'Kop van het kader.', 'Onthoud')}
                <div style={styles.section}>
                    <SettingLabel text="Tekst:" info="De inhoud van het onthoudkader. Enters blijven behouden. Gebruik de knoppen hieronder voor vet, cursief, onderstreept en lijsten." />
                    <div style={{ ...styles.buttonGroup, marginBottom: '6px' }}>
                        <button type="button" style={styles.pill(false)} title="Vet" onClick={() => wrapSelection('**', '**')}><strong>B</strong></button>
                        <button type="button" style={styles.pill(false)} title="Cursief" onClick={() => wrapSelection('*', '*')}><em>I</em></button>
                        <button type="button" style={styles.pill(false)} title="Onderstreept" onClick={() => wrapSelection('__', '__')}><u>U</u></button>
                        <button type="button" style={styles.pill(false)} title="Genummerde lijst" onClick={() => prefixLines(i => `${i + 1}. `)}>1.</button>
                        <button type="button" style={styles.pill(false)} title="Opsomming" onClick={() => prefixLines(() => '- ')}>•</button>
                    </div>
                    <textarea
                        ref={bodyRef}
                        style={{ ...styles.numInput, width: '100%', minHeight: '160px', resize: 'vertical', fontFamily: 'inherit' }}
                        value={(c.body as string) ?? ''}
                        placeholder={'Bv. Bij het optellen tel je eerst de eenheden.'}
                        onChange={(e) => set('body', e.target.value)}
                    />
                    <p style={styles.hint}>**vet**, *cursief*, __onderstreept__, regels met 1. of - worden lijsten.</p>
                </div>
                {segment('emphasis', 'Stijl:', 'Hoe het kader eruitziet op het blad.', [
                    { v: 'kader', l: 'Kader' }, { v: 'rond', l: 'Afgerond' },
                    { v: 'grijs', l: 'Grijs' }, { v: 'geen', l: 'Geen' },
                ], 'kader')}
            </>)}

            {kind === 'lege-pagina' && (
                <p style={styles.hint}>
                    Dit blok houdt een volledige pagina vrij, bijvoorbeeld als extra oefenruimte
                    of om aan één zijde te kunnen afdrukken. Er zijn geen instellingen.
                </p>
            )}
        </div>
    );
}
