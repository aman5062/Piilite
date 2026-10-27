// Builds labelled synthetic samples (all values are fake).
//   eval/dataset.json  dev set: rules were tuned while looking at it
//   eval/holdout.json  second dev set: it was held out at first, then used to tune
//   eval/holdout2.json held-out set: written once, never used for tuning (reported score)
// Run: node eval/generate.js
import { writeFileSync } from "node:fs";
import { HOLDOUT_TEMPLATES, HOLDOUT_CLEAN, HOLDOUT_UNKNOWN } from "./holdout-templates.js";
import { HOLDOUT2_TEMPLATES, HOLDOUT2_CLEAN, HOLDOUT2_UNKNOWN } from "./holdout2-templates.js";
import { verhoeffDigit, gstinChecksum, luhn } from "../src/index.js";

// seeded PRNG so the dataset is reproducible
let seed = 20261027;
const rnd = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (a) => a[Math.floor(rnd() * a.length)];
const digits = (n, first = "123456789") => pick(first.split("")) + Array.from({ length: n - 1 }, () => Math.floor(rnd() * 10)).join("");
const letters = (n) => Array.from({ length: n }, () => String.fromCharCode(65 + Math.floor(rnd() * 26))).join("");

// names in the dictionary and names that are not (to measure honest recall)
const KNOWN = ["Rahul Sharma", "Priya Verma", "Ankit Gupta", "Sneha Kulkarni", "Arjun Mehta", "Fatima Ansari", "Gurpreet Singh Sandhu", "Kavita Nair", "Mohd Imran Qureshi", "Lavanya Iyengar", "Sourav Banerjee", "Deepika Reddy", "Vikram Rathore", "Pooja Patel", "Joseph Varghese", "Neha Agarwal"];
let UNKNOWN = ["Tejaswini Rangnekar", "Hrishikesh Joglekar", "Bhoomika Sonkusare", "Yuvika Bhandwalkar", "Ojasvi Thakre", "Darshil Vekariya", "Ritvika Pendharkar", "Kshama Ghodke", "Pratyush Nandwana", "Ishwari Kolte"];
const CITIES = [["Pune", "411045"], ["Mumbai", "400053"], ["Bengaluru", "560038"], ["Patna", "800001"], ["Jaipur", "302001"], ["Kolkata", "700016"], ["Chennai", "600002"], ["Hyderabad", "500008"], ["Lucknow", "226001"], ["Bhopal", "462001"]];
const STREETS = ["MG Road", "Baner Road", "2nd Cross, Indiranagar", "Lajpat Nagar", "Civil Lines", "Park Street", "Anna Salai", "Banjara Hills", "Gomti Nagar", "Arera Colony"];
const UPI = ["okhdfcbank", "ybl", "okaxis", "paytm", "oksbi", "ibl", "okicici"];
const STATES = ["MH", "KA", "DL", "UP", "TN", "GJ", "RJ", "WB", "BR", "MP"];

