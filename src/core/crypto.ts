import {
  AESEncryptionKey,
  AESSealedData,
  aesDecryptAsync,
  aesEncryptAsync,
  getRandomBytesAsync,
} from 'expo-crypto';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import { base64ToBytes, bytesToBase64 } from './base64';
import type { VaultData, VaultEnvelope } from '@/src/types/vault';

type ScryptParams = {
  N: number;
  r: number;
  p: number;
  dkLen: number;
};

const KDF: ScryptParams = { N: 32768, r: 8, p: 1, dkLen: 32 };
const MAX_ENVELOPE_BYTES = 25 * 1024 * 1024;

function asAesKey(value: unknown): AESEncryptionKey {
  return value as AESEncryptionKey;
}

function assertWellFormedUtf16(value: string): void {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) throw new Error('Text enthält ungültige Unicode-Zeichen.');
      i += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new Error('Text enthält ungültige Unicode-Zeichen.');
    }
  }
}

function bytesToUtf8Strict(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b0 = bytes[i]!;
    let codePoint: number;
    let width: number;

    if (b0 <= 0x7f) {
      codePoint = b0;
      width = 1;
    } else if (b0 >= 0xc2 && b0 <= 0xdf) {
      const b1 = bytes[i + 1];
      if (b1 === undefined || (b1 & 0xc0) !== 0x80) throw new Error('Ungültige UTF-8-Daten.');
      codePoint = ((b0 & 0x1f) << 6) | (b1 & 0x3f);
      width = 2;
    } else if (b0 >= 0xe0 && b0 <= 0xef) {
      const b1 = bytes[i + 1];
      const b2 = bytes[i + 2];
      if (b1 === undefined || b2 === undefined || (b1 & 0xc0) !== 0x80 || (b2 & 0xc0) !== 0x80) {
        throw new Error('Ungültige UTF-8-Daten.');
      }
      if ((b0 === 0xe0 && b1 < 0xa0) || (b0 === 0xed && b1 >= 0xa0)) throw new Error('Ungültige UTF-8-Daten.');
      codePoint = ((b0 & 0x0f) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f);
      width = 3;
    } else if (b0 >= 0xf0 && b0 <= 0xf4) {
      const b1 = bytes[i + 1];
      const b2 = bytes[i + 2];
      const b3 = bytes[i + 3];
      if (
        b1 === undefined ||
        b2 === undefined ||
        b3 === undefined ||
        (b1 & 0xc0) !== 0x80 ||
        (b2 & 0xc0) !== 0x80 ||
        (b3 & 0xc0) !== 0x80
      ) {
        throw new Error('Ungültige UTF-8-Daten.');
      }
      if ((b0 === 0xf0 && b1 < 0x90) || (b0 === 0xf4 && b1 >= 0x90)) throw new Error('Ungültige UTF-8-Daten.');
      codePoint = ((b0 & 0x07) << 18) | ((b1 & 0x3f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f);
      width = 4;
    } else {
      throw new Error('Ungültige UTF-8-Daten.');
    }

    out += String.fromCodePoint(codePoint);
    i += width;
  }
  return out;
}

async function deriveKey(password: string, salt: Uint8Array, params: ScryptParams = KDF): Promise<AESEncryptionKey> {
  if (password.length < 10) throw new Error('Das Master-Passwort muss mindestens 10 Zeichen haben.');
  if (password.length > 1024) throw new Error('Das Master-Passwort ist zu lang.');
  assertWellFormedUtf16(password);
  const bytes = await scryptAsync(utf8ToBytes(password), salt, params);
  return asAesKey(await AESEncryptionKey.import(bytes));
}

async function encryptBytes(bytes: Uint8Array, key: AESEncryptionKey): Promise<string> {
  const sealed = await aesEncryptAsync(bytes, key);
  return (await sealed.combined('base64')) as string;
}

async function decryptBytes(ciphertext: string, key: AESEncryptionKey): Promise<Uint8Array> {
  const sealed = AESSealedData.fromCombined(ciphertext);
  const plain = await aesDecryptAsync(sealed, key, { output: 'bytes' });
  return plain as Uint8Array;
}

function validateVaultData(value: unknown): asserts value is VaultData {
  const v = value as VaultData;
  if (!v || v.schemaVersion !== 1 || !Array.isArray(v.items) || !Array.isArray(v.totp) || !v.settings) {
    throw new Error('Vault-Inhalt hat ein unbekanntes Format.');
  }
  if (v.items.length > 100_000 || v.totp.length > 20_000) throw new Error('Vault enthält unrealistisch viele Einträge.');
  const s = v.settings;
  if (!Number.isFinite(s.autoLockSeconds) || !Number.isFinite(s.clipboardClearSeconds)) {
    throw new Error('Vault-Einstellungen sind beschädigt.');
  }
}

