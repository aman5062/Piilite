import { test } from "node:test";
import assert from "node:assert/strict";
import { types, values, makeAadhaar, makeGstin, makeVid } from "./helpers.js";
import { aadhaar, gstin, pan, verhoeff } from "../src/index.js";

const AADHAAR = makeAadhaar("49183726501");
const spaced = (a) => a.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3");

test("Aadhaar: plain, spaced, dashed, with checksum", () => {
  assert.ok(aadhaar(AADHAAR));
  assert.deepEqual(values(`Aadhaar ${AADHAAR}`, "AADHAAR"), [AADHAAR]);
  assert.deepEqual(values(`aadhar no: ${spaced(AADHAAR)}`, "AADHAAR"), [spaced(AADHAAR)]);
  assert.deepEqual(values(`UID ${AADHAAR.replace(/(\d{4})(\d{4})(\d{4})/, "$1-$2-$3")}`, "AADHAAR").length, 1);
});

test("Aadhaar: bad checksum is ignored unless the text says aadhaar", () => {
  const bad = AADHAAR.slice(0, 11) + ((+AADHAAR[11] + 1) % 10);
  assert.ok(!verhoeff(bad));
  assert.deepEqual(values(`ref ${bad}`, "AADHAAR"), []);
  assert.deepEqual(values(`my aadhaar is ${bad}`, "AADHAAR"), [bad]);
});

test("Aadhaar: never starts with 0 or 1", () => {
  const a = makeAadhaar("19183726501");
  assert.deepEqual(values(`id ${a}`, "AADHAAR"), []);
});

test("Aadhaar VID needs context", () => {
  const vid = makeVid("918273645501928");
  assert.deepEqual(values(`VID ${vid}`, "AADHAAR_VID"), [vid]);
});

test("PAN with holder-type check", () => {
  assert.ok(pan("ABCPS1234K"));
  assert.ok(!pan("ABCXS1234K"));
  assert.deepEqual(values("PAN: ABCPS1234K", "PAN"), ["ABCPS1234K"]);
  assert.deepEqual(values("pan card abcps1234k", "PAN"), ["abcps1234k"]);
  assert.deepEqual(values("code ABCXS1234K", "PAN"), []);
});

test("GSTIN with checksum, and the PAN inside is not double counted", () => {
  const g = makeGstin("27AAPFU0939F1Z");
  assert.ok(gstin(g));
  assert.deepEqual(types(`GSTIN ${g}`), ["GSTIN"]);
  const wrong = g.slice(0, 14) + (g[14] === "A" ? "B" : "A");
  assert.deepEqual(values(`invoice ${wrong}`, "GSTIN"), []);
});

test("Indian mobiles in every common format", () => {
  for (const p of ["9123456780", "+91 91234 56780", "+919123456780", "091234 56780", "91-9123456780", "0091 9123456780", "912-345-6780", "91234 56780"]) {
    assert.deepEqual(types(`call ${p}`), ["PHONE_IN"], p);
  }
});

test("Indic digits are understood", () => {
  assert.deepEqual(types("मेरा नंबर ९१२३४५६७८० है"), ["PHONE_IN"]);
  assert.deepEqual(types("ফোন ৯১২৩৪৫৬৭৮০"), ["PHONE_IN"]);
});

test("spoken phone numbers (English and Hinglish)", () => {
  assert.deepEqual(types("my number is nine one two three four five six seven eight zero"), ["PHONE_IN"]);
  assert.deepEqual(types("number hai nau ek do teen char paanch chhe saat aath shunya"), ["PHONE_IN"]);
});

test("landline numbers", () => {
  assert.deepEqual(types("office 011-23456781"), ["PHONE_IN"]);
  assert.deepEqual(types("call 080 41234567"), ["PHONE_IN"]);
});

test("junk numbers are not phones", () => {
  assert.deepEqual(types("dial 9999999999"), []);
  assert.deepEqual(types("order 9876543210"), []);
});

