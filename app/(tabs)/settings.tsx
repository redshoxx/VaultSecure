import React, { useEffect, useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { exportBackup, pickBackup } from '@/src/core/backup';
import { biometricAvailable, biometricConfigured } from '@/src/core/biometric';
import { cloudConfigured, cloudUserEmail, downloadEncryptedBackup, signInCloud, signOutCloud, signUpCloud } from '@/src/cloud/supabase';
import { checkGitHubRelease, openRelease } from '@/src/core/release';
import { useVault } from '@/src/state/vault-context';
import { Button, Card, ErrorBox, Field, Muted, Screen, SectionTitle } from '@/src/ui/components';
import { C } from '@/src/ui/theme';

function SettingRow({ title, description, value, onValueChange, disabled = false }: { title: string; description: string; value: boolean; onValueChange: (value: boolean) => void; disabled?: boolean }) {
  return <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><View style={{ flex: 1, gap: 3 }}><Text selectable style={{ color: C.text, fontWeight: '800' }}>{title}</Text><Text selectable style={{ color: C.muted, fontSize: 13, lineHeight: 18 }}>{description}</Text></View><Switch value={value} onValueChange={onValueChange} disabled={disabled} /></View>;
}

export default function SettingsScreen() {
  const { data, envelope, busy, error, lock, replaceEnvelope, resetVault, setBiometric, updateSettings, changeMasterPassword, syncCloudNow } = useVault();
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [newMaster, setNewMaster] = useState(''); const [newMaster2, setNewMaster2] = useState('');
  const [email, setEmail] = useState(''); const [cloudPassword, setCloudPassword] = useState(''); const [cloudEmail, setCloudEmail] = useState<string | null>(null); const [message, setMessage] = useState<string | null>(null);
  const configured = cloudConfigured();

  useEffect(() => {
    biometricAvailable().then(setBioAvailable).catch(() => setBioAvailable(false));
    biometricConfigured().then(setBioEnabled).catch(() => setBioEnabled(false));
    if (configured) cloudUserEmail().then(setCloudEmail).catch(() => setCloudEmail(null));
  }, [configured]);

  async function doExport() { if (!envelope) return; try { await exportBackup(envelope); setMessage('Verschlüsseltes Backup wurde zum Sichern geöffnet.'); } catch (e) { setMessage(e instanceof Error ? e.message : 'Backup fehlgeschlagen.'); } }
  async function doImport() { try { const backup = await pickBackup(); if (backup) { await replaceEnvelope(backup); router.replace('/unlock'); } } catch (e) { setMessage(e instanceof Error ? e.message : 'Backup konnte nicht importiert werden.'); } }
  async function changePassword() {
    if (newMaster.length < 10) return setMessage('Das neue Master-Passwort muss mindestens 10 Zeichen haben.');
    if (newMaster !== newMaster2) return setMessage('Die neuen Master-Passwörter stimmen nicht überein.');
    try { await changeMasterPassword(newMaster); setNewMaster(''); setNewMaster2(''); setMessage('Master-Passwort wurde geändert. Erstelle jetzt ein neues Backup.'); } catch {}
  }
  async function signIn() { try { await signInCloud(email.trim(), cloudPassword); setCloudEmail(email.trim()); setCloudPassword(''); setMessage('Cloud-Konto verbunden.'); } catch (e) { setMessage(e instanceof Error ? e.message : 'Anmeldung fehlgeschlagen.'); } }
  async function signUp() { try { await signUpCloud(email.trim(), cloudPassword); setMessage('Konto erstellt. Falls E-Mail-Bestätigung aktiviert ist, bestätige zuerst die E-Mail.'); } catch (e) { setMessage(e instanceof Error ? e.message : 'Registrierung fehlgeschlagen.'); } }
  async function signOut() { try { await signOutCloud(); setCloudEmail(null); await updateSettings({ cloudBackupEnabled: false }); } catch (e) { setMessage(e instanceof Error ? e.message : 'Abmelden fehlgeschlagen.'); } }
  async function restoreCloud() {
    try {
      const backup = await downloadEncryptedBackup();
      if (!backup) return setMessage('Kein Cloud-Backup gefunden.');
      Alert.alert('Cloud-Backup wiederherstellen?', 'Der lokale verschlüsselte Vault wird durch das Cloud-Backup ersetzt. Danach musst du ihn mit dem dazugehörigen Master-Passwort entsperren.', [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Wiederherstellen', style: 'destructive', onPress: async () => { await replaceEnvelope(backup); router.replace('/unlock'); } },
      ]);
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Cloud-Backup konnte nicht geladen werden.'); }
  }
  async function checkUpdates() {
    try {
      const result = await checkGitHubRelease();
      if (!result.updateAvailable) return setMessage(`VaultSecure ist aktuell (${result.latest}).`);
      Alert.alert('Update verfügbar', `Version ${result.latest} ist verfügbar.`, [
        { text: 'Später', style: 'cancel' },
        { text: 'Release öffnen', onPress: () => openRelease(result.url).catch(() => undefined) },
      ]);
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Updateprüfung fehlgeschlagen.'); }
  }

  function reset() {
    Alert.alert('Vault vollständig löschen?', 'Alle lokal gespeicherten Vault-Daten und der biometrische Geräteschlüssel werden gelöscht. Vorher ein Backup exportieren.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Vault löschen', style: 'destructive', onPress: async () => { try { await resetVault(); router.replace('/setup'); } catch {} } },
    ]);
  }

  const settings = data?.settings;
  if (!settings) return null;

  return <Screen>
    <Card>
      <SectionTitle>Sicherheit</SectionTitle>
      <SettingRow title="Biometrisches Entsperren" description="Vault-Key wird nur im geschützten iOS-Keychain/Android-Keystore abgelegt und bei Zugriff biometrisch freigegeben." value={bioEnabled} disabled={!bioAvailable} onValueChange={(v) => setBiometric(v).then(() => setBioEnabled(v)).catch(() => undefined)} />
      <View style={{ height: 1, backgroundColor: C.border }} />
      <Text selectable style={{ color: C.text, fontWeight: '800' }}>Automatisch sperren</Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {[30, 60, 120, 300, 900].map((seconds) => <Button key={seconds} title={seconds < 60 ? `${seconds}s` : `${seconds / 60}m`} variant={settings.autoLockSeconds === seconds ? 'primary' : 'secondary'} onPress={() => updateSettings({ autoLockSeconds: seconds }).catch(() => undefined)} />)}
      </View>
      <Button title="Vault jetzt sperren" variant="secondary" onPress={() => { lock(); router.replace('/unlock'); }} />
    </Card>

    <Card>
      <SectionTitle>Backup & Wiederherstellung</SectionTitle>
      <Muted>Backup-Dateien enthalten ausschließlich den verschlüsselten Vault. Zum Wiederherstellen wird das Master-Passwort benötigt.</Muted>
      <Button title="Verschlüsseltes Backup exportieren" onPress={doExport} />
      <Button title="Backup importieren" variant="secondary" onPress={doImport} />
    </Card>

    <Card>
      <SectionTitle>Cloud-Backup</SectionTitle>
      {!configured ? <Muted>Cloud ist vorbereitet, aber noch nicht verbunden. Trage `EXPO_PUBLIC_SUPABASE_URL` und den Publishable Key in `.env` ein und führe die mitgelieferte Supabase-Migration aus.</Muted> : cloudEmail ? <>
        <Muted>Angemeldet als {cloudEmail}. Hochgeladen wird nur das bereits Ende-zu-Ende verschlüsselte VaultEnvelope.</Muted>
        <SettingRow title="Automatische Cloud-Backups" description="Nach Änderungen wird der verschlüsselte Vault automatisch hochgeladen." value={settings.cloudBackupEnabled} onValueChange={(v) => updateSettings({ cloudBackupEnabled: v }).catch(() => undefined)} />
        <Button title="Jetzt verschlüsselt sichern" onPress={() => syncCloudNow().then(() => setMessage('Cloud-Backup aktualisiert.')).catch(() => undefined)} />
        <Button title="Cloud-Backup wiederherstellen" variant="secondary" onPress={restoreCloud} />
        <Button title="Cloud-Konto trennen" variant="secondary" onPress={signOut} />
      </> : <>
        <Field label="E-MAIL" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Field label="CLOUD-KONTO-PASSWORT" value={cloudPassword} onChangeText={setCloudPassword} secureTextEntry autoCapitalize="none" />
        <Button title="Anmelden" disabled={!email || !cloudPassword} onPress={signIn} />
        <Button title="Konto erstellen" variant="secondary" disabled={!email || cloudPassword.length < 8} onPress={signUp} />
      </>}
    </Card>

    <Card>
      <SectionTitle>Master-Passwort ändern</SectionTitle>
      <Muted>Nur die Schlüsselhülle wird neu verschlüsselt. Deine Vault-Daten müssen dafür nicht entschlüsselt gespeichert werden.</Muted>
      <Field label="NEUES MASTER-PASSWORT" value={newMaster} onChangeText={setNewMaster} secureTextEntry autoCapitalize="none" />
      <Field label="WIEDERHOLEN" value={newMaster2} onChangeText={setNewMaster2} secureTextEntry autoCapitalize="none" />
      <Button title="Master-Passwort ändern" variant="secondary" disabled={newMaster.length < 10 || busy} onPress={changePassword} />
    </Card>

    {(message || error) && <ErrorBox message={message ?? error} />}

    <Card>
      <SectionTitle>Updates & Plattformen</SectionTitle>
      <Muted>iOS: SideStore/IPA · Android: APK · Web: statischer Expo-Web-Build. GitHub-Releases sind die gemeinsame Updatequelle.</Muted>
      <Button title="Nach Updates suchen" variant="secondary" onPress={checkUpdates} />
    </Card>

    <Button title="Vault vollständig löschen" variant="danger" onPress={reset} />
  </Screen>;
}
