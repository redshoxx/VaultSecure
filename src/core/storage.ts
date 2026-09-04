import { kvStorage } from './kv-storage';
import type { VaultEnvelope } from '@/src/types/vault';
import { validateEnvelope } from './crypto';

const ENVELOPE_KEY = 'vaultsecure.envelope.v1';
const HISTORY_KEY = 'vaultsecure.envelope-history.v1';
const MAX_HISTORY = 5;

async function readHistory(): Promise<VaultEnvelope[]> {
  try {
    const raw = await kvStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const valid: VaultEnvelope[] = [];
    for (const candidate of parsed.slice(0, MAX_HISTORY)) {
      try { validateEnvelope(candidate); valid.push(candidate); } catch {}
    }
    return valid;
  } catch {
    return [];
  }
}

export async function loadEnvelope(): Promise<VaultEnvelope | null> {
  const raw = await kvStorage.getItem(ENVELOPE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    validateEnvelope(parsed);
    return parsed;
  } catch {
    const history = await readHistory();
    const fallback = history[0] ?? null;
    if (fallback) {
      await kvStorage.setItem(ENVELOPE_KEY, JSON.stringify(fallback));
      return fallback;
    }
    throw new Error('Der lokale Vault ist beschädigt. Stelle ein verschlüsseltes Backup wieder her.');
  }
}

export async function saveEnvelope(envelope: VaultEnvelope): Promise<void> {
  validateEnvelope(envelope);
  const previousRaw = await kvStorage.getItem(ENVELOPE_KEY);
  if (previousRaw) {
    try {
      const previous = JSON.parse(previousRaw) as unknown;
      validateEnvelope(previous);
      const history = await readHistory();
      const next = [previous, ...history.filter((item) => item.updatedAt !== previous.updatedAt)].slice(0, MAX_HISTORY);
      await kvStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {}
  }
  await kvStorage.setItem(ENVELOPE_KEY, JSON.stringify(envelope));
}

export async function removeEnvelope(): Promise<void> {
  await Promise.all([
    kvStorage.removeItem(ENVELOPE_KEY),
    kvStorage.removeItem(HISTORY_KEY),
  ]);
}
