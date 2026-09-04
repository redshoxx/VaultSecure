export type VaultItemKind = 'login' | 'note' | 'code';

export type VaultItem = {
  id: string;
  kind: VaultItemKind;
  title: string;
  username?: string;
  password?: string;
  website?: string;
  secret?: string;
  notes?: string;
  favorite?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TotpItem = {
  id: string;
  issuer: string;
  account: string;
  secret: string;
  digits: 6 | 8;
  period: number;
  algorithm: 'SHA1' | 'SHA256' | 'SHA512';
  createdAt: string;
  updatedAt: string;
};

export type VaultSettings = {
  autoLockSeconds: number;
  biometricUnlock: boolean;
  clipboardClearSeconds: number;
  cloudBackupEnabled: boolean;
};

export type VaultData = {
  schemaVersion: 1;
  items: VaultItem[];
  totp: TotpItem[];
  settings: VaultSettings;
  lastModified: string;
};

export type VaultEnvelope = {
  format: 'vaultsecure-v1';
  kdf: {
    name: 'scrypt';
    salt: string;
    N: number;
    r: number;
    p: number;
    dkLen: number;
  };
  wrappedKey: string;
  vaultCiphertext: string;
  updatedAt: string;
};

export const DEFAULT_SETTINGS: VaultSettings = {
  autoLockSeconds: 120,
  biometricUnlock: false,
  clipboardClearSeconds: 30,
  cloudBackupEnabled: false,
};

export function emptyVault(): VaultData {
  return {
    schemaVersion: 1,
    items: [],
    totp: [],
    settings: { ...DEFAULT_SETTINGS },
    lastModified: new Date().toISOString(),
  };
}
