import { getRandomBytesAsync } from 'expo-crypto';

const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%&*+-_=?:.';

export type PasswordOptions = {
  length: number;
  upper: boolean;
  digits: boolean;
  symbols: boolean;
};

export async function generatePassword(options: PasswordOptions): Promise<string> {
  let alphabet = LOWER;
  if (options.upper) alphabet += UPPER;
  if (options.digits) alphabet += DIGITS;
  if (options.symbols) alphabet += SYMBOLS;
  const length = Math.max(12, Math.min(128, options.length));
  const random = await getRandomBytesAsync(length * 2);
  let result = '';
  for (let i = 0; result.length < length && i < random.length; i += 1) {
    const value = random[i] ?? 0;
    const limit = 256 - (256 % alphabet.length);
    if (value < limit) result += alphabet[value % alphabet.length];
  }
  if (result.length < length) return generatePassword(options);
  return result;
}
