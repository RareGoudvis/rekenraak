// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { renderKaderBody, tokenizeInline, tokenizeBlocks } from '../services/layout/kaderMarkup';

afterEach(cleanup);

// Renders the body and returns the container's innerHTML for structural assertions —
// simpler than walking React elements, and it is what the teacher's browser actually shows.
function html(body: string): string {
    const { container } = render(renderKaderBody(body));
    return container.innerHTML;
}

describe('inline markers', () => {
    test('bold', () => {
        expect(html('**vet**')).toBe('<strong>vet</strong>');
    });

    test('italic', () => {
        expect(html('*cursief*')).toBe('<em>cursief</em>');
    });

    test('underline', () => {
        expect(html('__onderstreept__')).toBe('<u>onderstreept</u>');
    });

    test('bold nests italic', () => {
        expect(html('**vet *cursief* vet**')).toBe('<strong>vet <em>cursief</em> vet</strong>');
    });

    test('unmatched marker renders literally', () => {
        expect(html('a **b')).toBe('a **b');
    });
});

describe('block markers', () => {
    test('numbered list', () => {
        expect(tokenizeBlocks('1. eerst\n2. dan')).toEqual([
            { kind: 'ol', items: ['eerst', 'dan'] },
        ]);
        expect(html('1. eerst\n2. dan')).toBe('<ol style="margin: 0px; padding-left: 1.2em;"><li>eerst</li><li>dan</li></ol>');
    });

    test('bullet list accepts - and •', () => {
        expect(tokenizeBlocks('- appel\n• peer')).toEqual([
            { kind: 'ul', items: ['appel', 'peer'] },
        ]);
    });

    test('mixed body: plain line, then a list, then a plain line', () => {
        const blocks = tokenizeBlocks('Onthoud dit:\n1. stap een\n2. stap twee\nKlaar.');
        expect(blocks).toEqual([
            { kind: 'lines', items: ['Onthoud dit:'] },
            { kind: 'ol', items: ['stap een', 'stap twee'] },
            { kind: 'lines', items: ['Klaar.'] },
        ]);
    });

    test('plain body without any markup is unchanged text', () => {
        expect(html('Bij het optellen tel je eerst de eenheden.'))
            .toBe('Bij het optellen tel je eerst de eenheden.');
    });

    test('plain multi-line body keeps a <br/> between lines like the old pre-wrap', () => {
        expect(html('regel een\nregel twee')).toBe('regel een<br>regel twee');
    });
});

describe('tokenizeInline', () => {
    test('plain text has no tokens beyond one text node', () => {
        expect(tokenizeInline('hallo')).toEqual([{ kind: 'text', value: 'hallo' }]);
    });

    test('empty string tokenizes to nothing', () => {
        expect(tokenizeInline('')).toEqual([]);
    });
});
