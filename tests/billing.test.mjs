import test from "node:test";
import assert from "node:assert/strict";
import {
  getDaysUntilBilling,
  getNextBillingDate,
  isOriginalBillingDatePast,
} from "../lib/billing.ts";

test("a stale monthly bill advances to the next upcoming occurrence", () => {
  const next = getNextBillingDate("2024-01-15", "Monthly", new Date(2026, 7, 10));

  assert.deepEqual(next, new Date(2026, 7, 15));
  assert.equal(getDaysUntilBilling("2024-01-15", "Monthly", new Date(2026, 7, 10)), 5);
});

test("month-end billing clamps to the last valid day", () => {
  assert.deepEqual(
    getNextBillingDate("2026-01-31", "Monthly", new Date(2026, 1, 1)),
    new Date(2026, 1, 28),
  );
});

test("yearly billing also rolls forward and invalid dates fail safely", () => {
  assert.deepEqual(
    getNextBillingDate("2024-08-15", "Yearly", new Date(2026, 7, 15)),
    new Date(2026, 7, 15),
  );
  assert.equal(getNextBillingDate("2026-02-31", "Monthly"), null);
  assert.equal(isOriginalBillingDatePast("2024-08-15", new Date(2026, 7, 15)), true);
});
