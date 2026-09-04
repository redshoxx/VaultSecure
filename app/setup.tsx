import React, { useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useVault } from '@/src/state/vault-context';
import { Button, Card, ErrorBox, Field, Muted, Screen, Title } from '@/src/ui/components';
import { C } from '@/src/ui/theme';

export default function SetupScreen() {
  const { createVault, busy, error } = useVault();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  async function create() {
    setLocalError(null);
    if (password.length < 10) return setLocalError('Mindestens 10 Zeichen verwenden. Besser: 4–6 zufällige Wörter.');
    if (password !== confirm) return setLocalError('Die beiden Passwörter stimmen nicht überein.');
    try { await createVault(password); router.replace('/(tabs)'); } catch {}
  }

  return (
    <Screen>
      <View style={{ gap: 8, paddingTop: 24 }}>
        <Text selectable style={{ color: C.blue, fontWeight: '900', letterSpacing: 0.5 }}>VAULTSECURE</Text>
        <Title>Dein verschlüsselter Tresor.</Title>
        <Muted>Das Master-Passwort wird nie gespeichert. Es schützt den Schlüssel, mit dem deine Passwörter, Notizen und 2FA-Secrets verschlüsselt werden.</Muted>
      </View>
      <Card>
        <Field label="MASTER-PASSWORT" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="newPassword" />
        <Field label="MASTER-PASSWORT WIEDERHOLEN" value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="newPassword" />
        <Muted>Wenn du dieses Passwort verlierst und kein entsperrbares Backup mehr hast, kann niemand den Vault wiederherstellen.</Muted>
      </Card>
      <ErrorBox message={localError ?? error} />
      <Button title={busy ? 'Vault wird erstellt …' : 'Vault erstellen'} disabled={busy} onPress={create} />
      <Button title="Bestehenden Vault wiederherstellen" variant="secondary" disabled={busy} onPress={() => router.push('/restore')} />
    </Screen>
  );
}
