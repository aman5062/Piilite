import { Piilite } from "../src/index.js";

const sample = `Name: Sneha Kulkarni, Email: sneha.kulkarni97@gmail.com, Mobile: +91-8806123457
Address: B-204, Shanti Heights, Baner Road, Pune, Maharashtra 411045. PAN: BQKPK4521M
bhai mera number save kar le 7019283746, gpay 7019283746@ybl, otp aaya 551902
India's GDP grew 7.2% in FY24. Train 12301 arrives at platform 16 at 14:30.
`;

const shield = new Piilite();
for (const size of [1_000, 10_000, 100_000]) {
  const text = sample.repeat(Math.ceil(size / sample.length)).slice(0, size);
  shield.detect(text);
  const runs = size > 50_000 ? 10 : 100;
  const t0 = performance.now();
  for (let i = 0; i < runs; i++) shield.detect(text);
  const ms = (performance.now() - t0) / runs;
  console.log(`${String(size).padStart(7)} chars  ${ms.toFixed(2).padStart(7)} ms/op`);
}
