# VaultSecure

VaultSecure ist ein plattformübergreifender Passwort- und 2FA-Tresor für **iPhone/iPad**, **Android** und **Web**. Der Vault wird bereits auf dem Endgerät verschlüsselt; Backups und optionale Cloud-Sicherung enthalten ausschließlich den verschlüsselten Datencontainer.

## Funktionen

- Passwörter und Logins
- Sichere Notizen, Recovery-Codes und sonstige Secrets
- Integrierter TOTP-Authenticator mit QR-Scanner
- TOTP SHA-1, SHA-256 und SHA-512, 6/8 Stellen, konfigurierbares Intervall
- Kryptographisch sicherer Passwortgenerator
- AES-256-GCM verschlüsselter Vault
- scrypt-basierte Master-Passwort-KDF
- Biometrisches Entsperren über iOS Keychain / Android Keystore
- Screenshot-/Screen-Recording-Schutz und geschützte App-Switcher-Vorschau auf iOS/Android
- Automatische Sperre bei Inaktivität; beim Wechsel in den Hintergrund wird sofort gesperrt
- Zwischenablage wird nach konfigurierbarer Zeit geleert
- Verschlüsselter Backup-Export und -Import
- 5 rotierende lokale, weiterhin verschlüsselte Recovery-Snapshots
- Optionales Zero-Knowledge-Cloud-Backup via Supabase + RLS
- Web-Version mit demselben verschlüsselten Vault-Format
- Expo Updates für OTA-JavaScript-Updates nach EAS-Konfiguration
- GitHub Releases für IPA/APK/Web-Pakete
- SideStore-kompatible AltSource (`sidestore-source.json`)

## Sicherheitsmodell

VaultSecure erzeugt beim Erstellen eines Tresors einen zufälligen 256-Bit-Vault-Key. Das Master-Passwort wird **nicht gespeichert**. Stattdessen wird daraus mit scrypt ein Key-Encryption-Key abgeleitet, der nur den Vault-Key verschlüsselt. Der eigentliche Vault wird mit AES-256-GCM verschlüsselt.

```text
Master-Passwort
      │
      ├─ scrypt + zufälliger Salt ──> KEK
      │                              │
      │                              └─ AES-256-GCM ──> verschlüsselter Vault-Key
      │
zufälliger Vault-Key ── AES-256-GCM ──> Passwörter / Notizen / TOTP-Secrets
                                             │
                                             ├─ lokaler verschlüsselter Vault
                                             ├─ verschlüsselte Backup-Datei
                                             └─ optional: verschlüsseltes Cloud-Backup
```

Bei biometrischem Entsperren wird **nur der Vault-Key** im systemgeschützten Secure Store gespeichert und durch Face ID/Touch ID/Biometrie geschützt. Der Vault-Key befindet sich im entsperrten Zustand zusätzlich im Arbeitsspeicher und wird beim Sperren aus dem React-State entfernt.

Weitere Details: [`docs/SECURITY-ARCHITECTURE.md`](docs/SECURITY-ARCHITECTURE.md)

## Voraussetzungen

- Node.js 22+
- npm
- Expo / EAS Account nur für EAS Build bzw. Expo Updates
- Für die iOS-IPA-Erstellung über GitHub Actions: kein lokaler Mac erforderlich
- SideStore auf dem iPhone für die Installation der IPA

## Lokal starten

```bash
npm install
npm run start
```

Web:

```bash
npm run web
```

Android über Expo Go während der Entwicklung:

```bash
npm run android
```

> Face ID ist in Expo Go eingeschränkt. Für den vollständigen biometrischen Test eine eigene Development-/Release-Build verwenden.

## Cloud-Backup mit Supabase

Cloud ist optional. Ohne Supabase funktioniert VaultSecure vollständig lokal inklusive Backup-Dateien.

1. Supabase-Projekt anlegen.
2. In Supabase SQL Editor den Inhalt von `supabase/schema.sql` ausführen.
3. `.env.example` nach `.env` kopieren.
4. Projekt-URL und **Publishable Key** eintragen.

```env
EXPO_PUBLIC_SUPABASE_URL=https://DEIN_PROJEKT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
EXPO_PUBLIC_GITHUB_OWNER=DEIN_GITHUB_NAME
EXPO_PUBLIC_GITHUB_REPO=VaultSecure
```

