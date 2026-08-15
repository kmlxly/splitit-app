import "server-only";

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

const globalRateLimit = globalThis as typeof globalThis & {
  __kmlxlyRateLimits?: Map<string, Bucket>;
};

const buckets =
  globalRateLimit.__kmlxlyRateLimits ??
  (globalRateLimit.__kmlxlyRateLimits = new Map<string, Bucket>());

export function takeRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
) {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;

  if (buckets.size > 10_000) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  return {
    allowed: true,
    remaining: limit - current.count,
    retryAfterSeconds: 0,
  };
}
