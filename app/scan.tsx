import React, { useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Button, Card, Muted, Screen, SectionTitle } from '@/src/ui/components';
import { C } from '@/src/ui/theme';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  if (!permission.granted) return <Screen contentStyle={{ justifyContent: 'center' }}><Card><SectionTitle>Kamerazugriff</SectionTitle><Muted>Die Kamera wird nur zum Lesen des TOTP-QR-Codes verwendet. Es werden keine Bilder gespeichert oder hochgeladen.</Muted><Button title="Kamera erlauben" onPress={() => requestPermission()} /></Card></Screen>;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : ({ data }) => {
          if (!data.startsWith('otpauth://')) return;
          setScanned(true);
          router.replace({ pathname: '/totp', params: { scanned: data } });
        }}
      />
      <View pointerEvents="none" style={{ position: 'absolute', top: '22%', left: '12%', right: '12%', height: 280, borderWidth: 3, borderColor: '#63B5FF', borderRadius: 26 }} />
      <View style={{ position: 'absolute', left: 18, right: 18, bottom: 28, backgroundColor: 'rgba(5,10,18,0.92)', padding: 16, borderRadius: 16, gap: 6 }}>
        <Text selectable style={{ color: C.text, fontWeight: '800', fontSize: 17 }}>TOTP-QR-Code in den Rahmen halten</Text>
        <Text selectable style={{ color: C.muted, lineHeight: 19 }}>VaultSecure akzeptiert nur `otpauth://totp` QR-Codes.</Text>
      </View>
    </View>
  );
}
