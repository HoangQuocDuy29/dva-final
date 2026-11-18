/**
 * Lightweight, dependency-free request validation.
 * `sanitize()` is a whitelist: unknown keys are dropped (prevents mass assignment).
 */

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const fail = (message: string): never => {
  throw new HttpError(400, message);
};

export type Rule = (value: unknown, key: string) => any;

/** String (trimmed, length-bounded). */
export const S = (max = 200, min = 0): Rule => (v, k) => {
  if (typeof v !== 'string') fail(`${k} must be a string`);
  const t = (v as string).trim();
  if (t.length < min) fail(`${k} must be at least ${min} characters`);
  if (t.length > max) fail(`${k} must be at most ${max} characters`);
  return t;
};

/** Finite number within range. */
export const N = (min: number, max: number): Rule => (v, k) => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) fail(`${k} must be a number`);
  if ((n as number) < min || (n as number) > max) fail(`${k} must be between ${min} and ${max}`);
  return n;
};

/** Integer within range. */
export const I = (min: number, max: number): Rule => (v, k) => {
  const n = N(min, max)(v, k);
  if (!Number.isInteger(n)) fail(`${k} must be an integer`);
  return n;
};

export const B: Rule = (v, k) => {
  if (typeof v !== 'boolean') fail(`${k} must be a boolean`);
  return v;
};

export const E = (values: readonly string[]): Rule => (v, k) => {
  if (typeof v !== 'string' || !values.includes(v)) fail(`${k} must be one of: ${values.join(', ')}`);
  return v;
};

/** URL: http(s), site-relative path, or an inline image data URL. Blocks javascript: etc. */
export const U: Rule = (v, k) => {
  if (typeof v !== 'string') fail(`${k} must be a string`);
  const t = (v as string).trim();
  if (t === '') return '';
  if (t.length > 3_000_000) fail(`${k} is too large`);
  if (!/^(https?:\/\/|\/(?!\/)|data:image\/(png|jpe?g|webp|gif);base64,)/i.test(t)) fail(`${k} must be a valid image URL`);
  return t;
};

export const SA = (maxItems = 30, maxLen = 200): Rule => (v, k) => {
  if (!Array.isArray(v)) return fail(`${k} must be an array`);
  if (v.length > maxItems) fail(`${k} has too many items`);
  return v.map((item) => S(maxLen)(item, k));
};

export const EM: Rule = (v, k) => {
  const t = S(254, 3)(v, k).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) fail(`${k} must be a valid email address`);
  return t;
};

/** Phone number (8-15 digits, optional leading +). Returns the number without separators. */
export const PH: Rule = (v, k) => {
  const t = S(25, 8)(v, k).replace(/[\s.\-()]/g, '');
  if (!/^\+?\d{8,15}$/.test(t)) fail(`${k} must be a valid phone number`);
  return t;
};

export const D: Rule = (v, k) => {
  const t = S(10, 10)(v, k);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) fail(`${k} must be formatted YYYY-MM-DD`);
  const dt = new Date(`${t}T00:00:00Z`);
  if (Number.isNaN(dt.getTime()) || dt.toISOString().slice(0, 10) !== t) fail(`${k} is not a valid date`);
  return t;
};

export const T: Rule = (v, k) => {
  const t = S(5, 4)(v, k);
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) fail(`${k} must be formatted HH:mm`);
  return `${m![1].padStart(2, '0')}:${m![2]}`;
};

export type Schema = Record<string, Rule>;

/**
 * Validate & whitelist `body` against `schema`.
 * @param required keys that must be present (ignored when `partial` is true)
 */
export function sanitize(
  body: unknown,
  schema: Schema,
  opts: { required?: string[]; partial?: boolean } = {}
): Record<string, any> {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) fail('Request body must be a JSON object');
  const src = body as Record<string, unknown>;
  const out: Record<string, any> = {};
  for (const key of Object.keys(schema)) {
    const value = Object.prototype.hasOwnProperty.call(src, key) ? src[key] : undefined;
    if (value === undefined || value === null) continue;
    out[key] = schema[key](value, key);
  }
  if (!opts.partial) {
    for (const key of opts.required ?? []) {
      if (out[key] === undefined) fail(`${key} is required`);
    }
  }
  return out;
}
