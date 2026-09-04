export async function biometricAvailable(): Promise<boolean> { return false; }
export async function biometricConfigured(): Promise<boolean> { return false; }
export async function enableBiometricKey(): Promise<void> { throw new Error('Biometrie ist in der Web-Version nicht verfügbar.'); }
export async function disableBiometricKey(): Promise<void> {}
export async function getBiometricKey(): Promise<string | null> { return null; }
