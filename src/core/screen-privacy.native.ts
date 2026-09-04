import * as ScreenCapture from 'expo-screen-capture';

const KEY = 'vaultsecure-sensitive-ui';

export async function enableScreenPrivacy(): Promise<void> {
  await ScreenCapture.preventScreenCaptureAsync(KEY);
  if (process.env.EXPO_OS === 'ios') {
    await ScreenCapture.enableAppSwitcherProtectionAsync(0.95);
  }
}

export async function disableScreenPrivacy(): Promise<void> {
  await ScreenCapture.allowScreenCaptureAsync(KEY);
  if (process.env.EXPO_OS === 'ios') {
    await ScreenCapture.disableAppSwitcherProtectionAsync();
  }
}
