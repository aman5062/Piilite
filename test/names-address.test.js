import { test } from "node:test";
import assert from "node:assert/strict";
import { types, values } from "./helpers.js";

const names = (t) => values(t, "NAME");
const addresses = (t) => values(t, "ADDRESS");

test("names after intros, in English and Hinglish", () => {
  assert.deepEqual(names("My name is Rahul Sharma and I study here"), ["Rahul Sharma"]);
  assert.deepEqual(names("mera naam priya verma hai"), ["priya verma"]);
  assert.deepEqual(names("Myself Ankit Kumar Gupta from Patna"), ["Ankit Kumar Gupta"]);
  assert.deepEqual(names("hi this is rahul"), ["rahul"]);
  assert.deepEqual(names("Name: RAJESH KUMAR"), ["RAJESH KUMAR"]);
  assert.deepEqual(names("Father's Name: Suresh Chandra Mishra"), ["Suresh Chandra Mishra"]);
});

test("names in Devanagari", () => {
  assert.deepEqual(names("मेरा नाम राहुल शर्मा है"), ["राहुल शर्मा"]);
});

test("honorifics and relations keep the label, redact the name", () => {
  assert.deepEqual(names("Shri Ramesh Chand Yadav S/O Late Mohan Lal Yadav"), ["Ramesh Chand Yadav", "Mohan Lal Yadav"]);
  assert.deepEqual(names("Dr. Kavita Nair will call"), ["Kavita Nair"]);
  assert.deepEqual(names("Smt. Sunita Devi"), ["Sunita Devi"]);
});

test("dictionary names without any trigger", () => {
  assert.deepEqual(names("Please forward this to Neha Agarwal today"), ["Neha Agarwal"]);
  assert.deepEqual(names("Mohd Imran Qureshi joined"), ["Mohd Imran Qureshi"]);
  assert.deepEqual(names("Regards,\nPriyanka Iyer"), ["Priyanka Iyer"]);
  assert.deepEqual(names("The meeting with Sunil is on Monday"), ["Sunil"]);
});

test("names: common words are not names", () => {
  assert.deepEqual(names("Read More about the State Bank of India offers"), []);
  assert.deepEqual(names("I am going to Delhi tomorrow, this is great"), []);
  assert.deepEqual(names("Asha hai ki kal baarish hogi"), []);
  assert.deepEqual(names("file name is report.pdf"), []);
  assert.deepEqual(names("Main Road is closed"), []);
});

test("address after a label, ending at the PIN code", () => {
  assert.deepEqual(addresses("Address: Flat no 302, Sai Krupa Apartment, MG Road, Pune - 411001. Phone 9123456780"), [
    "Flat no 302, Sai Krupa Apartment, MG Road, Pune - 411001",
  ]);
  assert.deepEqual(addresses("I live in Andheri West, Mumbai 400053"), ["Andheri West, Mumbai 400053"]);
  assert.deepEqual(addresses("ghar ka pata hai 12, Gandhi Nagar, Bhopal"), ["12, Gandhi Nagar, Bhopal"]);
});

test("rural address with village markers", () => {
  assert.deepEqual(addresses("Vill. Rampur, Post Sonbarsa, Dist. Sitamarhi, Bihar 843302"), [
    "Vill. Rampur, Post Sonbarsa, Dist. Sitamarhi, Bihar 843302",
  ]);
});

test("house-number addresses", () => {
  assert.deepEqual(addresses("Mohd Imran, H.No 12-3-45, Tolichowki, Hyderabad 500008"), ["H.No 12-3-45, Tolichowki, Hyderabad 500008"]);
});

test("email address label is not a postal address", () => {
  assert.deepEqual(types("email address: rahul.s@gmail.com"), ["EMAIL"]);
});

test("the verb 'address' is not an address", () => {
  assert.deepEqual(addresses("Prime Minister addressed the nation from Red Fort"), []);
  assert.deepEqual(addresses("we need to address the issue soon"), []);
});

test("shipping and delivery labels", () => {
  assert.deepEqual(addresses("Shipping: 45, 2nd Cross, Indiranagar, Bengaluru 560038. Thanks"), ["45, 2nd Cross, Indiranagar, Bengaluru 560038"]);
  assert.deepEqual(addresses("my address is 7 Park Street, Kolkata 700016"), ["7 Park Street, Kolkata 700016"]);
});

test("Hinglish chat without PII stays untouched", () => {
  for (const t of [
    "mujhe nahi pata yaar, kal dekhte hai",
    "pata hai kal chhutti hai?",
    "मुझे पता नहीं",
    "main ghar ja raha hu, tu aa raha hai kya",
    "bhai kal match dekha? Kohli ne century maari",
    "aaj office mein meeting thi 3 baje",
  ]) {
    assert.deepEqual(types(t), [], t);
  }
});

test("Hinglish address labels", () => {
  assert.deepEqual(addresses("mera pata hai 21, Lajpat Nagar, Delhi 110024"), ["21, Lajpat Nagar, Delhi 110024"]);
  assert.deepEqual(addresses("पता: 14, गांधी मार्ग, जयपुर 302001"), ["14, गांधी मार्ग, जयपुर 302001"]);
});
