import React, { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useVault } from '@/src/state/vault-context';
import { Card, Chip, Muted, Screen, SectionTitle } from '@/src/ui/components';
import { C } from '@/src/ui/theme';
import type { VaultItemKind } from '@/src/types/vault';

const labels: Record<VaultItemKind, string> = { login: 'Passwort', note: 'Notiz', code: 'Code' };

export default function VaultScreen() {
  const { data } = useVault();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | VaultItemKind>('all');

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.items ?? [])
      .filter((item) => filter === 'all' || item.kind === filter)
      .filter((item) => !q || [item.title, item.username, item.website, item.notes].some((v) => v?.toLowerCase().includes(q)))
      .sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)) || b.updatedAt.localeCompare(a.updatedAt));
  }, [data?.items, filter, query]);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Vault durchsuchen …"
          placeholderTextColor="#607086"
          style={{ flex: 1, backgroundColor: C.panel, borderColor: C.border, borderWidth: 1, color: C.text, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11 }}
        />
        <Pressable onPress={() => router.push('/item/new')} style={{ width: 48, borderRadius: 14, backgroundColor: C.blue2, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: 'white', fontSize: 28 }}>＋</Text></Pressable>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Chip title="Alle" active={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip title="Passwörter" active={filter === 'login'} onPress={() => setFilter('login')} />
        <Chip title="Codes" active={filter === 'code'} onPress={() => setFilter('code')} />
        <Chip title="Notizen" active={filter === 'note'} onPress={() => setFilter('note')} />
      </View>
      {items.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: 36 }}>
          <Text style={{ fontSize: 34 }}>🔐</Text>
          <SectionTitle>{query ? 'Keine Treffer' : 'Dein Vault ist leer'}</SectionTitle>
          <Muted>{query ? 'Passe die Suche oder den Filter an.' : 'Lege dein erstes Passwort, einen Code oder eine sichere Notiz an.'}</Muted>
        </Card>
      ) : items.map((item) => (
        <Pressable key={item.id} onPress={() => router.push(`/item/${item.id}`)}>
          <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: item.kind === 'login' ? '#102C4E' : item.kind === 'code' ? '#2D234A' : '#17352A', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20 }}>{item.kind === 'login' ? '🔑' : item.kind === 'code' ? '⌘' : '✎'}</Text>
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text selectable style={{ color: C.text, fontSize: 16, fontWeight: '800' }}>{item.favorite ? '★ ' : ''}{item.title}</Text>
              <Text selectable numberOfLines={1} style={{ color: C.muted, fontSize: 13 }}>{item.username || item.website || labels[item.kind]}</Text>
            </View>
            <Text style={{ color: C.muted, fontSize: 22 }}>›</Text>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
