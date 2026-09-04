# VaultSecure – Security Architecture

## 1. Schutzwerte

VaultSecure schützt:

- Login-Passwörter
- Benutzernamen / E-Mail-Adressen
- Websites
- sichere Notizen
- Recovery-Codes und sonstige Secrets
- TOTP-Secrets
- Vault-Einstellungen

## 2. Schlüsselhierarchie

### Vault-Key

- 256 Bit zufällig über `expo-crypto`
- verschlüsselt den kompletten `VaultData`-JSON-Container mit AES-GCM
- wird im normalen persistenten Speicher nie unverschlüsselt abgelegt

### Master-Passwort / KEK

- Master-Passwort wird nicht persistiert
- zufälliger Salt pro Schlüsselhülle
- scrypt: N=32768, r=8, p=1, dkLen=32
- der daraus abgeleitete KEK verschlüsselt ausschließlich den Vault-Key

Das erlaubt einen Master-Passwort-Wechsel, ohne jeden einzelnen Vault-Eintrag neu verschlüsseln zu müssen.

### Biometrischer Schlüsselzugriff

Wenn aktiviert, wird eine Base64-Repräsentation des Vault-Keys mit `expo-secure-store` gespeichert und mit `requireAuthentication` geschützt. Auf iOS/Android wird dadurch der jeweilige systemgeschützte Keychain-/Keystore-Mechanismus genutzt. Der Vault selbst bleibt zusätzlich AES-GCM-verschlüsselt.

## 3. Persistenz

### iOS / Android

Der verschlüsselte Envelope wird über `expo-sqlite/kv-store` persistiert. Der gespeicherte Wert besteht aus:

- KDF-Name und Kostenparameter
- zufälligem Salt
- AES-GCM-verschlüsseltem Vault-Key
- AES-GCM-verschlüsseltem Vault-Blob
- Zeitstempel

### Web

Der gleiche verschlüsselte Envelope liegt in `localStorage`. Das ist **kein Ersatz für Kryptografie**; die Vertraulichkeit kommt aus der Envelope-Verschlüsselung. Bei einem XSS-Angriff während eines entsperrten Vaults können Daten im Arbeitsspeicher gefährdet sein. Web muss deshalb über HTTPS und mit kontrollierter Deployment-/Dependency-Kette betrieben werden.

## 4. Backup

- Export enthält nur `VaultEnvelope`.
- Vor lokalen Änderungen werden bis zu fünf ältere verschlüsselte Envelopes als Recovery-Snapshots gehalten.
- Cloud-Backup speichert ebenfalls nur `VaultEnvelope`.
- Das Supabase-Schema nutzt RLS und Ownership-Prüfung über `auth.uid()`.

## 5. TOTP

- QR-Code wird lokal gelesen.
- Nur `otpauth://totp` wird akzeptiert.
- Secrets werden in den verschlüsselten Vault übernommen.
- Unterstützt SHA1, SHA256, SHA512 sowie 6/8 Digits.
- Codes werden lokal berechnet; TOTP-Secrets werden für die Code-Erzeugung nicht an einen Server übertragen.

## 6. Zwischenablage

Kopierte Passwörter/Codes werden nach einer einstellbaren Zeit nur dann geleert, wenn der aktuelle Clipboard-Inhalt noch genau dem zuvor kopierten Wert entspricht. Das verhindert, dass zwischenzeitlich vom Benutzer kopierter anderer Inhalt gelöscht wird.

## 7. Auto-Lock

- Inaktivitätstimer im entsperrten Zustand
- Hintergrundzeit wird erfasst
- nach Überschreiten des Limits werden VaultData und Vault-Key aus dem React-State entfernt

JavaScript-Runtimes bieten keine garantierte sichere Speicherlöschung einzelner Strings. Deshalb ist die wichtigste Grenze das schnelle Verwerfen aller Referenzen beim Lock sowie das Vermeiden persistenter Klartextspeicherung.

## 8. Cloud Threat Model

Ein kompromittierter Cloud-Datenspeicher kann den verschlüsselten Envelope offenlegen. Ein Offline-Angreifer kann anschließend versuchen, das Master-Passwort gegen scrypt zu prüfen. Deshalb ist ein starkes, einzigartiges Master-Passwort zwingend.

Der Cloud-Anbieter kennt nicht:

- Master-Passwort
- unverschlüsselten Vault-Key
- Passwörter im Vault
- TOTP-Secrets im Klartext

## 9. Noch zu auditierende Punkte vor hochkritischem Produktiveinsatz

- vollständige Mobile-Penetrationstests auf iOS und Android
- Web-XSS/CSP-/Supply-Chain-Review
- Dependency Lockfile + SBOM im finalen GitHub-Repository
- KDF-Tuning auf Zielgeräten
- Backup-/Restore-Fuzzing
- SideStore-Build-Reproduzierbarkeit
- Supabase RLS-Tests gegen zwei getrennte Testbenutzer
- unabhängige Kryptografie-Review