export async function createEnvelope(password: string, data: VaultData): Promise<{ envelope: VaultEnvelope; vaultKeyBase64: string }> {
  const salt = await getRandomBytesAsync(16);
  const kek = await deriveKey(password, salt);
  const vaultKey = asAesKey(await AESEncryptionKey.generate(256));
  const vaultKeyBytes = await vaultKey.bytes();
  const wrappedKey = await encryptBytes(vaultKeyBytes, kek);
  const vaultCiphertext = await encryptBytes(utf8ToBytes(JSON.stringify(data)), vaultKey);
  const envelope: VaultEnvelope = {
    format: 'vaultsecure-v1',
    kdf: { name: 'scrypt', salt: bytesToBase64(salt), ...KDF },
    wrappedKey,
    vaultCiphertext,
    updatedAt: new Date().toISOString(),
  };
  return { envelope, vaultKeyBase64: await vaultKey.encoded('base64') };
}

export async function unlockEnvelope(password: string, envelope: VaultEnvelope): Promise<{ data: VaultData; vaultKeyBase64: string }> {
  validateEnvelope(envelope);
  try {
    const salt = base64ToBytes(envelope.kdf.salt);
    const kek = await deriveKey(password, salt, {
      N: envelope.kdf.N,
      r: envelope.kdf.r,
      p: envelope.kdf.p,
      dkLen: envelope.kdf.dkLen,
    });
    const vaultKeyBytes = await decryptBytes(envelope.wrappedKey, kek);
    const vaultKey = asAesKey(await AESEncryptionKey.import(vaultKeyBytes));
    const plain = await decryptBytes(envelope.vaultCiphertext, vaultKey);
    const data = JSON.parse(bytesToUtf8Strict(plain)) as unknown;
    validateVaultData(data);
    return { data, vaultKeyBase64: await vaultKey.encoded('base64') };
  } catch {
    throw new Error('Master-Passwort falsch oder Vault beschädigt.');
  }
}

export async function decryptWithVaultKey(vaultKeyBase64: string, envelope: VaultEnvelope): Promise<VaultData> {
  validateEnvelope(envelope);
  const key = asAesKey(await AESEncryptionKey.import(vaultKeyBase64, 'base64'));
  const plain = await decryptBytes(envelope.vaultCiphertext, key);
  const data = JSON.parse(bytesToUtf8Strict(plain)) as unknown;
  validateVaultData(data);
  return data;
}

export async function updateEnvelopeData(envelope: VaultEnvelope, vaultKeyBase64: string, data: VaultData): Promise<VaultEnvelope> {
  validateVaultData(data);
  const key = asAesKey(await AESEncryptionKey.import(vaultKeyBase64, 'base64'));
  return {
    ...envelope,
    vaultCiphertext: await encryptBytes(utf8ToBytes(JSON.stringify(data)), key),
    updatedAt: new Date().toISOString(),
  };
}

export async function rewrapMasterPassword(
  envelope: VaultEnvelope,
  vaultKeyBase64: string,
  newPassword: string,
): Promise<VaultEnvelope> {
  validateEnvelope(envelope);
  const salt = await getRandomBytesAsync(16);
  const kek = await deriveKey(newPassword, salt);
  const vaultKey = asAesKey(await AESEncryptionKey.import(vaultKeyBase64, 'base64'));
  const wrappedKey = await encryptBytes(await vaultKey.bytes(), kek);
  return {
    ...envelope,
    kdf: { name: 'scrypt', salt: bytesToBase64(salt), ...KDF },
    wrappedKey,
    updatedAt: new Date().toISOString(),
  };
}

export function validateEnvelope(value: unknown): asserts value is VaultEnvelope {
  const e = value as VaultEnvelope;
  if (!e || typeof e !== 'object' || e.format !== 'vaultsecure-v1' || !e.kdf) {
    throw new Error('Ungültiges VaultSecure-Backup.');
  }
  if (e.kdf.name !== 'scrypt' || typeof e.kdf.salt !== 'string' || typeof e.wrappedKey !== 'string' || typeof e.vaultCiphertext !== 'string') {
    throw new Error('Ungültiges VaultSecure-Backup.');
  }
  if (!Number.isInteger(e.kdf.N) || e.kdf.N < 16_384 || e.kdf.N > 1_048_576 || (e.kdf.N & (e.kdf.N - 1)) !== 0) {
    throw new Error('Nicht unterstützte scrypt-Kostenparameter.');
  }
  if (!Number.isInteger(e.kdf.r) || e.kdf.r < 1 || e.kdf.r > 32 || !Number.isInteger(e.kdf.p) || e.kdf.p < 1 || e.kdf.p > 8 || e.kdf.dkLen !== 32) {
    throw new Error('Unsichere oder nicht unterstützte KDF-Parameter.');
  }
  const salt = base64ToBytes(e.kdf.salt);
  if (salt.length < 16 || salt.length > 64) throw new Error('Ungültiger KDF-Salt.');
  if (e.wrappedKey.length > 4096 || e.vaultCiphertext.length > MAX_ENVELOPE_BYTES * 2) throw new Error('Backup ist zu groß.');
  base64ToBytes(e.wrappedKey);
  base64ToBytes(e.vaultCiphertext);
}
