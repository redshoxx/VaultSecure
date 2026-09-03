# VaultSecure

VaultSecure ist ein plattformübergreifender Passwort- und 2FA-Tresor für iOS, Android und Web. Die App ist so aufgebaut, dass sensible Daten **vor dem Speichern verschlüsselt** werden. Cloud-Backups enthalten ausschließlich die verschlüsselte Vault-Hülle.

## Plattformen

- **iOS**: Expo/EAS Build, SideStore/AltStore-kompatible IPA-Verteilung
- **Android**: APK/AAB über EAS/GitHub Releases
- **Web**: Expo Web, statisch exportierbar und z. B. über Vercel deploybar

## Kernfunktionen

- Passwörter, sichere Notizen und Recovery-Codes
- integrierter TOTP-Authenticator
- QR-Code-Import für TOTP
- Passwortgenerator
- AES-256-GCM verschlüsselter Vault
- Master-Passwort mit scrypt-basierter Schlüsselableitung
- biometrische Schnellentsperrung über Secure Store/Keychain/Keystore
- automatisches Sperren
- Sperre beim Wechsel in den Hintergrund
- Screenshot-/Screen-Recording-Schutz auf Mobilgeräten
- verschlüsselte Backup-Dateien
- Wiederherstellung auf einem neuen Gerät
- fünf rotierende lokale verschlüsselte Recovery-Snapshots
- optionales verschlüsseltes Supabase-Cloud-Backup
- Expo OTA Updates für JS-/UI-Updates
- GitHub Actions für CI, Web und Releases
- SideStore-kompatible `sidestore-source.json`

## Sicherheitsmodell

Der Vault verwendet einen zufällig erzeugten Vault-Key. Dieser Schlüssel wird nicht dauerhaft im Klartext gespeichert. Er wird mit einem aus dem Master-Passwort abgeleiteten Schlüssel geschützt. Während einer entsperrten Sitzung existiert der entschlüsselte Vault-Key nur im Arbeitsspeicher.

Auf Mobilgeräten kann zusätzlich ein Geräteschlüssel im geschützten Betriebssystem-Keystore hinterlegt werden, um Face ID, Touch ID oder Android-Biometrie als Schnellentsperrung zu ermöglichen.

Cloud-Backups speichern ausschließlich das verschlüsselte Vault-Envelope. Der Server benötigt den Master-Key nicht und kann die Vault-Inhalte nicht entschlüsseln.

Weitere Details: [`docs/SECURITY-ARCHITECTURE.md`](docs/SECURITY-ARCHITECTURE.md)

## Lokale Entwicklung

Voraussetzungen:

- Node.js 22+
- npm
- Expo/EAS Account für native Builds

```bash
npm install
npm run start
```

Danach kann die App mit Expo Go bzw. einem Development Build getestet werden.

### Web

```bash
npm run web
```

Produktions-Export:

```bash
npx expo export -p web
```

## Konfiguration

Kopiere `.env.example` nach `.env.local` und trage nur die benötigten öffentlichen Client-Konfigurationen ein:

```bash
cp .env.example .env.local
```

### Supabase

Cloud-Backup ist optional. Ohne Supabase arbeitet VaultSecure vollständig lokal.

Für Cloud-Backup:

1. Supabase-Projekt anlegen.
2. `supabase/schema.sql` ausführen.
3. Publishable Key und Project URL eintragen.
4. E-Mail/Passwort-Auth im Supabase-Projekt aktivieren.

**Keinen `service_role`-/Secret-Key in die App eintragen.** Die mitgelieferten RLS-Regeln beschränken jeden Account auf die eigene `user_id`.

## Builds

### Android APK

```bash
npx eas-cli@latest build -p android --profile preview
```

### iOS IPA

Für eine SideStore-/AltStore-verwendbare IPA muss ein gültiger iOS-Build signiert werden. Apple-/Expo-Credentials werden **nicht** im Repository gespeichert.

```bash
npx eas-cli@latest build -p ios --profile preview
```

### Produktionsbuilds

```bash
npx eas-cli@latest build --profile production
```

## SideStore

Die Datei [`sidestore-source.json`](sidestore-source.json) ist als AltSource vorbereitet. Das Script

```bash
npm run update-source
```

kann Release-Daten aus GitHub-Umgebungsvariablen in die Source-Datei übernehmen.

Für echte automatische SideStore-Updates muss jede neue IPA-Version als GitHub Release verfügbar sein und anschließend in der Source-Datei referenziert werden.

## Android Updates

VaultSecure kann GitHub Releases auf neue App-Versionen prüfen. Ein neues APK kann heruntergeladen werden. Die eigentliche APK-Installation muss bei normalem Android aus Sicherheitsgründen vom Benutzer bestätigt werden.

## Expo OTA Updates

JS-/UI-Änderungen können über Expo Updates verteilt werden, sofern das Expo-Projekt mit EAS initialisiert und der Update-Kanal konfiguriert wurde.

Native Änderungen benötigen weiterhin einen neuen IPA-/APK-Build.

## GitHub Actions

- `.github/workflows/ci.yml`: statische Prüfung
- `.github/workflows/web.yml`: Web-Export
- `.github/workflows/release.yml`: Release-Build-Pipeline

Für EAS-Builds muss im GitHub Repository ein Secret namens `EXPO_TOKEN` eingerichtet werden.

## Wichtiger Hinweis

VaultSecure ist sicherheitskritische Software. Vor einer produktiven Nutzung als einziger Speicher für geschäftskritische oder unwiederbringliche Zugangsdaten sollte ein unabhängiger Security Audit durchgeführt werden.

Backups sollten mindestens an zwei voneinander unabhängigen Orten gespeichert werden. Keine Software kann garantieren, dass Daten unter allen denkbaren Hardware-, Benutzer- und Infrastrukturfehlern niemals verloren gehen.
