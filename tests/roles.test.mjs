import test from "node:test";
import assert from "node:assert/strict";
import { isTripRoleAllowed } from "../lib/roles.ts";

test("trip role checks respect the requested permission boundary", () => {
  assert.equal(isTripRoleAllowed("owner", ["owner", "editor"]), true);
  assert.equal(isTripRoleAllowed("editor", ["owner", "editor"]), true);
  assert.equal(isTripRoleAllowed("viewer", ["owner", "editor"]), false);
});

test("unknown or missing roles are rejected", () => {
  assert.equal(isTripRoleAllowed("admin"), false);
  assert.equal(isTripRoleAllowed(null), false);
  assert.equal(isTripRoleAllowed(undefined), false);
});