**Keinen `service_role`-/Secret-Key in die App eintragen.** Die mitgelieferten RLS-Regeln beschränken jeden Account auf die eigene `user_id`.

Cloud-Backup ist bewusst kein Klartext-Sync: Supabase erhält nur das bereits clientseitig verschlüsselte `VaultEnvelope`.

## Automatische OTA-Updates

Für JavaScript-/UI-Updates nutzt das Projekt `expo-updates`. Einmalig:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest update:configure
```

Danach kann ein kompatibles Update veröffentlicht werden:

```bash
npx eas-cli@latest update --channel production --message "VaultSecure Update"
```

`runtimeVersion` ist auf die App-Version gekoppelt. Änderungen an nativen Modulen, Berechtigungen oder nativer Konfiguration benötigen daher eine neue IPA/APK-Version.

## Android APK + GitHub Releases

Einmalig EAS konfigurieren und einen Expo Access Token als GitHub Secret `EXPO_TOKEN` hinterlegen. Danach erzeugt ein Git-Tag automatisch das signierte APK zusammen mit IPA und Web-ZIP:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Die Release-Pipeline liegt in `.github/workflows/release.yml`.

Für Android-Updates muss über alle Versionen dieselbe Signatur verwendet werden. EAS Credentials übernimmt diese Aufgabe. Android verlangt bei APK-Installationen außerhalb des Play Stores weiterhin die vom Betriebssystem vorgesehene Benutzerbestätigung.

## iPhone / SideStore

Der Release-Workflow erzeugt auf einem macOS-GitHub-Runner eine **unsigned IPA**. SideStore signiert sie bei der Installation mit den für SideStore verfügbaren Benutzer-Credentials neu.

Nach dem ersten Release wird `sidestore-source.json` automatisch um die neue Version erweitert. Die Source-URL lautet dann:

```text
https://raw.githubusercontent.com/DEIN_GITHUB_NAME/VaultSecure/main/sidestore-source.json
```

Oder als SideStore-Deep-Link:

```text
sidestore://source?url=https://raw.githubusercontent.com/DEIN_GITHUB_NAME/VaultSecure/main/sidestore-source.json
```

SideStore kann dadurch neue IPA-Versionen als Updates erkennen. iOS kontrolliert jedoch weiterhin Signierung, Refresh und Installation; eine beliebige vollständig stille Selbstinstallation durch die App ist nicht vorgesehen.

## Web-Version

Statischer Export:

```bash
npm run export:web
```

Ausgabe: `dist/`

`vercel.json` ist bereits enthalten. Auf Vercel dieselben `EXPO_PUBLIC_*` Variablen konfigurieren. Die Web-Version sollte ausschließlich über HTTPS betrieben werden, da der Browser-Kryptografie-Stack eine sichere Umgebung voraussetzt.

## GitHub neu anlegen

Dieses Paket ist bereits als Git-Repository vorbereitet. Nach dem Erstellen eines leeren GitHub-Repositories:

```bash
git remote add origin https://github.com/DEIN_GITHUB_NAME/VaultSecure.git
git branch -M main
git push -u origin main
```

Danach in GitHub unter **Settings → Secrets and variables → Actions** `EXPO_TOKEN` eintragen, falls automatisierte signierte Android-Releases gewünscht sind.

## Backup-Empfehlung

Kein System kann technisch garantieren, dass Daten unter allen Umständen niemals verloren gehen. Für einen Passwort-Tresor sollte mindestens gelten:

1. lokaler verschlüsselter Vault,
2. aktiviertes verschlüsseltes Cloud-Backup **oder** regelmäßig exportierte `.vaultsecure`-Datei,
3. eine zweite Kopie der Backup-Datei auf einem anderen Gerät/Datenträger,
4. Master-Passwort getrennt und sicher aufbewahren.

Eine Backup-Datei kann ohne das dazugehörige Master-Passwort nicht entschlüsselt werden.

## Wichtiger Produktionshinweis

Der Code ist als vollständige, funktionsfähige Implementierung aufgebaut, aber ein Passwortmanager ist Hochrisiko-Software. Vor dem Einsatz als alleiniger Tresor für geschäftskritische oder irreversible Zugangsdaten sollte ein unabhängiges Security-Audit inklusive Dependency-, Mobile-, Web- und Kryptografie-Review durchgeführt werden. Siehe [`SECURITY.md`](SECURITY.md).
