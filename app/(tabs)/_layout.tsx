import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { useVault } from '@/src/state/vault-context';
import { C } from '@/src/ui/theme';

const icon = (symbol: string, color: ColorValue) => <Text style={{ color, fontSize: 20 }}>{symbol}</Text>;

export default function TabsLayout() {
  const { status } = useVault();
  if (status !== 'unlocked') return <Redirect href="/unlock" />;
  return (
    <Tabs screenOptions={{ headerStyle: { backgroundColor: C.bg }, headerTintColor: C.text, headerShadowVisible: false, tabBarStyle: { backgroundColor: '#08101A', borderTopColor: C.border }, tabBarActiveTintColor: C.blue, tabBarInactiveTintColor: C.muted }}>
      <Tabs.Screen name="index" options={{ title: 'Vault', tabBarIcon: ({ color }) => icon('▣', color) }} />
      <Tabs.Screen name="authenticator" options={{ title: '2FA', tabBarIcon: ({ color }) => icon('◉', color) }} />
      <Tabs.Screen name="generator" options={{ title: 'Generator', tabBarIcon: ({ color }) => icon('✦', color) }} />
      <Tabs.Screen name="settings" options={{ title: 'Einstellungen', tabBarIcon: ({ color }) => icon('⚙', color) }} />
    </Tabs>
  );
}
