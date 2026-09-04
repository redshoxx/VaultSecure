import React, { useEffect, useMemo, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, View } from 'react-native';
import { parseOtpAuthUri } from '@/src/core/totp';
import { useVault } from '@/src/state/vault-context';
import { Button, Card, Chip, ErrorBox, Field, Muted, Screen } from '@/src/ui/components';
import type { TotpItem } from '@/src/types/vault';

export default function TotpEditor() {
  const { id, scanned } = useLocalSearchParams<{ id?: string; scanned?: string }>();
  const { data, upsertTotp, deleteTotp, busy, error } = useVault();
  const existing = useMemo(() => data?.totp.find((x) => x.id === id), [data?.totp, id]);
  const [issuer, setIssuer] = useState('');
  const [account, setAccount] = useState('');
  const [secret, setSecret] = useState('');
  const [digits, setDigits] = useState<6 | 8>(6);
  const [period, setPeriod] = useState('30');
  const [algorithm, setAlgorithm] = useState<TotpItem['algorithm']>('SHA1');
  const [uri, setUri] = useState('');

  useEffect(() => {
    if (!existing) return;
    setIssuer(existing.issuer);
    setAccount(existing.account);
    setSecret(existing.secret);
    setDigits(existing.digits);
    setPeriod(String(existing.period));
    setAlgorithm(existing.algorithm);
  }, [existing]);

  function applyUri(value: string) {
    const parsed = parseOtpAuthUri(value);
    setUri(value);
    setIssuer(parsed.issuer);
    setAccount(parsed.account);
    setSecret(parsed.secret);
    setDigits(parsed.digits);
    setPeriod(String(parsed.period));
    setAlgorithm(parsed.algorithm);
  }

  useEffect(() => {
    if (!scanned) return;
    try { applyUri(scanned); }
    catch { Alert.alert('QR-Code ungültig', 'Der QR-Code enthält keinen unterstützten TOTP-Eintrag.'); }
  }, [scanned]);

  function importUri() {
    try { applyUri(uri); }
    catch (e) { Alert.alert('URI ungültig', e instanceof Error ? e.message : 'Die URI konnte nicht gelesen werden.'); }
  }

  async function save() {
    if (!issuer.trim() || !secret.trim()) return;
    try {
      await upsertTotp({
        id: existing?.id ?? randomUUID(),
        issuer: issuer.trim(),
        account: account.trim(),
        secret: secret.trim().replace(/\s|-/g, '').toUpperCase(),
        digits,
        period: Math.max(15, Math.min(300, Number(period) || 30)),
        algorithm,
      });
      router.back();
    } catch {}
  }

  function remove() {
    if (!existing) return;
    Alert.alert('2FA-Konto löschen?', 'Das TOTP-Secret wird aus dem Vault entfernt.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: async () => { try { await deleteTotp(existing.id); router.back(); } catch {} } },
    ]);
  }

  return <Screen>
    {!existing && <Card>
      <Button title="2FA QR-Code scannen" onPress={() => router.push('/scan')} />
      <Field label="OTPAUTH:// URI (OPTIONAL)" value={uri} onChangeText={setUri} autoCapitalize="none" autoCorrect={false} placeholder="otpauth://totp/…" />
      <Button title="URI übernehmen" variant="secondary" disabled={!uri.startsWith('otpauth://')} onPress={importUri} />
      <Muted>Alternativ kannst du Issuer, Konto und Base32-Secret manuell eintragen.</Muted>
    </Card>}
    <Card>
      <Field label="ANBIETER / ISSUER" value={issuer} onChangeText={setIssuer} placeholder="Google" />
      <Field label="KONTO" value={account} onChangeText={setAccount} placeholder="name@example.com" autoCapitalize="none" />
      <Field label="BASE32 SECRET" value={secret} onChangeText={setSecret} autoCapitalize="characters" autoCorrect={false} placeholder="JBSWY3DPEHPK3PXP" />
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Chip title="6 Stellen" active={digits === 6} onPress={() => setDigits(6)} />
        <Chip title="8 Stellen" active={digits === 8} onPress={() => setDigits(8)} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {(['SHA1', 'SHA256', 'SHA512'] as const).map((value) => <Chip key={value} title={value} active={algorithm === value} onPress={() => setAlgorithm(value)} />)}
      </View>
      <Field label="INTERVALL IN SEKUNDEN" value={period} onChangeText={setPeriod} keyboardType="number-pad" />
    </Card>
    <ErrorBox message={error} />
    <Button title={busy ? 'Speichern …' : '2FA-Konto speichern'} disabled={busy || !issuer.trim() || !secret.trim()} onPress={save} />
    {existing && <Button title="2FA-Konto löschen" variant="danger" disabled={busy} onPress={remove} />}
  </Screen>;
}
