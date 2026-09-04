import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { authStorage } from '@/src/core/auth-storage';
import type { VaultEnvelope } from '@/src/types/vault';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient | null = null;

export function cloudConfigured(): boolean {
  return Boolean(url && key && !url.includes('YOUR_PROJECT') && !key.includes('REPLACE_ME'));
}

export function getSupabase(): SupabaseClient {
  if (!cloudConfigured()) throw new Error('Cloud-Backup ist noch nicht konfiguriert.');
  if (!client) {
    client = createClient(url!, key!, {
      auth: {
        storage: authStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: process.env.EXPO_OS === 'web',
      },
    });
  }
  return client;
}

export async function signInCloud(email: string, password: string): Promise<void> {
  const { error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpCloud(email: string, password: string): Promise<void> {
  const { error } = await getSupabase().auth.signUp({ email, password });
  if (error) throw error;
}

export async function signOutCloud(): Promise<void> {
  if (!cloudConfigured()) return;
  const { error } = await getSupabase().auth.signOut();
  if (error) throw error;
}

export async function cloudUserEmail(): Promise<string | null> {
  if (!cloudConfigured()) return null;
  const { data } = await getSupabase().auth.getUser();
  return data.user?.email ?? null;
}

export async function uploadEncryptedBackup(envelope: VaultEnvelope): Promise<void> {
  const supabase = getSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Für Cloud-Backup zuerst anmelden.');
  const { error } = await supabase.from('encrypted_vaults').upsert({
    user_id: userData.user.id,
    envelope,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function downloadEncryptedBackup(): Promise<VaultEnvelope | null> {
  const supabase = getSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Für Cloud-Wiederherstellung zuerst anmelden.');
  const { data, error } = await supabase
    .from('encrypted_vaults')
    .select('envelope')
    .eq('user_id', userData.user.id)
    .maybeSingle();
  if (error) throw error;
  return (data?.envelope as VaultEnvelope | undefined) ?? null;
}
