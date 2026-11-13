import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';

// ── Base32 transport ─────────────────────────────────────────────────────────
// Raw DEFLATE bytes as RFC 4648 base32 (A-Z 2-7, no padding): upper-case only, so the QR can
// code the payload in alphanumeric mode (5.5 bits/char) instead of byte mode (8 bits/char),
// and still URL-safe and immune to chat apps that eat a trailing '.' or ':'. DEFLATE, not
// lz-string: on a 20-type wire it came out at a third of lz-string's size.
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function toBase32(bytes: Uint8Array): string {
    let out = '', acc = 0, bits = 0;
    for (const b of bytes) {
        acc = (acc << 8) | b; bits += 8;
        while (bits >= 5) { out += B32[(acc >>> (bits - 5)) & 31]; bits -= 5; }
        acc &= (1 << bits) - 1;
    }
    if (bits > 0) out += B32[(acc << (5 - bits)) & 31];
    return out;
}

export function fromBase32(text: string): Uint8Array | null {
    const out: number[] = [];
    let acc = 0, bits = 0;
    for (const ch of text.toUpperCase()) {
        const v = B32.indexOf(ch);
        if (v < 0) return null;
        acc = (acc << 5) | v; bits += 5;
        if (bits >= 8) { out.push((acc >>> (bits - 8)) & 255); bits -= 8; }
        acc &= (1 << bits) - 1;
    }
    return Uint8Array.from(out);
}

/** Any text → the link payload (deflate + base32); the bound tests pack bombs with it. */
export function packText(text: string): string {
    return toBase32(deflateSync(strToU8(text), { level: 9 }));
}

/** The link payload → text, or null when it is not base32 / DEFLATE or inflates past `maxBytes` (a deflate bomb). */
export function unpackText(data: string, maxBytes: number): string | null {
    const bytes = fromBase32(data);
    if (!bytes || bytes.length === 0) return null;
    let inflated: Uint8Array;
    try { inflated = inflateSync(bytes, { out: new Uint8Array(maxBytes + 1) }); } catch { return null; }
    return inflated.length > maxBytes ? null : strFromU8(inflated);
}
