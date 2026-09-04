import React, { useEffect, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { copySensitive } from '@/src/core/clipboard';
import { generatePassword } from '@/src/core/password-generator';
import { useVault } from '@/src/state/vault-context';
import { Button, Card, Muted, Screen, SectionTitle } from '@/src/ui/components';
import { C } from '@/src/ui/theme';

function ToggleRow({ title, value, onValueChange }: { title: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Text selectable style={{ color: C.text, flex: 1, fontWeight: '700' }}>{title}</Text><Switch value={value} onValueChange={onValueChange} /></View>;
}

export default function GeneratorScreen() {
  const { data } = useVault();
  const [length, setLength] = useState(24); const [upper, setUpper] = useState(true); const [digits, setDigits] = useState(true); const [symbols, setSymbols] = useState(true); const [password, setPassword] = useState('');
  async function regenerate() { setPassword(await generatePassword({ length, upper, digits, symbols })); }
  useEffect(() => { regenerate().catch(() => undefined); }, []);
  const clearSeconds = data?.settings.clipboardClearSeconds ?? 30;
  return <Screen>
    <Card>
      <SectionTitle>Passwortlänge</SectionTitle>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => setLength((v) => Math.max(12, v - 2))} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.panel2, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: C.text, fontSize: 25 }}>−</Text></Pressable>
        <Text selectable style={{ color: C.text, fontSize: 30, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{length}</Text>
        <Pressable onPress={() => setLength((v) => Math.min(64, v + 2))} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.panel2, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: C.text, fontSize: 25 }}>＋</Text></Pressable>
      </View>
      <ToggleRow title="Großbuchstaben" value={upper} onValueChange={setUpper} />
      <ToggleRow title="Zahlen" value={digits} onValueChange={setDigits} />
      <ToggleRow title="Sonderzeichen" value={symbols} onValueChange={setSymbols} />
    </Card>
    <Card>
      <Text selectable style={{ color: '#78C2FF', fontSize: 22, lineHeight: 32, fontWeight: '800', letterSpacing: 1 }}>{password}</Text>
      <Muted>Die Zufallswerte werden kryptografisch sicher auf dem Gerät erzeugt.</Muted>
    </Card>
    <Button title="Neu generieren" onPress={regenerate} />
    <Button title="Passwort kopieren" variant="secondary" disabled={!password} onPress={() => copySensitive(password, clearSeconds)} />
  </Screen>;
}
