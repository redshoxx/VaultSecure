import * as Updates from 'expo-updates';

let checkedThisSession = false;

export async function applyOtaUpdateIfAvailable(): Promise<boolean> {
  if (checkedThisSession || __DEV__ || !Updates.isEnabled) return false;
  checkedThisSession = true;
  try {
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) return false;
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
    return true;
  } catch {
    // Updates must never prevent the password manager from starting.
    return false;
  }
}
