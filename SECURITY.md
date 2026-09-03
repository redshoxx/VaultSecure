# Security Policy

VaultSecure verarbeitet besonders sensible Daten. Sicherheitsprobleme sollten nicht als öffentliches GitHub-Issue mit reproduzierbaren Secrets, echten Backups oder Zugangsdaten veröffentlicht werden.

## Keine echten Secrets in Tickets oder Logs

Niemals hochladen oder posten:

- echte `.vaultsecure` Backups
- Master-Passwörter
- TOTP-Secrets / QR-Codes
- Supabase Secret-/Service-Role-Keys
- Android Signing Keys
- Apple Credentials oder Provisioning Profiles

## Produktionsfreigabe

Vor einer Verwendung als alleiniger Speicher für kritische Konten wird ein unabhängiges Security-Audit empfohlen. Der Repository-Code enthält bewusst keine Behauptung, dass Daten unter allen denkbaren Fehlerfällen garantiert nie verloren gehen können.

## Dependency Handling

Nach dem ersten `npm install` sollte `package-lock.json` committed und bei Releases unverändert aus CI verwendet werden. Renovate/Dependabot und regelmäßige `npm audit`-/SCA-Prüfungen sind empfohlen.
