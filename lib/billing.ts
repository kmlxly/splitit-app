export type BillingCycle = "Monthly" | "Yearly";

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  date.setHours(0, 0, 0, 0);
  return date;
}

function occurrenceDate(anchor: Date, occurrence: number, monthStep: number): Date {
  const targetMonth = anchor.getMonth() + occurrence * monthStep;
  const year = anchor.getFullYear() + Math.floor(targetMonth / 12);
  const month = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(year, month + 1, 0).getDate();

  return new Date(year, month, Math.min(anchor.getDate(), lastDay));
}

export function getNextBillingDate(
  dateValue: string,
  cycle: BillingCycle,
  from = new Date(),
): Date | null {
  const anchor = parseDateOnly(dateValue);
  if (!anchor) return null;

  const today = new Date(from);
  today.setHours(0, 0, 0, 0);
  if (anchor >= today) return anchor;

  const monthStep = cycle === "Monthly" ? 1 : 12;
  const monthDistance =
    (today.getFullYear() - anchor.getFullYear()) * 12 +
    today.getMonth() -
    anchor.getMonth();
  let occurrence = Math.max(1, Math.floor(monthDistance / monthStep));
  let candidate = occurrenceDate(anchor, occurrence, monthStep);

  while (candidate < today) {
    occurrence += 1;
    candidate = occurrenceDate(anchor, occurrence, monthStep);
  }

  return candidate;
}

export function getDaysUntilBilling(
  dateValue: string,
  cycle: BillingCycle,
  from = new Date(),
): number | null {
  const nextDate = getNextBillingDate(dateValue, cycle, from);
  if (!nextDate) return null;

  const today = new Date(from);
  today.setHours(0, 0, 0, 0);
  return Math.ceil((nextDate.getTime() - today.getTime()) / DAY_MS);
}

export function isOriginalBillingDatePast(dateValue: string, from = new Date()): boolean {
  const date = parseDateOnly(dateValue);
  if (!date) return false;

  const today = new Date(from);
  today.setHours(0, 0, 0, 0);
  return date < today;
}
