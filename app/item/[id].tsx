import React, { useEffect, useMemo, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';
import { copySensitive } from '@/src/core/clipboard';
import { generatePassword } from '@/src/core/password-generator';
import { useVault } from '@/src/state/vault-context';
import { Button, Card, Chip, ErrorBox, Field, Muted, Screen } from '@/src/ui/components';
import { C } from '@/src/ui/theme';
import type { VaultItemKind } from '@/src/types/vault';

export default function ItemEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, upsertItem, deleteItem, busy, error } = useVault();
  const existing = useMemo(() => data?.items.find((x) => x.id === id), [data?.items, id]);
  const [kind, setKind] = useState<VaultItemKind>('login');
  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [website, setWebsite] = useState('');
  const [secret, setSecret] = useState('');
  const [notes, setNotes] = useState('');
  const [favorite, setFavorite] = useState(false);
  const isNew = id === 'new';

  useEffect(() => {
    if (!existing) return;
    setKind(existing.kind); setTitle(existing.title); setUsername(existing.username ?? ''); setPassword(existing.password ?? '');
    setWebsite(existing.website ?? ''); setSecret(existing.secret ?? ''); setNotes(existing.notes ?? ''); setFavorite(Boolean(existing.favorite));
  }, [existing]);

  async function save() {
    if (!title.trim()) return;
    try {
      await upsertItem({ id: isNew ? randomUUID() : id, kind, title: title.trim(), username: username.trim() || undefined, password: password || undefined, website: website.trim() || undefined, secret: secret || undefined, notes: notes.trim() || undefined, favorite });
      router.back();
    } catch {}
  }

  async function makePassword() {
    setPassword(await generatePassword({ length: 24, upper: true, digits: true, symbols: true }));
  }

  function remove() {
    Alert.alert('Eintrag löschen?', 'Dieser Eintrag wird aus dem verschlüsselten Vault entfernt.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: async () => { try { await deleteItem(id); router.back(); } catch {} } },
    ]);
  }

  const clearSeconds = data?.settings.clipboardClearSeconds ?? 30;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Chip title="Passwort" active={kind === 'login'} onPress={() => setKind('login')} />
        <Chip title="Code" active={kind === 'code'} onPress={() => setKind('code')} />
        <Chip title="Sichere Notiz" active={kind === 'note'} onPress={() => setKind('note')} />
      </View>
      <Card>
        <Field label="TITEL" value={title} onChangeText={setTitle} placeholder="z. B. Google" />
        {kind === 'login' && <>
          <Field label="BENUTZERNAME / E-MAIL" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
          <Field label="PASSWORT" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Button title="Generieren" variant="secondary" onPress={makePassword} /></View>
            <View style={{ flex: 1 }}><Button title="Kopieren" variant="secondary" disabled={!password} onPress={() => copySensitive(password, clearSeconds)} /></View>
          </View>
          <Field label="WEBSITE" value={website} onChangeText={setWebsite} autoCapitalize="none" keyboardType="url" placeholder="https://…" />
        </>}
        {kind === 'code' && <>
          <Field label="CODE / RECOVERY-CODE / SECRET" value={secret} onChangeText={setSecret} autoCapitalize="none" autoCorrect={false} multiline />
          <Button title="Code kopieren" variant="secondary" disabled={!secret} onPress={() => copySensitive(secret, clearSeconds)} />
        </>}
        <Field label="NOTIZEN" value={notes} onChangeText={setNotes} multiline numberOfLines={5} style={{ minHeight: 110, textAlignVertical: 'top' }} />
        <Pressable onPress={() => setFavorite((v) => !v)} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 6 }}>
          <Text style={{ color: favorite ? C.yellow : C.muted, fontSize: 22 }}>{favorite ? '★' : '☆'}</Text>
          <Text selectable style={{ color: C.text, fontWeight: '700' }}>Als Favorit markieren</Text>
        </Pressable>
      </Card>
      <Muted>Zwischenablage wird nach {clearSeconds} Sekunden automatisch geleert.</Muted>
      <ErrorBox message={error} />
      <Button title={busy ? 'Speichern …' : 'Speichern'} disabled={busy || !title.trim()} onPress={save} />
      {!isNew && <Button title="Eintrag löschen" variant="danger" disabled={busy} onPress={remove} />}
    </Screen>
  );
}
