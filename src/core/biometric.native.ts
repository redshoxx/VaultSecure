import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_KEY = 'vaultsecure.biometric.vault-key.v1';
const BIOMETRIC_MARKER = 'vaultsecure.biometric.configured.v1';

function isNative(): boolean {
  return process.env.EXPO_OS === 'ios' || process.env.EXPO_OS === 'android';
}

export async function biometricAvailable(): Promise<boolean> {
  if (!isNative()) return false;
  const secure = SecureStore.canUseBiometricAuthentication();
  const hardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return secure && hardware && enrolled;
}

export async function biometricConfigured(): Promise<boolean> {
  if (!isNative()) return false;
  return (await SecureStore.getItemAsync(BIOMETRIC_MARKER)) === '1';
}

export async function enableBiometricKey(vaultKeyBase64: string): Promise<void> {
  if (!isNative()) throw new Error('Biometrie ist nur auf iOS/Android verfügbar.');
  if (!(await biometricAvailable())) throw new Error('Auf diesem Gerät ist keine unterstützte Biometrie eingerichtet.');

  // On Android, SecureStore itself requires authentication for writes when
  // requireAuthentication=true. On iOS creating a new protected value does not,
  // so we explicitly confirm the user once before enabling the feature.
  if (process.env.EXPO_OS === 'ios') {
    const ok = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Biometrisches Entsperren aktivieren',
      cancelLabel: 'Abbrechen',
    });
    if (!ok.success) throw new Error('Biometrische Bestätigung fehlgeschlagen.');
  }

  await SecureStore.setItemAsync(BIOMETRIC_KEY, vaultKeyBase64, {
    requireAuthentication: true,
    authenticationPrompt: 'VaultSecure entsperren',
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  await SecureStore.setItemAsync(BIOMETRIC_MARKER, '1', {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function disableBiometricKey(): Promise<void> {
  if (!isNative()) return;
  await Promise.all([
    SecureStore.deleteItemAsync(BIOMETRIC_KEY),
    SecureStore.deleteItemAsync(BIOMETRIC_MARKER),
  ]);
}

export async function getBiometricKey(): Promise<string | null> {
  if (!isNative() || !(await biometricConfigured())) return null;
  try {
    return await SecureStore.getItemAsync(BIOMETRIC_KEY, {
      requireAuthentication: true,
      authenticationPrompt: 'VaultSecure entsperren',
    });
  } catch {
    return null;
  }
}