const gen = {
  NAME_KNOWN: () => pick(KNOWN),
  NAME_UNKNOWN: () => pick(UNKNOWN),
  PHONE_IN: () => {
    const n = digits(10, "6789");
    return pick([n, `+91 ${n.slice(0, 5)} ${n.slice(5)}`, `+91-${n}`, `0${n}`, `${n.slice(0, 5)} ${n.slice(5)}`, `91${n}`]);
  },
  EMAIL: () => `${pick(["rahul", "priya.k", "ankit_g", "sneha97", "arjun.m", "kavita.n"])}${Math.floor(rnd() * 99)}@${pick(["gmail.com", "yahoo.co.in", "outlook.com", "rediffmail.com", "company.in"])}`,
  AADHAAR: () => {
    const a = digits(11, "23456789");
    const full = a + verhoeffDigit(a);
    return pick([full, full.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3"), full.replace(/(\d{4})(\d{4})(\d{4})/, "$1-$2-$3")]);
  },
  PAN: () => letters(3) + pick("PCHFATBLJG".split("")) + letters(1) + digits(4, "123456789") + letters(1),
  GSTIN: () => {
    const p = letters(3) + "P" + letters(1) + digits(4) + letters(1);
    const body = String(Math.floor(rnd() * 37) + 1).padStart(2, "0") + p + "1Z";
    return body + gstinChecksum(body);
  },
  UPI_ID: () => `${pick(["rahul", "priya", "ankit.g", digits(10, "6789")])}@${pick(UPI)}`,
  BANK_ACCOUNT: () => digits(pick([11, 12, 14, 16])),
  IFSC: () => pick(["HDFC", "SBIN", "ICIC", "UTIB", "PUNB", "KKBK"]) + "0" + digits(6, "0123456789"),
  CREDIT_CARD: () => {
    const base = pick(["4", "5", "65", "60"]) + Array.from({ length: 14 }, () => Math.floor(rnd() * 10)).join("");
    const body = base.slice(0, 15);
    for (let d = 0; d < 10; d++) if (luhn(body + d)) return (body + d).replace(/(\d{4})(?=\d)/g, "$1 ");
  },
  VOTER_ID: () => letters(3) + digits(7),
  PASSPORT_IN: () => pick("ABCDEFGHJKLMNPRSTUVWY".split("")) + digits(7, "123456789").replace(/0$/, "1"),
  DRIVING_LICENSE: () => `${pick(STATES)}${String(Math.floor(rnd() * 50) + 1).padStart(2, "0")} ${2000 + Math.floor(rnd() * 24)}${digits(7, "0123456789")}`,
  VEHICLE_REG: () => `${pick(STATES)} ${String(Math.floor(rnd() * 50) + 1).padStart(2, "0")} ${letters(2)} ${digits(4)}`,
  OTP: () => digits(6),
  DATE_OF_BIRTH: () => `${String(Math.floor(rnd() * 28) + 1).padStart(2, "0")}/${String(Math.floor(rnd() * 12) + 1).padStart(2, "0")}/${1960 + Math.floor(rnd() * 45)}`,
  ADDRESS: () => {
    const [city, pin] = pick(CITIES);
    return `${Math.floor(rnd() * 300) + 1}, ${pick(STREETS)}, ${city} ${pick(["", "- "])}${pin}`;
  },
  API_KEY: () => "sk-proj-" + Array.from({ length: 32 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(rnd() * 36)]).join(""),
};

// {TYPE} slots; NAME_UNKNOWN is labelled NAME
const TEMPLATES = [
  "My name is {NAME_KNOWN} and my number is {PHONE_IN}",
  "Name: {NAME_KNOWN}\nMobile: {PHONE_IN}\nEmail: {EMAIL}",
  "Name: {NAME_UNKNOWN}\nPhone: {PHONE_IN}",
  "mera naam {NAME_KNOWN} hai, mera number {PHONE_IN} hai",
  "hi this is {NAME_KNOWN}, pls call me on {PHONE_IN}",
  "Myself {NAME_UNKNOWN} from Pune, my mail id is {EMAIL}",
  "Please forward the offer letter to {NAME_KNOWN} today",
  "Spoke to {NAME_UNKNOWN} about the renewal yesterday",
  "Dear {NAME_KNOWN},\nYour OTP is {OTP}. Do not share it with anyone.",
  "Aadhaar: {AADHAAR}  PAN: {PAN}",
  "aadhar number {AADHAAR} hai mera",
  "Sir my PAN card no is {PAN} and DOB {DATE_OF_BIRTH}",
  "GSTIN of the firm: {GSTIN}",
  "bhai paise {UPI_ID} pe bhej de",
  "Pay to {UPI_ID} and share screenshot",
  "A/c no {BANK_ACCOUNT}, IFSC {IFSC}, name {NAME_KNOWN}",
  "my HDFC account {BANK_ACCOUNT} is not getting credited",
  "Card {CREDIT_CARD} was charged twice",
  "Voter ID: {VOTER_ID}",
  "passport no {PASSPORT_IN} expires next year",
  "DL {DRIVING_LICENSE} verified",
  "my car {VEHICLE_REG} got a challan",
  "Address: {ADDRESS}",
  "I live in {ADDRESS}",
  "Ship to: {ADDRESS}. Contact {PHONE_IN}",
  "Customer {NAME_KNOWN} ({EMAIL}) reported a failed payment of Rs 2,499.",
  "Candidate: {NAME_UNKNOWN} | {EMAIL} | {PHONE_IN}",
  "OPENAI_API_KEY={API_KEY}",
  "Shri {NAME_UNKNOWN} S/O {NAME_KNOWN}, {ADDRESS}",
  "Applicant Mrs. {NAME_KNOWN}, DOB: {DATE_OF_BIRTH}, Aadhaar {AADHAAR}",
  "call kar {PHONE_IN} pe, otp {OTP} aaya hai",
  "Regards,\n{NAME_KNOWN}\n{PHONE_IN}",
];

// Normal text with numbers and capitals but no personal data
const CLEAN = [
  "India's GDP grew 7.2% in FY24 according to the Ministry of Statistics.",
  "The RBI kept the repo rate at 6.5% on 08/02/2024.",
  "Tata Motors sold 45,000 units in March, up 12% year on year.",
  "Mumbai Indians beat Chennai Super Kings by 5 wickets at Wankhede.",
  "Flight AI 101 departs at 14:30 from T3, gate 42.",
  "Install with npm i react@18.3.1, then run on port 3000.",
  "Section 80C allows deduction up to Rs 1,50,000.",
  "Train 12301 Rajdhani Express arrives at platform 16.",
  "Pune Metro phase 2 will cost 3,300 crore.",
  "Order #123456789 total Rs 4500 on 12/05/2024.",
  "Invoice INV-2024-0042 is due in 30 days.",
  "UPI ref no 412398765432 credited successfully.",
  "UTR 512345678901 for Rs 1,200 has been processed.",
  "SKU ABCDE1234F is out of stock.",
  "Model XYZ1234567 ships next week.",
  "Version 2.4.1 fixes 12 bugs and adds dark mode.",
  "Sensex closed at 81,245 while Nifty ended at 24,780.",
  "The match starts at 7:30 PM IST on Sunday.",
  "Revenue grew 18% to Rs 4,52,000 in Q3.",
  "Room 204, Block B is reserved for the workshop.",
  "Call the toll-free helpline 1800-180-1111 for help.",
  "The meeting is in the State Bank of India building.",
  "mujhe nahi pata yaar, kal dekhte hai",
  "bhai kal match dekha? Kohli ne century maari",
  "aaj office mein meeting thi 3 baje, phir lunch",
  "pata hai kal chhutti hai?",
  "Gandhi Nagar market is closed on Monday.",
  "We need to address the issue before the release.",
  "Prime Minister addressed the nation from Red Fort.",
  "Read More about the latest offers from Reliance Jio.",
  "Sprint 2024-11 planning is on Tuesday at 10:30.",
  "Ticket TKT-55621 has been closed.",
  "Batch 2019 alumni meet is on 14 December.",
  "Temperature in Delhi touched 45 degrees on Friday.",
  "The parcel weighs 2.5 kg and costs Rs 180 to ship.",
  "Please use code SAVE20 for 20% off.",
  "Our office in Bengaluru has 120 employees.",
  "Python 3.12 and Node 22 are supported.",
  "Chapter 7 covers the Indian Contract Act, 1872.",
  "The Supreme Court heard 34 cases today.",
];

function build(templates, clean, count, prefix) {
const samples = [];
for (let i = 0; i < count; i++) {
  const tpl = templates[i % templates.length];
  let text = "";
  const spans = [];
  let last = 0;
  for (const m of tpl.matchAll(/\{([A-Z_]+)\}/g)) {
    text += tpl.slice(last, m.index);
    const value = gen[m[1]]();
    const type = m[1].startsWith("NAME_") ? "NAME" : m[1];
    spans.push({ type, start: text.length, end: text.length + value.length, value, ...(m[1] === "NAME_UNKNOWN" ? { hard: true } : {}) });
    text += value;
    last = m.index + m[0].length;
  }
  text += tpl.slice(last);
  samples.push({ id: `${prefix}pii-${i}`, text, spans });
}
clean.forEach((text, i) => samples.push({ id: `${prefix}clean-${i}`, text, spans: [] }));
return samples;
}

const dev = build(TEMPLATES, CLEAN, 400, "");
writeFileSync(new URL("./dataset.json", import.meta.url), JSON.stringify(dev, null, 1));
console.log(`dataset.json: ${dev.length} samples (${CLEAN.length} without PII)`);

seed = 77031;
UNKNOWN = HOLDOUT_UNKNOWN;
const holdout = build(HOLDOUT_TEMPLATES, HOLDOUT_CLEAN, 500, "h-");
writeFileSync(new URL("./holdout.json", import.meta.url), JSON.stringify(holdout, null, 1));
console.log(`holdout.json: ${holdout.length} samples (${HOLDOUT_CLEAN.length} without PII)`);

seed = 99173;
UNKNOWN = HOLDOUT2_UNKNOWN;
const holdout2 = build(HOLDOUT2_TEMPLATES, HOLDOUT2_CLEAN, 450, "h2-");
writeFileSync(new URL("./holdout2.json", import.meta.url), JSON.stringify(holdout2, null, 1));
console.log(`holdout2.json: ${holdout2.length} samples (${HOLDOUT2_CLEAN.length} without PII)`);
