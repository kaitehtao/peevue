import test from "node:test";
import assert from "node:assert/strict";
import { accountError, displayName } from "../lib/account.ts";

test("profile display names tolerate absent or malformed provider metadata", () => {
  assert.equal(displayName({ role: "admin" }), "");
  assert.equal(displayName(undefined), "");
  assert.equal(displayName("  Bathroom explorer  "), "Bathroom explorer");
  assert.equal(displayName("x".repeat(100)).length, 50);
});
test("account failures distinguish missing email delivery from invalid credentials", () => {
  assert.match(accountError({ code: "email_address_not_authorized" }), /Account emails are not available/);
  assert.match(accountError({ message: "Error sending confirmation email" }), /Account emails are not available/);
  assert.match(accountError({ code: "email_not_confirmed" }), /confirm your email/);
  assert.match(accountError({ code: "invalid_credentials" }), /email or password is incorrect/);
});