test("UPI IDs", () => {
  assert.deepEqual(values("pay rahul.k@okhdfcbank", "UPI_ID"), ["rahul.k@okhdfcbank"]);
  assert.deepEqual(values("9123456780@ybl", "UPI_ID"), ["9123456780@ybl"]);
  assert.deepEqual(values("gpay me on priya@newbank", "UPI_ID"), ["priya@newbank"]);
});

test("bank account needs context, IFSC is uppercase", () => {
  assert.deepEqual(types("A/c no 50100234567890 IFSC HDFC0001234"), ["BANK_ACCOUNT", "IFSC"]);
  assert.deepEqual(types("khata number 3456 7890 1234"), ["BANK_ACCOUNT"]);
  assert.deepEqual(types("ref 50100234567890"), []);
});

test("voter ID, passport, driving licence", () => {
  assert.deepEqual(types("Voter ID ABC1234567"), ["VOTER_ID"]);
  assert.deepEqual(types("passport no K1234567"), ["PASSPORT_IN"]);
  assert.deepEqual(types("DL MH12 20110012345"), ["DRIVING_LICENSE"]);
  assert.deepEqual(types("driving licence no: DL-0420110149646"), ["DRIVING_LICENSE"]);
});

test("vehicle registration including BH series", () => {
  assert.deepEqual(types("car MH 12 AB 1234"), ["VEHICLE_REG"]);
  assert.deepEqual(types("bike dl3cab1234"), ["VEHICLE_REG"]);
  assert.deepEqual(types("new car 22 BH 1234 AA"), ["VEHICLE_REG"]);
  assert.deepEqual(types("go up 12 1234 steps"), []);
});

test("ABHA, UAN, ESIC need their labels", () => {
  assert.deepEqual(types("ABHA 91-1234-5678-9012"), ["ABHA"]);
  assert.deepEqual(types("abha address rahul.s@abdm"), ["ABHA_ADDRESS"]);
  assert.deepEqual(types("UAN 100123456789"), ["UAN"]);
  assert.deepEqual(types("ESIC no 31001234560001001"), ["ESIC"]);
});

test("OTP, UPI PIN and passwords", () => {
  assert.deepEqual(values("Your OTP is 482913. Do not share", "OTP"), ["482913"]);
  assert.deepEqual(values("otp hai 4829", "OTP"), ["4829"]);
  assert.deepEqual(values("upi pin 4821", "PIN_SECRET"), ["4821"]);
  assert.deepEqual(values("atm pin is 9024", "PIN_SECRET"), ["9024"]);
  assert.deepEqual(values("password is Rahul@1234", "PASSWORD"), ["Rahul@1234"]);
  assert.deepEqual(values("password is incorrect", "PASSWORD"), []);
});

test("date of birth only with a birth label", () => {
  assert.deepEqual(values("DOB 12/05/1998", "DATE_OF_BIRTH"), ["12/05/1998"]);
  assert.deepEqual(values("born on 3rd March, 1995", "DATE_OF_BIRTH"), ["3rd March, 1995"]);
  assert.deepEqual(values("janm tithi 01-01-2001", "DATE_OF_BIRTH"), ["01-01-2001"]);
  assert.deepEqual(types("meeting on 12/05/2024"), []);
  assert.deepEqual(types("DOB 31/02/1998"), []);
});

test("PIN codes need a label or a place before them", () => {
  assert.deepEqual(values("pincode 110001", "PINCODE"), ["110001"]);
  assert.deepEqual(values("Patna - 800001", "PINCODE"), ["800001"]);
  assert.deepEqual(values("Bengaluru 560 034", "PINCODE"), ["560 034"]);
  assert.deepEqual(types("ticket 400053"), []);
});

test("UPI ID at the end of a sentence", () => {
  assert.deepEqual(values("pay ankit@okhdfcbank. Thanks", "UPI_ID"), ["ankit@okhdfcbank"]);
  assert.deepEqual(values("gpay on priya@newbank.", "UPI_ID"), ["priya@newbank"]);
  assert.deepEqual(types("mail rahul@okhdfcbank.com"), ["EMAIL"]);
});
