import { kvStorage } from './kv-storage';
import { checkGitHubRelease } from './release';

const LAST_CHECK_KEY = 'vaultsecure.binary-update.last-check.v1';
const LAST_ALERT_KEY = 'vaultsecure.binary-update.last-alert.v1';
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export async function checkBinaryUpdateDaily(): Promise<{ latest: string; url: string } | null> {
  if (process.env.EXPO_OS === 'web' || __DEV__) return null;
  const now = Date.now();
  const last = Number(await kvStorage.getItem(LAST_CHECK_KEY) ?? 0);
  if (Number.isFinite(last) && now - last < CHECK_INTERVAL_MS) return null;
  await kvStorage.setItem(LAST_CHECK_KEY, String(now));
  const result = await checkGitHubRelease();
  if (!result.updateAvailable) return null;
  const alerted = await kvStorage.getItem(LAST_ALERT_KEY);
  if (alerted === result.latest) return null;
  await kvStorage.setItem(LAST_ALERT_KEY, result.latest);
  return { latest: result.latest, url: result.url };
}
