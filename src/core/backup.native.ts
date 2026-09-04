import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { VaultEnvelope } from '@/src/types/vault';
import { validateEnvelope } from './crypto';

function filename() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `VaultSecure-${stamp}.vaultsecure`;
}

export async function exportBackup(envelope: VaultEnvelope): Promise<void> {
  const content = JSON.stringify(envelope, null, 2);
  if (process.env.EXPO_OS === 'web') {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename();
    anchor.click();
    URL.revokeObjectURL(url);
    return;
  }
  const file = new File(Paths.cache, filename());
  file.create({ overwrite: true });
  file.write(content);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Teilen ist auf diesem Gerät nicht verfügbar.');
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Verschlüsseltes VaultSecure-Backup sichern' });
}

export async function pickBackup(): Promise<VaultEnvelope | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'application/octet-stream', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  let text: string;
  if (process.env.EXPO_OS === 'web' && asset.file) text = await asset.file.text();
  else text = await new File(asset.uri).text();
  const parsed = JSON.parse(text) as unknown;
  validateEnvelope(parsed);
  return parsed;
}
