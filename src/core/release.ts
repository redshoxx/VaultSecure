import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

function versionParts(value: string): number[] {
  return value.replace(/^v/, '').split('.').map((x) => Number(x.replace(/\D.*$/, '')) || 0);
}

export function isNewerVersion(current: string, latest: string): boolean {
  const a = versionParts(current); const b = versionParts(latest);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const av = a[i] ?? 0; const bv = b[i] ?? 0;
    if (bv > av) return true;
    if (bv < av) return false;
  }
  return false;
}

export async function checkGitHubRelease(): Promise<{ updateAvailable: boolean; latest: string; url: string }> {
  const owner = process.env.EXPO_PUBLIC_GITHUB_OWNER;
  const repo = process.env.EXPO_PUBLIC_GITHUB_REPO;
  if (!owner || !repo || owner.includes('YOUR_')) throw new Error('GitHub-Updatequelle ist noch nicht konfiguriert.');
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } });
  if (!response.ok) throw new Error(`GitHub-Release konnte nicht geprüft werden (${response.status}).`);
  const release = await response.json() as { tag_name: string; html_url: string };
  const current = Constants.expoConfig?.version ?? '0.0.0';
  return { updateAvailable: isNewerVersion(current, release.tag_name), latest: release.tag_name, url: release.html_url };
}

export async function openRelease(url: string): Promise<void> {
  await Linking.openURL(url);
}
