import * as Clipboard from 'expo-clipboard';

let clearTimer: ReturnType<typeof setTimeout> | null = null;

export async function copySensitive(value: string, clearAfterSeconds: number): Promise<void> {
  await Clipboard.setStringAsync(value);
  if (clearTimer) clearTimeout(clearTimer);
  if (clearAfterSeconds > 0) {
    clearTimer = setTimeout(async () => {
      try {
        const current = await Clipboard.getStringAsync();
        if (current === value) await Clipboard.setStringAsync('');
      } catch {
        // Clipboard cleanup is best-effort.
      }
    }, clearAfterSeconds * 1000);
  }
}
