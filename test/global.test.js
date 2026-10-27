import { test } from "node:test";
import assert from "node:assert/strict";
import { types, values, makeCard } from "./helpers.js";

test("emails, plain and disguised", () => {
  assert.deepEqual(values("mail rahul.sharma@gmail.com", "EMAIL"), ["rahul.sharma@gmail.com"]);
  assert.deepEqual(values("rahul dot sharma at gmail dot com", "EMAIL"), ["rahul dot sharma at gmail dot com"]);
  assert.deepEqual(values("write to priya[at]yahoo[dot]co.in", "EMAIL"), ["priya[at]yahoo[dot]co.in"]);
  assert.deepEqual(types("meet at the office"), []);
});

test("cards (Luhn, RuPay), CVV and expiry", () => {
  assert.deepEqual(types("card 4111 1111 1111 1111 exp 12/27 cvv 123"), ["CREDIT_CARD", "CARD_EXPIRY", "CVV"]);
  assert.deepEqual(types(`rupay ${makeCard("652212345678901")}`), ["CREDIT_CARD"]);
  assert.deepEqual(types("card 4111 1111 1111 1112"), []);
});

test("international phones, but not +91 twice", () => {
  assert.deepEqual(types("US office (415) 555-0132"), ["PHONE"]);
  assert.deepEqual(types("call +44 20 7946 0958"), ["PHONE"]);
  assert.deepEqual(types("call +91 91234 56780"), ["PHONE_IN"]);
});

test("IBAN, SSN, IP, MAC", () => {
  assert.deepEqual(types("IBAN GB82 WEST 1234 5698 7654 32"), ["IBAN"]);
  assert.deepEqual(types("SSN 123-45-6789"), ["SSN"]);
  assert.deepEqual(types("server 10.0.12.7"), ["IP_ADDRESS"]);
  assert.deepEqual(types("version 1.2.3.4"), []);
  assert.deepEqual(types("mac 00:1A:2B:3C:4D:5E"), ["MAC_ADDRESS"]);
});

test("secrets", () => {
  assert.deepEqual(types("key sk-proj-abc123def456ghi789jkl012mno345pqr"), ["API_KEY"]);
  assert.deepEqual(types("rzp_live_AbCdEf12345678"), ["API_KEY"]);
  assert.deepEqual(types("AKIAIOSFODNN7EXAMPLE"), ["API_KEY"]);
  assert.deepEqual(types("postgres://admin:s3cret@db.example.in:5432/app"), ["CONNECTION_STRING"]);
  assert.deepEqual(types("Authorization: Bearer abcdefghijklmnopqrstuvwxyz123456"), ["BEARER_TOKEN"]);
  assert.deepEqual(
    types("token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U"),
    ["JWT"]
  );
});

test("everyday business text has no PII", () => {
  for (const t of [
    "Order #123456789 total Rs 4500 on 12/05/2024",
    "Sprint 2024 meeting at 10:30, ticket 9876",
    "Invoice INV-2024-0042 is due in 30 days",
    "Version 2.4.1 fixes 12 bugs",
    "Revenue grew 18% to ₹4,52,000 in Q3",
    "Train 12951 leaves at 16:55 from platform 3",
  ]) {
    assert.deepEqual(types(t), [], t);
  }
});

test("social profile links", () => {
  assert.deepEqual(types("LinkedIn: linkedin.com/in/sneha-k"), ["SOCIAL_PROFILE"]);
  assert.deepEqual(types("chat on https://wa.me/919123456780"), ["SOCIAL_PROFILE"]);
  assert.deepEqual(types("see https://github.com/login"), []);
});
