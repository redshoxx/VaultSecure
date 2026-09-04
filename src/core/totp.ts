import { hmac } from '@noble/hashes/hmac.js';
import { sha1 } from '@noble/hashes/legacy.js';
import { sha256, sha512 } from '@noble/hashes/sha2.js';
import type { TotpItem } from '@/src/types/vault';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function decodeBase32(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/\s|-/g, '').replace(/=+$/g, '');
  if (!clean || /[^A-Z2-7]/.test(clean)) throw new Error('Ungültiges Base32-Secret.');
  let buffer = 0;
  let bits = 0;
  const out: number[] = [];
  for (const char of clean) {
    const value = BASE32.indexOf(char);
    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  if (out.length === 0) throw new Error('TOTP-Secret ist zu kurz.');
  return Uint8Array.from(out);
}

function counterBytes(counter: number): Uint8Array {
  const bytes = new Uint8Array(8);
  let value = BigInt(counter);
  for (let i = 7; i >= 0; i -= 1) {
    bytes[i] = Number(value & 0xffn);
    value >>= 8n;
  }
  return bytes;
}

function totpHash(algorithm: TotpItem['algorithm']) {
  if (algorithm === 'SHA256') return sha256;
  if (algorithm === 'SHA512') return sha512;
  return sha1;
}

export function generateTotp(
  secret: string,
  digits: 6 | 8 = 6,
  period = 30,
  now = Date.now(),
  algorithm: TotpItem['algorithm'] = 'SHA1',
): { code: string; remaining: number } {
  if (!Number.isFinite(period) || period < 1) throw new Error('Ungültiges TOTP-Intervall.');
  const counter = Math.floor(now / 1000 / period);
  const key = decodeBase32(secret);
  const digest = hmac(totpHash(algorithm), key, counterBytes(counter));
  const offset = (digest[digest.length - 1] ?? 0) & 0x0f;
  const binary = (((digest[offset] ?? 0) & 0x7f) << 24)
    | ((digest[offset + 1] ?? 0) << 16)
    | ((digest[offset + 2] ?? 0) << 8)
    | (digest[offset + 3] ?? 0);
  const code = String(binary % 10 ** digits).padStart(digits, '0');
  const remaining = period - (Math.floor(now / 1000) % period);
  return { code, remaining };
}

export function parseOtpAuthUri(uri: string): {
  issuer: string;
  account: string;
  secret: string;
  digits: 6 | 8;
  period: number;
  algorithm: TotpItem['algorithm'];
} {
  let parsed: URL;
  try { parsed = new URL(uri); } catch { throw new Error('Ungültige otpauth:// URI.'); }
  if (parsed.protocol !== 'otpauth:' || parsed.hostname.toLowerCase() !== 'totp') {
    throw new Error('Nur TOTP-QR-Codes werden unterstützt.');
  }
  const label = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  const splitAt = label.indexOf(':');
  const labelIssuer = splitAt >= 0 ? label.slice(0, splitAt) : '';
  const account = splitAt >= 0 ? label.slice(splitAt + 1) : label;
  const secret = (parsed.searchParams.get('secret') ?? '').replace(/\s|-/g, '').toUpperCase();
  const issuer = (parsed.searchParams.get('issuer') ?? labelIssuer ?? '').trim() || 'Unbekannt';
  const digits = parsed.searchParams.get('digits') === '8' ? 8 : 6;
  const periodRaw = Number(parsed.searchParams.get('period') ?? 30);
  const algorithmRaw = (parsed.searchParams.get('algorithm') ?? 'SHA1').toUpperCase();
  const algorithm: TotpItem['algorithm'] = algorithmRaw === 'SHA256' || algorithmRaw === 'SHA512' ? algorithmRaw : 'SHA1';
  if (!secret) throw new Error('TOTP-Secret fehlt.');
  decodeBase32(secret);
  const period = Number.isFinite(periodRaw) && periodRaw >= 15 && periodRaw <= 300 ? periodRaw : 30;
  return { issuer, account: account.trim(), secret, digits, period, algorithm };
}
