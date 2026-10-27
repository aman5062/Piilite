import { readFileSync } from "node:fs";
import { Piilite } from "../src/index.js";

const sample = `Name: Sneha Kulkarni, Email: sneha.kulkarni97@gmail.com, Mobile: +91-8806123457
Address: B-204, Shanti Heights, Baner Road, Pune, Maharashtra 411045. PAN: BQKPK4521M
bhai mera number save kar le 7019283746, gpay 7019283746@ybl, otp aaya 551902
India's GDP grew 7.2% in FY24. Train 12301 arrives at platform 16 at 14:30.
`;

const time = (fn, runs) => {
  for (let i = 0; i < 5; i++) fn();
  const ms = [];
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    fn();
    ms.push(performance.now() - t0);
  }
  ms.sort((a, b) => a - b);
  return { avg: ms.reduce((a, b) => a + b, 0) / ms.length, p95: ms[Math.floor(ms.length * 0.95)], max: ms.at(-1) };
};
const fmt = ({ avg, p95, max }) => `avg ${avg.toFixed(2).padStart(6)} ms   p95 ${p95.toFixed(2).padStart(6)} ms   max ${max.toFixed(2).padStart(6)} ms`;

const shield = new Piilite();
console.log("single text");
for (const size of [1_000, 10_000, 100_000]) {
  const text = sample.repeat(Math.ceil(size / sample.length)).slice(0, size);
  console.log(`  ${String(size).padStart(7)} chars  ${fmt(time(() => shield.detect(text), size > 50_000 ? 10 : 100))}`);
}

// RAG answer: a question, 8 retrieved passages of ~900 chars and ~2 KB of history,
// masked in one session, then the model answer restored
const pool = JSON.parse(readFileSync(new URL("../eval/holdout2.json", import.meta.url), "utf8")).map((s) => s.text);
const passage = (i) => {
  let out = "";
  for (let k = i; out.length < 900; k++) out += pool[k % pool.length] + " ";
  return out.slice(0, 900);
};
const passages = Array.from({ length: 8 }, (_, i) => passage(i * 37));
const history = passage(500).repeat(3).slice(0, 2000);
const question = "what did rahul sharma approve last week, and what is his phone number?";
const chars = question.length + history.length + passages.reduce((a, p) => a + p.length, 0);
console.log(`\nRAG answer (question + 8 passages + history = ${chars.toLocaleString("en-US")} chars)`);
console.log(`  mask      ${fmt(time(() => shield.session().redactAll([question, history, ...passages]), 200))}`);
const s = shield.session();
s.redactAll([question, history, ...passages]);
const answer = "[NAME_1] approved Budget v2 on Monday. You can reach [NAME_1] at [PHONE_IN_1]. ".repeat(10);
console.log(`  restore   ${fmt(time(() => s.restore(answer), 200))}`);
