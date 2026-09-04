import React from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useVault } from '@/src/state/vault-context';
import { C } from '@/src/ui/theme';

export default function Index() {
  const { status } = useVault();
  if (status === 'loading') return <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color={C.blue} /></View>;
  if (status === 'needs-setup') return <Redirect href="/setup" />;
  if (status === 'locked') return <Redirect href="/unlock" />;
  return <Redirect href="/(tabs)" />;
}
