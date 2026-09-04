import * as DocumentPicker from 'expo-document-picker';
import type { VaultEnvelope } from '@/src/types/vault';
import { validateEnvelope } from './crypto';

function filename() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `VaultSecure-${stamp}.vaultsecure`;
}

export async function exportBackup(envelope: VaultEnvelope): Promise<void> {
  const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename();
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function pickBackup(): Promise<VaultEnvelope | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: false });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset?.file) throw new Error('Backup-Datei konnte im Browser nicht gelesen werden.');
  const parsed = JSON.parse(await asset.file.text()) as unknown;
  validateEnvelope(parsed);
  return parsed;
}
