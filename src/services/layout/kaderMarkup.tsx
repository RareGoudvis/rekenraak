import React from 'react';

// Light markup for the onthoudkader (layout-kader) body: enough for a teacher to bold a
// rule, italicise a term or list steps, without pulling in a rich-text editor for one
// textarea. Pure function of the string so it is trivial to unit-test and to reuse from
// both the viewer and (if ever needed) a print-time renderer.

// ── Inline markup ────────────────────────────────────────────────────────────
// Order matters: bold and italic can nest (`**vet *cursief* vet**`), so bold is split
// first and italic/underline are resolved inside each resulting segment. Unmatched
// markers (an odd `**` with no partner) are left as literal text rather than eaten.
type InlineToken =
    | { kind: 'text'; value: string }
    | { kind: 'strong' | 'em' | 'u'; children: InlineToken[] };

const INLINE_MARKERS: Array<{ re: RegExp; kind: 'strong' | 'em' | 'u' }> = [
    { re: /\*\*(.+?)\*\*/g, kind: 'strong' },
    { re: /__(.+?)__/g, kind: 'u' },
    { re: /\*(.+?)\*/g, kind: 'em' },
];

/** Splits one line of text into inline tokens (bold/italic/underline may nest). */
export function tokenizeInline(text: string): InlineToken[] {
    for (const { re, kind } of INLINE_MARKERS) {
        re.lastIndex = 0;
        const match = re.exec(text);
        if (!match) continue;
        const before = text.slice(0, match.index);
        const after = text.slice(match.index + match[0].length);
        const tokens: InlineToken[] = [];
        if (before) tokens.push(...tokenizeInline(before));
        tokens.push({ kind, children: tokenizeInline(match[1]) });
        tokens.push(...tokenizeInline(after));
        return tokens;
    }
    return text ? [{ kind: 'text', value: text }] : [];
}

function renderInline(tokens: InlineToken[], keyPrefix: string): React.ReactNode[] {
    return tokens.map((t, i) => {
        const key = `${keyPrefix}-${i}`;
        if (t.kind === 'text') return t.value;
        const children = renderInline(t.children, key);
        if (t.kind === 'strong') return <strong key={key}>{children}</strong>;
        if (t.kind === 'em') return <em key={key}>{children}</em>;
        return <u key={key}>{children}</u>;
    });
}

// ── Block markup ─────────────────────────────────────────────────────────────
// A line is a list item when it starts with a numbered marker ("1. ") or a bullet
// ("- " / "• "); consecutive list lines of the SAME kind merge into one <ol>/<ul> so a
// teacher can write a multi-step list without a blank line breaking it in two.
type BlockToken =
    | { kind: 'ol' | 'ul'; items: string[] }
    | { kind: 'lines'; items: string[] };

const OL_RE = /^\d+\.\s+(.*)$/;
const UL_RE = /^[-•]\s+(.*)$/;

export function tokenizeBlocks(body: string): BlockToken[] {
    const lines = body.split('\n');
    const blocks: BlockToken[] = [];
    for (const line of lines) {
        const ol = OL_RE.exec(line);
        const ul = !ol && UL_RE.exec(line);
        const kind: BlockToken['kind'] = ol ? 'ol' : ul ? 'ul' : 'lines';
        const content = ol ? ol[1] : ul ? ul[1] : line;
        const last = blocks[blocks.length - 1];
        if (last && last.kind === kind) last.items.push(content);
        else blocks.push({ kind, items: [content] });
    }
    return blocks;
}

/** Renders an onthoudkader body: **vet**, *cursief*, __onderstreept__, `1. ` / `- ` lists. */
export function renderKaderBody(body: string): React.ReactNode {
    const blocks = tokenizeBlocks(body);
    return (
        <>
            {blocks.map((block, bi) => {
                const key = `b${bi}`;
                if (block.kind === 'lines') {
                    return block.items.map((line, li) => (
                        // A blank line between plain text keeps its own <br/>, matching the
                        // old white-space:pre-wrap look line-for-line.
                        <React.Fragment key={`${key}-${li}`}>
                            {li > 0 && <br />}
                            {renderInline(tokenizeInline(line), `${key}-${li}`)}
                        </React.Fragment>
                    ));
                }
                const Tag = block.kind === 'ol' ? 'ol' : 'ul';
                return (
                    <Tag key={key} style={{ margin: 0, paddingLeft: '1.2em' }}>
                        {block.items.map((item, li) => (
                            <li key={li}>{renderInline(tokenizeInline(item), `${key}-${li}`)}</li>
                        ))}
                    </Tag>
                );
            })}
        </>
    );
}
