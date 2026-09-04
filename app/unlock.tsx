import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { biometricAvailable, biometricConfigured } from '@/src/core/biometric';
import { useVault } from '@/src/state/vault-context';
import { Button, Card, ErrorBox, Field, Muted, Screen, Title } from '@/src/ui/components';
import { C } from '@/src/ui/theme';

export default function UnlockScreen() {
  const { unlock, unlockBiometric, busy, error } = useVault();
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState(false);
  useEffect(() => { Promise.all([biometricAvailable(), biometricConfigured()]).then(([available, configured]) => setBio(available && configured)).catch(() => setBio(false)); }, []);

  async function submit() {
    try { await unlock(password); setPassword(''); router.replace('/(tabs)'); } catch {}
  }
  async function biometric() {
    try { await unlockBiometric(); router.replace('/(tabs)'); } catch {}
  }

  return (
    <Screen contentStyle={{ justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', gap: 10, paddingBottom: 8 }}>
        <View style={{ width: 82, height: 82, borderRadius: 25, backgroundColor: '#0D2948', borderColor: '#2E83E3', borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 38 }}>🔐</Text></View>
        <Title>VaultSecure</Title>
        <Muted>Dein Tresor ist gesperrt.</Muted>
      </View>
      <Card>
        <Field label="MASTER-PASSWORT" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} onSubmitEditing={submit} />
        <Button title={busy ? 'Entsperren …' : 'Entsperren'} disabled={busy || !password} onPress={submit} />
        {bio && <Button title="Mit Face ID / Biometrie entsperren" variant="secondary" disabled={busy} onPress={biometric} />}
      </Card>
      <ErrorBox message={error} />
      <Button title="Backup wiederherstellen" variant="secondary" disabled={busy} onPress={() => router.push('/restore')} />
    </Screen>
  );
}
