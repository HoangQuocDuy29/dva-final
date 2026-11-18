import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Resolve project root regardless of running via tsx (`server/config/`) or esbuild (`dist/`). */
function resolveRootDir(): string {
  const candidates = [
    path.resolve(__dirname, '..', '..'),
    path.resolve(__dirname, '..'),
    process.cwd(),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
  }
  return process.cwd();
}

export const ROOT_DIR = resolveRootDir();
export const DATA_DIR = fs.existsSync(path.join(ROOT_DIR, 'data'))
  ? path.join(ROOT_DIR, 'data')
  : path.join(__dirname, '..', '..', 'data');

dotenv.config({ path: path.join(ROOT_DIR, '.env') });
dotenv.config();

const parsePositiveInt = (raw: string | undefined, fallback: number, max?: number): number => {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  const floored = Math.floor(n);
  return max !== undefined ? Math.min(floored, max) : floored;
};

export const isProd = () => process.env.NODE_ENV === 'production';

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parsePositiveInt(process.env.PORT, 5000, 65535),
  trustProxy: process.env.TRUST_PROXY || '',
  databaseUrl: process.env.DATABASE_URL || '',
  pgPoolMax: parsePositiveInt(process.env.PG_POOL_MAX, 5, 20),
  pgPoolIdleTimeoutMs: parsePositiveInt(process.env.PG_POOL_IDLE_TIMEOUT_MS, 10_000, 120_000),
  jwtExpiresInHours: parsePositiveInt(process.env.JWT_EXPIRES_IN_HOURS, 24, 24 * 30),
  bookingHoldMinutes: parsePositiveInt(process.env.BOOKING_HOLD_MINUTES, 15, 240),
  clientUrls: (process.env.CLIENT_URL || '')
    .split(',')
    .map((u) => u.trim().replace(/\/+$/, ''))
    .filter(Boolean),
  bank: {
    id: process.env.BANK_ID || process.env.VIETQR_BANK_ID || 'MB',
    accountNo: process.env.BANK_ACCOUNT_NO || process.env.VIETQR_ACCOUNT_NO || '0002090671521',
    accountName: process.env.BANK_ACCOUNT_NAME || process.env.VIETQR_ACCOUNT_NAME || 'HOANG QUOC DUY',
  },
  get paymentWebhookApiKey(): string {
    return (
      process.env.PAYMENT_WEBHOOK_API_KEY ||
      process.env.SEPAY_API_KEY ||
      process.env.CASSO_API_KEY ||
      ''
    ).trim();
  },
  get googleSheetsWebhookUrl(): string {
    return (process.env.GOOGLE_SHEETS_WEBHOOK_URL || process.env.GOOGLE_SCRIPT_URL || '').trim();
  },
  get spreadsheetId(): string {
    return (
      process.env.SPREADSHEET_ID ||
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID ||
      '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
    );
  },
  get cloudinary(): { cloudName: string; apiKey: string; apiSecret: string } | null {
    const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
    const apiKey = (process.env.CLOUDINARY_API_KEY || '').trim();
    const apiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();
    if (!cloudName || !apiKey || !apiSecret) return null;
    return { cloudName, apiKey, apiSecret };
  },
};

export const BANK_BENEFICIARY_LABEL = `${env.bank.id} Bank - ${env.bank.accountNo} (${env.bank.accountName})`;

export function getGooglePrivateKey(): string | undefined {
  return process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
}

export function readJsonFileSafe<T>(filename: string, fallback: T): T {
  try {
    const filePath = path.join(DATA_DIR, filename);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
    }
  } catch (err) {
    console.warn(`[JSON Fallback] Could not read data/${filename}:`, err);
  }
  return fallback;
}

/** Validate critical environment variables once at server boot. */
export function validateEnv(): void {
  if (isProd()) {
    const jwt = process.env.JWT_SECRET || '';
    if (!jwt) {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    if (jwt.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters in production');
    }
    if (!env.databaseUrl) {
      console.warn('[Env Warning] DATABASE_URL is not set in production.');
    }
  }
}
