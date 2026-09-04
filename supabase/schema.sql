-- VaultSecure cloud-backup schema.
-- The database never receives plaintext passwords, plaintext TOTP secrets,
-- the master password, or the unwrapped vault key. `envelope` is client-side ciphertext.

create table if not exists public.encrypted_vaults (
  user_id uuid primary key references auth.users(id) on delete cascade,
  envelope jsonb not null,
  updated_at timestamptz not null default now(),
  constraint encrypted_vaults_format_check
    check (envelope ->> 'format' = 'vaultsecure-v1')
);

alter table public.encrypted_vaults enable row level security;

revoke all on table public.encrypted_vaults from anon, authenticated;
grant select, insert, update, delete on table public.encrypted_vaults to authenticated;

-- Re-create policies idempotently.
drop policy if exists "vault_select_own" on public.encrypted_vaults;
drop policy if exists "vault_insert_own" on public.encrypted_vaults;
drop policy if exists "vault_update_own" on public.encrypted_vaults;
drop policy if exists "vault_delete_own" on public.encrypted_vaults;

create policy "vault_select_own"
on public.encrypted_vaults
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "vault_insert_own"
on public.encrypted_vaults
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "vault_update_own"
on public.encrypted_vaults
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "vault_delete_own"
on public.encrypted_vaults
for delete
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists encrypted_vaults_updated_at_idx
  on public.encrypted_vaults (updated_at desc);
