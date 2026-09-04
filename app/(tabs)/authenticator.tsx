import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { copySensitive } from '@/src/core/clipboard';
import { generateTotp } from '@/src/core/totp';
import { useVault } from '@/src/state/vault-context';
import { Card, Muted, Screen, SectionTitle } from '@/src/ui/components';
import { C } from '@/src/ui/theme';

export default function AuthenticatorScreen() {
  const { data } = useVault();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const totps = data?.totp ?? [];
  const clearSeconds = data?.settings.clipboardClearSeconds ?? 30;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}><Muted>TOTP-Codes werden vollständig lokal aus deinen verschlüsselten Secrets erzeugt.</Muted></View>
        <Pressable onPress={() => router.push('/totp')} style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: C.blue2, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: 'white', fontSize: 28 }}>＋</Text></Pressable>
      </View>
      {totps.length === 0 ? <Card style={{ alignItems: 'center', paddingVertical: 34 }}><Text style={{ fontSize: 34 }}>◉</Text><SectionTitle>Noch keine 2FA-Konten</SectionTitle><Muted>Füge das Base32-Secret oder eine otpauth:// URI hinzu.</Muted></Card> : totps.map((item) => {
        let code = '------'; let remaining = 0; let failed = false;
        try { ({ code, remaining } = generateTotp(item.secret, item.digits, item.period, now, item.algorithm)); } catch { failed = true; }
        const grouped = code.replace(/(.{3})/g, '$1 ').trim();
        return (
          <Pressable key={item.id} onPress={() => copySensitive(code, clearSeconds)} onLongPress={() => router.push({ pathname: '/totp', params: { id: item.id } })}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: '#102C4E', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 18 }}>2F</Text></View>
                <View style={{ flex: 1 }}><Text selectable style={{ color: C.text, fontWeight: '800', fontSize: 16 }}>{item.issuer}</Text><Text selectable style={{ color: C.muted, fontSize: 13 }}>{item.account}</Text></View>
                <View style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: remaining <= 5 ? C.red : C.blue, alignItems: 'center', justifyContent: 'center' }}><Text selectable style={{ color: C.muted, fontSize: 11, fontVariant: ['tabular-nums'] }}>{remaining}</Text></View>
              </View>
              <Text selectable style={{ color: failed ? C.red : '#69BCFF', fontSize: 30, fontWeight: '800', letterSpacing: 3, fontVariant: ['tabular-nums'] }}>{failed ? 'Secret ungültig' : grouped}</Text>
              <Muted>Antippen: Code kopieren · Gedrückt halten: bearbeiten</Muted>
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}
