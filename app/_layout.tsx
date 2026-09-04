import 'react-native-gesture-handler';
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Alert, View } from 'react-native';
import { VaultProvider, useVault } from '@/src/state/vault-context';
import { C } from '@/src/ui/theme';
import { applyOtaUpdateIfAvailable } from '@/src/core/ota-updates';
import { checkBinaryUpdateDaily } from '@/src/core/binary-updates';
import { openRelease } from '@/src/core/release';
import { enableScreenPrivacy } from '@/src/core/screen-privacy';

function Navigation() {
  const { touch } = useVault();
  React.useEffect(() => {
    enableScreenPrivacy().catch(() => undefined);
    applyOtaUpdateIfAvailable().catch(() => undefined);
    checkBinaryUpdateDaily().then((update) => {
      if (!update) return;
      Alert.alert('VaultSecure Update verfügbar', `Version ${update.latest} ist verfügbar.`, [
        { text: 'Später', style: 'cancel' },
        { text: 'Update öffnen', onPress: () => openRelease(update.url).catch(() => undefined) },
      ]);
    }).catch(() => undefined);
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }} onTouchStart={touch}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: C.bg }, headerTintColor: C.text, contentStyle: { backgroundColor: C.bg }, headerShadowVisible: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="setup" options={{ title: 'Vault einrichten', headerBackVisible: false }} />
        <Stack.Screen name="unlock" options={{ title: 'VaultSecure', headerBackVisible: false }} />
        <Stack.Screen name="restore" options={{ title: 'Vault wiederherstellen' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="item/[id]" options={{ title: 'Eintrag', presentation: 'modal' }} />
        <Stack.Screen name="totp" options={{ title: '2FA hinzufügen', presentation: 'modal' }} />
        <Stack.Screen name="scan" options={{ title: '2FA QR-Code scannen', presentation: 'modal' }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return <VaultProvider><Navigation /></VaultProvider>;
}
