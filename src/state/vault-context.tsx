import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { VaultData, VaultEnvelope, VaultItem, TotpItem, VaultSettings } from '@/src/types/vault';
import { emptyVault } from '@/src/types/vault';
import { createEnvelope, decryptWithVaultKey, rewrapMasterPassword, unlockEnvelope, updateEnvelopeData, validateEnvelope } from '@/src/core/crypto';
import { loadEnvelope, removeEnvelope, saveEnvelope } from '@/src/core/storage';
import { disableBiometricKey, enableBiometricKey, getBiometricKey } from '@/src/core/biometric';
import { uploadEncryptedBackup } from '@/src/cloud/supabase';

export type VaultStatus = 'loading' | 'needs-setup' | 'locked' | 'unlocked';

type VaultContextValue = {
  status: VaultStatus;
  data: VaultData | null;
  envelope: VaultEnvelope | null;
  busy: boolean;
  error: string | null;
  createVault(password: string): Promise<void>;
  unlock(password: string): Promise<void>;
  unlockBiometric(): Promise<void>;
  lock(): void;
  touch(): void;
  upsertItem(item: Omit<VaultItem, 'createdAt' | 'updatedAt'> & Partial<Pick<VaultItem, 'createdAt' | 'updatedAt'>>): Promise<void>;
  deleteItem(id: string): Promise<void>;
  upsertTotp(item: Omit<TotpItem, 'createdAt' | 'updatedAt'> & Partial<Pick<TotpItem, 'createdAt' | 'updatedAt'>>): Promise<void>;
  deleteTotp(id: string): Promise<void>;
  updateSettings(settings: Partial<VaultSettings>): Promise<void>;
  setBiometric(enabled: boolean): Promise<void>;
  changeMasterPassword(password: string): Promise<void>;
  replaceEnvelope(envelope: VaultEnvelope): Promise<void>;
  resetVault(): Promise<void>;
  syncCloudNow(): Promise<void>;
  clearError(): void;
};

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<VaultStatus>('loading');
  const [data, setData] = useState<VaultData | null>(null);
  const [envelope, setEnvelope] = useState<VaultEnvelope | null>(null);
  const [vaultKey, setVaultKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadEnvelope()
      .then((stored) => {
        setEnvelope(stored);
        setStatus(stored ? 'locked' : 'needs-setup');
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Vault konnte nicht geladen werden.');
        setStatus('locked');
      });
  }, []);

  const lock = useCallback(() => {
    setData(null);
    setVaultKey(null);
    setStatus((current) => current === 'needs-setup' ? current : 'locked');
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
  }, []);

  const touch = useCallback(() => {
    if (status !== 'unlocked' || !data) return;
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (data.settings.autoLockSeconds > 0) {
      inactivityTimer.current = setTimeout(lock, data.settings.autoLockSeconds * 1000);
    }
  }, [data, lock, status]);

  useEffect(() => {
    touch();
    return () => { if (inactivityTimer.current) clearTimeout(inactivityTimer.current); };
  }, [touch]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        // Password-manager default: never keep the decrypted vault key alive in the background.
        if (status === 'unlocked') lock();
      }
    });
    return () => sub.remove();
  }, [lock, status]);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try { await fn(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unbekannter Fehler.'); throw e; }
    finally { setBusy(false); }
  }, []);

  const createVault = useCallback(async (password: string) => run(async () => {
    // SecureStore/Keychain values can survive app reinstall on some platforms.
    // Remove any stale biometric key before a brand-new vault is created.
    await disableBiometricKey();
    const initial = emptyVault();
    const created = await createEnvelope(password, initial);
    await saveEnvelope(created.envelope);
    setEnvelope(created.envelope);
    setVaultKey(created.vaultKeyBase64);
    setData(initial);
    setStatus('unlocked');
  }), [run]);

  const unlock = useCallback(async (password: string) => run(async () => {
    if (!envelope) throw new Error('Kein Vault vorhanden.');
    const result = await unlockEnvelope(password, envelope);
    setData(result.data);
    setVaultKey(result.vaultKeyBase64);
    setStatus('unlocked');
  }), [envelope, run]);

  const unlockBiometric = useCallback(async () => run(async () => {
    if (!envelope) throw new Error('Kein Vault vorhanden.');
    const key = await getBiometricKey();
    if (!key) throw new Error('Biometrisches Entsperren ist nicht eingerichtet oder wurde abgebrochen.');
    const restored = await decryptWithVaultKey(key, envelope);
    setData(restored);
    setVaultKey(key);
    setStatus('unlocked');
  }), [envelope, run]);

  const persist = useCallback(async (next: VaultData) => {
    if (!envelope || !vaultKey) throw new Error('Vault ist gesperrt.');
    const stamped = { ...next, lastModified: new Date().toISOString() };
    const nextEnvelope = await updateEnvelopeData(envelope, vaultKey, stamped);
    await saveEnvelope(nextEnvelope);
    setEnvelope(nextEnvelope);
    setData(stamped);
    if (stamped.settings.cloudBackupEnabled) {
      uploadEncryptedBackup(nextEnvelope).catch(() => undefined);
    }
  }, [envelope, vaultKey]);

  const upsertItem = useCallback(async (item: Omit<VaultItem, 'createdAt' | 'updatedAt'> & Partial<Pick<VaultItem, 'createdAt' | 'updatedAt'>>) => run(async () => {
    if (!data) throw new Error('Vault ist gesperrt.');
    const now = new Date().toISOString();
    const existing = data.items.find((x) => x.id === item.id);
    const next: VaultItem = { ...item, createdAt: existing?.createdAt ?? item.createdAt ?? now, updatedAt: now };
    await persist({ ...data, items: existing ? data.items.map((x) => x.id === next.id ? next : x) : [next, ...data.items] });
  }), [data, persist, run]);

  const deleteItem = useCallback(async (id: string) => run(async () => {
    if (!data) throw new Error('Vault ist gesperrt.');
    await persist({ ...data, items: data.items.filter((x) => x.id !== id) });
  }), [data, persist, run]);

  const upsertTotp = useCallback(async (item: Omit<TotpItem, 'createdAt' | 'updatedAt'> & Partial<Pick<TotpItem, 'createdAt' | 'updatedAt'>>) => run(async () => {
    if (!data) throw new Error('Vault ist gesperrt.');
    const now = new Date().toISOString();
    const existing = data.totp.find((x) => x.id === item.id);
    const next: TotpItem = { ...item, createdAt: existing?.createdAt ?? item.createdAt ?? now, updatedAt: now };
    await persist({ ...data, totp: existing ? data.totp.map((x) => x.id === next.id ? next : x) : [next, ...data.totp] });
  }), [data, persist, run]);

  const deleteTotp = useCallback(async (id: string) => run(async () => {
    if (!data) throw new Error('Vault ist gesperrt.');
    await persist({ ...data, totp: data.totp.filter((x) => x.id !== id) });
  }), [data, persist, run]);

  const updateSettings = useCallback(async (settings: Partial<VaultSettings>) => run(async () => {
    if (!data) throw new Error('Vault ist gesperrt.');
    await persist({ ...data, settings: { ...data.settings, ...settings } });
  }), [data, persist, run]);

  const setBiometric = useCallback(async (enabled: boolean) => run(async () => {
    if (!data || !vaultKey) throw new Error('Vault ist gesperrt.');
    if (enabled) await enableBiometricKey(vaultKey); else await disableBiometricKey();
    await persist({ ...data, settings: { ...data.settings, biometricUnlock: enabled } });
  }), [data, persist, run, vaultKey]);

  const changeMasterPassword = useCallback(async (password: string) => run(async () => {
    if (!envelope || !vaultKey) throw new Error('Vault ist gesperrt.');
    const next = await rewrapMasterPassword(envelope, vaultKey, password);
    await saveEnvelope(next);
    setEnvelope(next);
    if (data?.settings.cloudBackupEnabled) await uploadEncryptedBackup(next).catch(() => undefined);
  }), [data?.settings.cloudBackupEnabled, envelope, run, vaultKey]);

  const replaceEnvelope = useCallback(async (next: VaultEnvelope) => run(async () => {
    validateEnvelope(next);
    await disableBiometricKey();
    await saveEnvelope(next);
    setEnvelope(next);
    setData(null);
    setVaultKey(null);
    setStatus('locked');
  }), [run]);

  const resetVault = useCallback(async () => run(async () => {
    await removeEnvelope();
    await disableBiometricKey();
    setEnvelope(null);
    setData(null);
    setVaultKey(null);
    setStatus('needs-setup');
  }), [run]);

  const syncCloudNow = useCallback(async () => run(async () => {
    if (!envelope) throw new Error('Kein Vault vorhanden.');
    await uploadEncryptedBackup(envelope);
  }), [envelope, run]);

  const value = useMemo<VaultContextValue>(() => ({
    status, data, envelope, busy, error, createVault, unlock, unlockBiometric, lock, touch,
    upsertItem, deleteItem, upsertTotp, deleteTotp, updateSettings, setBiometric,
    changeMasterPassword, replaceEnvelope, resetVault, syncCloudNow, clearError: () => setError(null),
  }), [status, data, envelope, busy, error, createVault, unlock, unlockBiometric, lock, touch, upsertItem, deleteItem, upsertTotp, deleteTotp, updateSettings, setBiometric, changeMasterPassword, replaceEnvelope, resetVault, syncCloudNow]);

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultContextValue {
  const value = React.use(VaultContext);
  if (!value) throw new Error('useVault must be used within VaultProvider');
  return value;
}
