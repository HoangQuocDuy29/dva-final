export interface HoldReleaseManagerOptions {
  /** Execute DB update cancelling expired pending holds; optionally returns affected count. */
  runCleanup: (now: Date) => Promise<number | void>;
  /** Minimum elapsed ms between consecutive successful DB cleanups (prevents query spam under traffic). */
  cooldownMs?: number;
  /** Consecutive-failure backoff schedule in ms. */
  backoffScheduleMs?: readonly number[];
  /** Override backoff in ms when DB reports quota exceeded (Postgres 53000 / Prisma P2039). */
  quotaBackoffMs?: number;
  /** Clock provider (defaults to Date.now) for deterministic unit tests. */
  nowMs?: () => number;
  /** Concise logger invoked at most once per backoff window when DB cleanup fails. */
  onError?: (err: unknown, backoffMs: number, consecutiveFailures: number) => void;
}

export interface DatabaseCircuitBreakerOptions {
  /** Duration in ms to short-circuit queries after a transient connection drop (default: 20s). */
  transientOpenMs?: number;
  /** Duration in ms to short-circuit queries after a quota exceeded error (default: 60s). */
  quotaOpenMs?: number;
  /** Clock provider for deterministic unit tests. */
  nowMs?: () => number;
  /** Logger callback fired once each time the circuit opens/extends. */
  onTrip?: (err: unknown, openDurationMs: number, isQuota: boolean) => void;
}

const DEFAULT_COOLDOWN_MS = 15_000;
const DEFAULT_BACKOFF_SCHEDULE_MS = [30_000, 60_000, 300_000, 900_000] as const;
const DEFAULT_QUOTA_BACKOFF_MS = 900_000;

export function isDatabaseQuotaError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const anyErr = err as Record<string, any>;
  const driverCauseCode = anyErr.meta?.driverAdapterError?.cause?.code;
  const msg = String(anyErr.message || anyErr.meta?.driverAdapterError?.message || '').toLowerCase();
  return (
    anyErr.code === '53000' ||
    driverCauseCode === '53000' ||
    msg.includes('exceeded the quota') ||
    msg.includes('code: `53000`') ||
    (anyErr.code === 'P2039' && msg.includes('quota'))
  );
}

export function isDatabaseUnavailableError(err: unknown): boolean {
  if (isDatabaseQuotaError(err)) return true;
  if (!err || typeof err !== 'object') return false;
  const anyErr = err as Record<string, any>;
  const code = String(anyErr.code || anyErr.meta?.driverAdapterError?.cause?.code || '');
  if (['P1001', 'P1002', 'P1017', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(code)) {
    return true;
  }
  const msg = String(anyErr.message || anyErr.meta?.driverAdapterError?.message || '');
  return /Can't reach database server|Connection terminated|connect ECONNREFUSED|timeout exceeded when trying to connect/i.test(
    msg
  );
}

export function extractConciseErrorMessage(err: unknown): string {
  if (!err || typeof err !== 'object') return String(err ?? 'Unknown database error');
  const anyErr = err as Record<string, any>;
  const driverMsg = anyErr.meta?.driverAdapterError?.message;
  if (typeof driverMsg === 'string' && driverMsg.trim()) return driverMsg.trim();
  const rawMsg = typeof anyErr.message === 'string' ? anyErr.message : '';
  const singleLine = rawMsg
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .pop();
  return singleLine || 'Database unavailable';
}

/**
 * Global database circuit breaker: when Neon/PostgreSQL reports quota exhaustion (`53000` / `P2039`)
 * or connection outage (`P1001`/`ECONNREFUSED`), fails fast with HTTP 503 during cooldown so logs
 * and connection pools are not flooded on every incoming request, then auto-probes once cooled down.
 */
