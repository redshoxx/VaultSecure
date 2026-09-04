import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
const sourcePath = path.join(root, 'sidestore-source.json');
const repo = process.env.GITHUB_REPOSITORY || `${process.env.EXPO_PUBLIC_GITHUB_OWNER || 'redshoxx'}/${process.env.EXPO_PUBLIC_GITHUB_REPO || 'VaultSecure'}`;
const [owner, repoName] = repo.split('/');
const version = process.env.RELEASE_VERSION?.replace(/^v/, '') || pkg.version;
const buildVersion = process.env.BUILD_VERSION || app.ios?.buildNumber || '1';
const date = process.env.RELEASE_DATE || new Date().toISOString().slice(0, 10);
const size = Number(process.env.IPA_SIZE || 1);
const downloadURL = `https://github.com/${owner}/${repoName}/releases/download/v${version}/VaultSecure.ipa`;
const iconURL = `https://raw.githubusercontent.com/${owner}/${repoName}/main/assets/icon.png`;

let source = {
  name: 'VaultSecure',
  subtitle: 'Sicherer Passwort- und 2FA-Tresor',
  description: 'Offizielle VaultSecure SideStore-Quelle.',
  iconURL,
  tintColor: '#238BFF',
  apps: [{
    name: 'VaultSecure',
    bundleIdentifier: app.ios.bundleIdentifier,
    developerName: owner,
    subtitle: 'Passwörter, sichere Codes und 2FA in einem verschlüsselten Vault.',
    localizedDescription: 'VaultSecure speichert Passwörter, Codes, sichere Notizen und TOTP-Secrets verschlüsselt. Backups enthalten ausschließlich den verschlüsselten Vault.',
    iconURL,
    tintColor: '#238BFF',
    category: 'utilities',
    versions: [],
  }],
  news: [],
};

if (fs.existsSync(sourcePath)) {
  try { source = { ...source, ...JSON.parse(fs.readFileSync(sourcePath, 'utf8')) }; } catch {}
}
const appEntry = source.apps?.[0] || {};
const versions = Array.isArray(appEntry.versions) ? appEntry.versions.filter((v) => !(v.version === version && v.buildVersion === String(buildVersion))) : [];
versions.unshift({
  version,
  buildVersion: String(buildVersion),
  date,
  localizedDescription: process.env.RELEASE_NOTES || 'Sicherheits-, Stabilitäts- und Funktionsupdate.',
  downloadURL,
  size,
  minOSVersion: '16.4',
});
source.apps = [{ ...appEntry, iconURL, developerName: owner, bundleIdentifier: app.ios.bundleIdentifier, versions }];
fs.writeFileSync(sourcePath, JSON.stringify(source, null, 2) + '\n');
console.log(`Updated ${sourcePath} for ${repo} v${version} (${buildVersion}).`);
