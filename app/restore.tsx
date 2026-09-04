import React, { useState } from 'react';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { pickBackup } from '@/src/core/backup';
import { cloudConfigured, downloadEncryptedBackup, signInCloud, signOutCloud } from '@/src/cloud/supabase';
import { useVault } from '@/src/state/vault-context';
import { Button, Card, ErrorBox, Field, Muted, Screen, SectionTitle } from '@/src/ui/components';

export default function RestoreScreen() {
  const { replaceEnvelope, busy, error } = useVault();
  const [email, setEmail] = useState('');
  const [cloudPassword, setCloudPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const cloud = cloudConfigured();

  async function restoreFile() {
    setMessage(null);
    try {
      const backup = await pickBackup();
      if (!backup) return;
      await replaceEnvelope(backup);
      router.replace('/unlock');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Backup konnte nicht wiederhergestellt werden.');
    }
  }

  async function restoreCloud() {
    setMessage(null);
    try {
      await signInCloud(email.trim(), cloudPassword);
      const backup = await downloadEncryptedBackup();
      if (!backup) throw new Error('Für dieses Cloud-Konto wurde kein VaultSecure-Backup gefunden.');
      await replaceEnvelope(backup);
      setCloudPassword('');
      router.replace('/unlock');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Cloud-Wiederherstellung fehlgeschlagen.');
    }
  }

  function leaveCloudAccount() {
    Alert.alert('Cloud-Sitzung entfernen?', 'Nur die Cloud-Anmeldung auf diesem Gerät wird entfernt. Das verschlüsselte Cloud-Backup bleibt bestehen.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Abmelden', onPress: () => signOutCloud().catch(() => undefined) },
    ]);
  }

  return <Screen>
    <Card>
      <SectionTitle>Backup-Datei</SectionTitle>
      <Muted>Wähle eine `.vaultsecure`-Datei. Sie enthält nur den verschlüsselten Tresor und wird erst auf dem Entsperrbildschirm mit deinem Master-Passwort geöffnet.</Muted>
      <Button title="Verschlüsseltes Backup auswählen" disabled={busy} onPress={restoreFile} />
    </Card>

    <Card>
      <SectionTitle>Cloud-Backup</SectionTitle>
      {!cloud ? <Muted>Cloud-Wiederherstellung ist in diesem Build noch nicht konfiguriert. Trage die Supabase-Variablen aus `.env.example` ein.</Muted> : <>
        <Muted>Melde dich mit dem VaultSecure-Cloud-Konto an. Das Cloud-Passwort ist nicht dein Master-Passwort.</Muted>
        <Field label="E-MAIL" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
        <Field label="CLOUD-KONTO-PASSWORT" value={cloudPassword} onChangeText={setCloudPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} />
        <Button title={busy ? 'Wiederherstellen …' : 'Cloud-Backup wiederherstellen'} disabled={busy || !email.trim() || !cloudPassword} onPress={restoreCloud} />
        <Button title="Cloud-Sitzung auf diesem Gerät entfernen" variant="secondary" onPress={leaveCloudAccount} />
      </>}
    </Card>

    <ErrorBox message={message ?? error} />
    <Muted>Nach dem Import brauchst du weiterhin das Master-Passwort, mit dem dieses Backup verschlüsselt wurde.</Muted>
  </Screen>;
}