export function createDatabaseCircuitBreaker(options: DatabaseCircuitBreakerOptions = {}) {
  const transientOpenMs = options.transientOpenMs ?? 20_000;
  const quotaOpenMs = options.quotaOpenMs ?? 60_000;
  const nowMs = options.nowMs ?? (() => Date.now());

  let openUntil = 0;
  let lastReason = '';
  let lastIsQuota = false;

  const isOpen = (): boolean => nowMs() < openUntil;

  /** Returns whether DB call is allowed (`CLOSED`, or cooldown elapsed for half-open probe). */
  const canAttempt = (): { allowed: boolean; wasHalfOpen: boolean; retryAfterSec: number } => {
    const now = nowMs();
    if (openUntil === 0) return { allowed: true, wasHalfOpen: false, retryAfterSec: 0 };
    if (now < openUntil) {
      return {
        allowed: false,
        wasHalfOpen: false,
        retryAfterSec: Math.max(1, Math.ceil((openUntil - now) / 1000)),
      };
    }
    return { allowed: true, wasHalfOpen: true, retryAfterSec: 0 };
  };

  const trip = (err: unknown): boolean => {
    if (!isDatabaseUnavailableError(err)) return false;
    const isQuota = isDatabaseQuotaError(err);
    const duration = isQuota ? quotaOpenMs : transientOpenMs;
    const now = nowMs();
    const shouldLog = now >= openUntil || (isQuota && !lastIsQuota);

    openUntil = now + duration;
    lastIsQuota = isQuota;
    lastReason = extractConciseErrorMessage(err);

    if (shouldLog) {
      if (options.onTrip) {
        options.onTrip(err, duration, isQuota);
      } else {
        const secs = Math.round(duration / 1000);
        console.warn(
          `[Database Circuit] OPEN for ${secs}s (${isQuota ? 'Quota Exceeded 53000/P2039' : 'Connection Unavailable'}): ${lastReason}`
        );
      }
    }
    return true;
  };

  const markSuccess = (): void => {
    if (openUntil !== 0) {
      openUntil = 0;
      lastIsQuota = false;
      lastReason = '';
      console.info('[Database Circuit] CLOSED — database connectivity restored.');
    }
  };

  return {
    isOpen,
    canAttempt,
    trip,
    markSuccess,
    getState: () => ({
      state: isOpen() ? ('OPEN' as const) : ('CLOSED' as const),
      openUntil,
      isQuotaExhausted: isOpen() && lastIsQuota,
      lastReason,
    }),
  };
}

/**
 * On-demand single-flight manager for releasing expired unpaid booking holds.
 * Replaces 24/7 background polling so serverless PostgreSQL (Neon) can auto-suspend when idle,
 * while coalescing burst traffic via cooldown and silencing error storms via exponential backoff.
 */
export function createHoldReleaseManager(options: HoldReleaseManagerOptions) {
  const cooldownMs = options.cooldownMs ?? DEFAULT_COOLDOWN_MS;
  const backoffSchedule = options.backoffScheduleMs ?? DEFAULT_BACKOFF_SCHEDULE_MS;
  const quotaBackoffMs = options.quotaBackoffMs ?? DEFAULT_QUOTA_BACKOFF_MS;
  const nowMs = options.nowMs ?? (() => Date.now());

  let inFlight: Promise<void> | null = null;
  let lastSuccessAt = 0;
  let consecutiveFailures = 0;
  let backoffUntil = 0;

  const releaseExpiredHolds = async (): Promise<void> => {
    const now = nowMs();

    // Respect error backoff & success cooldown in memory with 0 DB queries
    if (now < backoffUntil) return;
    if (lastSuccessAt > 0 && now - lastSuccessAt < cooldownMs) return;

    if (inFlight) return inFlight;

    inFlight = (async () => {
      try {
        await options.runCleanup(new Date(now));
        lastSuccessAt = nowMs();
        consecutiveFailures = 0;
        backoffUntil = 0;
      } catch (err) {
        consecutiveFailures += 1;
        const scheduleIdx = Math.min(consecutiveFailures - 1, backoffSchedule.length - 1);
        const computedDelay = isDatabaseQuotaError(err)
          ? Math.max(quotaBackoffMs, backoffSchedule[scheduleIdx])
          : backoffSchedule[scheduleIdx];
        backoffUntil = nowMs() + computedDelay;

        if (options.onError) {
          options.onError(err, computedDelay, consecutiveFailures);
        } else {
          const secs = Math.round(computedDelay / 1000);
          console.warn(
            `[Bookings] Skipped expired-hold cleanup (backing off ${secs}s): ${extractConciseErrorMessage(err)}`
          );
        }
      } finally {
        inFlight = null;
      }
    })();

    return inFlight;
  };

  return {
    releaseExpiredHolds,
    getState: () => ({
      lastSuccessAt,
      consecutiveFailures,
      backoffUntil,
      isInFlight: inFlight !== null,
    }),
  };
}
