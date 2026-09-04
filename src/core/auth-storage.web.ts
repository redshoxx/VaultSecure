const PREFIX = 'vaultsecure.cloud-session.';

export const authStorage = {
  async getItem(key: string): Promise<string | null> {
    return globalThis.localStorage?.getItem(`${PREFIX}${key}`) ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    globalThis.localStorage?.setItem(`${PREFIX}${key}`, value);
  },
  async removeItem(key: string): Promise<void> {
    globalThis.localStorage?.removeItem(`${PREFIX}${key}`);
  },
};
