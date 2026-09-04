import * as SecureStore from 'expo-secure-store';

const PREFIX = 'vaultsecure.cloud-session';
const CHUNK_SIZE = 1800;

function safeKey(key: string): string {
  return `${PREFIX}.${key.replace(/[^A-Za-z0-9._-]/g, '_')}`;
}

async function countFor(key: string): Promise<number> {
  const raw = await SecureStore.getItemAsync(`${safeKey(key)}.count`);
  const count = Number(raw ?? 0);
  return Number.isInteger(count) && count > 0 && count < 100 ? count : 0;
}

async function clearChunks(key: string): Promise<void> {
  const base = safeKey(key);
  const count = await countFor(key);
  await Promise.all([
    ...Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${base}.${i}`)),
    SecureStore.deleteItemAsync(`${base}.count`),
  ]);
}

export const authStorage = {
  async getItem(key: string): Promise<string | null> {
    const base = safeKey(key);
    const count = await countFor(key);
    if (!count) return null;
    const parts = await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${base}.${i}`)));
    if (parts.some((part) => part === null)) return null;
    return parts.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    await clearChunks(key);
    const base = safeKey(key);
    const parts: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) parts.push(value.slice(i, i + CHUNK_SIZE));
    if (parts.length === 0) parts.push('');
    for (let i = 0; i < parts.length; i += 1) {
      await SecureStore.setItemAsync(`${base}.${i}`, parts[i] ?? '', {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    }
    await SecureStore.setItemAsync(`${base}.count`, String(parts.length), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },

  async removeItem(key: string): Promise<void> {
    await clearChunks(key);
  },
};
