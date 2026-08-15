import test from "node:test";
import assert from "node:assert/strict";
import { createNumericId, createStringId } from "../lib/clientIds.ts";

test("numeric IDs are safe integers and do not collide in a representative batch", () => {
  const ids = Array.from({ length: 2_000 }, createNumericId);

  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => Number.isSafeInteger(id) && id > 0));
});

test("string IDs retain their resource prefix and random UUID payload", () => {
  const id = createStringId("bill");

  assert.match(
    id,
    /^bill_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
});
