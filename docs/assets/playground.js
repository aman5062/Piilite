// piilite playground. Everything runs in this browser tab; no text is sent anywhere.
import { Piilite, presets } from "./piilite.min.js";

const $ = (id) => document.getElementById(id);
const input = $("pg-input");
const output = $("pg-output");
const rows = $("pg-rows");
const stats = $("pg-stats");
const mode = $("pg-mode");
const preset = $("pg-preset");
const location = $("pg-location");

// all sample values are fake
const SAMPLES = {
  chat: "bhai mera number save kar le 9123456780, gpay bhi isi pe hai 9123456780@ybl\nmera naam Rahul Sharma hai, otp aaya 551902",
  resume: "Priya Kulkarni\nBackend Developer | Node.js\npriya.k@mail.test | +91 98201 33445 | GitHub: priyak-dev\nAddress: B-204, Shanti Heights, Baner Road, Pune, Maharashtra 411045\nDOB: 14-08-1997 | PAN: BQKPK4521M",
  kyc: "Applicant: Mrs. Fatima Begum W/O Mohd Salim Ansari\nAadhaar: 4918 3726 5017  Voter ID: UPX4512398\nA/C: 36912345678  IFSC: SBIN0004512\nVehicle: UP32 GH 7788",
  support: "Customer Arjun Mehta (arjun.m@outlook.test) says card 4111 1111 1111 1111 was charged twice.\nShip to: 45, 2nd Cross, Indiranagar, Bengaluru 560038. Contact 9876501234",
  clean: "Order #123456789 total Rs 4,500 on 12/05/2024. UTR 512345678901 processed.\nTrain 12301 leaves at 16:55. mujhe nahi pata yaar, kal dekhte hai",
};

for (const name of Object.keys(presets)) {
  const o = document.createElement("option");
  o.value = name;
  o.textContent = name;
  preset.append(o);
}

const escape = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function run() {
  const options = { mode: mode.value };
  if (preset.value) options.preset = preset.value;
  if (location.checked) options.include = ["LOCATION"];
  const shield = new Piilite(options);
  const t0 = performance.now();
  const result = shield.detect(input.value);
  const ms = performance.now() - t0;

  // highlight the replacements in the redacted text
  let html = "";
  let last = 0;
  let offset = 0;
  for (const d of result.detections) {
    const start = d.position[0] + offset;
    html += escape(result.redacted.slice(last, start)) + `<mark title="${escape(d.type)}">${escape(d.placeholder)}</mark>`;
    last = start + d.placeholder.length;
    offset += d.placeholder.length - (d.position[1] - d.position[0]);
  }
  html += escape(result.redacted.slice(last));
  output.innerHTML = html || "<span>Type or paste some text above.</span>";

  rows.innerHTML = result.detections
    .map((d) => `<tr><td><code>${escape(d.type)}</code></td><td>${escape(d.value)}</td><td>${escape(d.severity)}</td><td class="num">${d.confidence.toFixed(2)}</td></tr>`)
    .join("") || `<tr><td colspan="4">No personal data found.</td></tr>`;
  stats.textContent = `${result.detections.length} found in ${ms.toFixed(1)} ms · ${input.value.length} characters`;
}

for (const [name, text] of Object.entries(SAMPLES)) {
  const b = document.querySelector(`[data-sample="${name}"]`);
  b?.addEventListener("click", () => {
    input.value = text;
    run();
  });
}
for (const el of [input, mode, preset, location]) el.addEventListener("input", run);
input.value = SAMPLES.chat;
run();
