const MAX_HIGH_BITS = 0x1fffff;

export function createNumericId(): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const values = new Uint32Array(2);
    crypto.getRandomValues(values);
    const high = values[0] & MAX_HIGH_BITS;
    return Math.max(1, high * 2 ** 32 + values[1]);
  }

  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

export function createStringId(prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${createNumericId()}`;
}
