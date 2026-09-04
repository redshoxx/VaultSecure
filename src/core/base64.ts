const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    const triple = (a << 16) | (b << 8) | c;
    out += ALPHABET[(triple >> 18) & 63];
    out += ALPHABET[(triple >> 12) & 63];
    out += i + 1 < bytes.length ? ALPHABET[(triple >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? ALPHABET[triple & 63] : '=';
  }
  return out;
}

export function base64ToBytes(input: string): Uint8Array {
  const clean = input.replace(/\s/g, '');
  if (!clean || clean.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) {
    throw new Error('Ungültige Base64-Daten.');
  }
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const c1 = ALPHABET.indexOf(clean[i] ?? '');
    const c2 = ALPHABET.indexOf(clean[i + 1] ?? '');
    const c3 = clean[i + 2] === '=' ? 0 : ALPHABET.indexOf(clean[i + 2] ?? '');
    const c4 = clean[i + 3] === '=' ? 0 : ALPHABET.indexOf(clean[i + 3] ?? '');
    if (c1 < 0 || c2 < 0 || c3 < 0 || c4 < 0) throw new Error('Ungültige Base64-Daten.');
    const triple = (c1 << 18) | (c2 << 12) | (c3 << 6) | c4;
    bytes.push((triple >> 16) & 255);
    if (clean[i + 2] !== '=') bytes.push((triple >> 8) & 255);
    if (clean[i + 3] !== '=') bytes.push(triple & 255);
  }
  return Uint8Array.from(bytes);
}
