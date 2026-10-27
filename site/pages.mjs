// Content of every page. Facts that change (version, size) come from ctx.
import { code, table, h2, h3, esc, SITE, REPO, NPM } from "./layout.mjs";

const QUICK = `import { Piilite } from "piilite";

const shield = new Piilite();
const { redacted, redactionMap } = shield.detect(
  "Myself Ankit Kumar Gupta, call 9123456780 or pay ankit@okhdfcbank. PAN ABCPS1234K, OTP is 482913"
);

console.log(redacted);
// Myself [NAME_1], call [PHONE_IN_1] or pay [UPI_ID_1]. PAN [PAN_1], OTP is [OTP_1]`;

const INSTALL = `npm install piilite
# or
pnpm add piilite
yarn add piilite
bun add piilite`;

// held-out benchmark (eval/holdout2.json), never used for tuning
export const ACCURACY = {
  samples: 480,
  piilite: { recall: 84.3, precision: 99.7, cleanFP: 6.7, names: 71.6, addresses: 50.0 },
  openredaction: { recall: 45.7, precision: 76.7, cleanFP: 86.7, names: 64.2, addresses: 0.0 },
  perType: [
    ["Aadhaar", 100, 86.7], ["PAN", 100, 0], ["GSTIN", 100, 0], ["UPI ID", 100, 0], ["Phone (+91)", 100, 20],
    ["Bank account", 100, 20], ["IFSC", 100, 0], ["Voter ID", 100, 0], ["Driving licence", 100, 0],
    ["Vehicle number", 100, 0], ["Passport", 100, 100], ["Email", 100, 100], ["Card number", 100, 100],
    ["Date of birth", 100, 100], ["OTP", 100, 0], ["API key", 100, 0], ["Name", 71.6, 64.2], ["Address", 50, 0],
  ],
};

const pct = (v) => `${v.toFixed(1)}%`;
const better = (a, b, higherIsBetter = true) => {
  const aw = higherIsBetter ? a > b : a < b;
  return [aw ? `<span class="win">${pct(a)}</span>` : pct(a), !aw && a !== b ? `<span class="win">${pct(b)}</span>` : pct(b)];
};

const INDIA_TYPES = [
  ["<code>AADHAAR</code>", "4918 3726 5017", "12 digits starting 2-9, Verhoeff checksum; skipped after UTR / order / ref labels"],
  ["<code>AADHAAR_VID</code>", "16-digit Virtual ID", "Verhoeff checksum + &ldquo;VID&rdquo; nearby"],
  ["<code>PAN</code>", "ABCPS1234K", "Structure + valid holder type (4th letter)"],
  ["<code>GSTIN</code>", "27AAPFU0939F1ZV", "State code + embedded PAN + mod-36 checksum"],
  ["<code>UPI_ID</code>", "rahul@okhdfcbank", "85+ known UPI handles; any handle when UPI, GPay or PhonePe is mentioned"],
  ["<code>PHONE_IN</code>", "+91 91234 56780", "Mobile (6-9 start) and landline, every common format, spoken digits"],
  ["<code>BANK_ACCOUNT</code>", "A/c 50100234567890", "9-18 digits after an account label or one of 40 bank names"],
  ["<code>IFSC</code>", "HDFC0001234", "Structure"],
  ["<code>VOTER_ID</code>", "ABC1234567", "EPIC structure"],
  ["<code>PASSPORT_IN</code>", "K1234567", "Structure + &ldquo;passport&rdquo; label"],
  ["<code>DRIVING_LICENSE</code>", "MH12 20110012345", "State code + RTO + year + number"],
  ["<code>VEHICLE_REG</code>", "MH 12 AB 1234, 22 BH 1234 AA", "Real state / UT codes, Bharat series"],
  ["<code>ABHA</code>", "91-1234-5678-9012", "ABDM health ID format, ABHA address <code>name@abdm</code>"],
  ["<code>UAN</code>, <code>ESIC</code>, <code>RATION_CARD</code>", "UAN 100123456789", "Label nearby"],
  ["<code>OTP</code>, <code>PIN_SECRET</code>", "OTP is 482913, UPI PIN 4821", "Label nearby"],
  ["<code>DATE_OF_BIRTH</code>", "DOB 12/05/1998", "Date after a birth label; real calendar date"],
  ["<code>PINCODE</code>", "Patna - 800001", "Label, or after one of 220+ cities and states"],
  ["<code>NAME</code>", "mera naam Priya Verma hai", "Intro phrases, labels, titles, S/O, 1,700-name dictionary, 10 languages"],
  ["<code>ADDRESS</code>", "Flat no 302, MG Road, Pune - 411001", "Labels, house and village markers, landmarks, PIN codes"],
  ["<code>LOCATION</code> (opt-in)", "Based in: Kotputli, Rajasthan", "Profile labels and Town, State pairs"],
];

export const FAQ = [
  {
    q: "What is piilite?",
    a: `piilite is a free, open-source JavaScript library that finds and masks personal data (PII) in text. It is built for Indian data: Aadhaar, PAN, GSTIN, UPI IDs, +91 phone numbers, Indian names and addresses, OTPs and API keys. It has zero dependencies, weighs about 27 KB gzipped and runs in Node.js, browsers, Bun and Deno.`,
  },
  { q: "Is piilite free to use in commercial projects?", a: `Yes. piilite is MIT licensed, so you can use it in personal and commercial projects for free. Keep the copyright notice from the LICENSE file.` },
  {
    q: "Does piilite use AI or send my data anywhere?",
    a: `No. piilite uses patterns, checksums and rules only. It makes no network calls and runs entirely on your server or in the user's browser, so the text you scan never leaves your machine.`,
  },
  {
    q: "How do I detect Aadhaar numbers in JavaScript?",
    a: `Install piilite with <code>npm install piilite</code> and call <code>new Piilite({ types: ["AADHAAR"] }).scan(text)</code>. It returns each Aadhaar number with its position. piilite checks the Verhoeff checksum, so random 12-digit numbers are not flagged, and it skips numbers labelled as UTR, order or reference numbers.`,
  },
  {
    q: "How does piilite validate Aadhaar, PAN and GSTIN numbers?",
    a: `Aadhaar and Aadhaar VID numbers must pass the Verhoeff checksum UIDAI uses. PAN numbers must have a valid holder-type letter in the fourth position. GSTIN numbers must start with a real state code, contain a valid PAN and pass the GSTIN mod-36 checksum. Card numbers are checked with the Luhn algorithm.`,
  },
  {
    q: "Does piilite work with Hindi and Hinglish text?",
    a: `Yes. piilite understands Hinglish phrases such as "mera naam … hai" and "ghar ka pata", digits written in nine Indian scripts (for example ९८७६५४३२१०), spoken numbers like "nau aath saat", and "my name is" in Hindi, Marathi, Bengali, Punjabi, Gujarati, Odia, Tamil, Telugu, Kannada and Malayalam.`,
  },
  {
    q: "How do I mask PII before sending a prompt to an LLM like ChatGPT or Claude?",
    a: `Call <code>shield.detect(prompt)</code>, send the returned <code>redacted</code> text to the model, then call <code>shield.restore(answer, redactionMap)</code> on the reply. The model only sees placeholders like [NAME_1] and [PHONE_IN_1]; the real values stay on your server.`,
  },
  {
    q: "Can piilite put the original values back into the AI's answer?",
    a: `Yes. <code>restore(text, redactionMap)</code> replaces placeholders with the original values. It is fuzzy by default, so it also handles placeholders a model rewrote, such as "[NAME 1]", "[name_1]" or "NAME_1".`,
  },
  {
    q: "Can piilite redact streaming LLM output?",
    a: `Yes. <code>shield.redactStream(asyncIterable)</code>, <code>shield.createStream()</code> and <code>shield.transformStream()</code> redact text as it arrives. They hold back a short tail so a phone number or name split across two chunks is never leaked.`,
  },
  {
    q: "Does piilite work in the browser, Node.js, Bun and Deno?",
    a: `Yes. piilite has no dependencies and uses only standard JavaScript, so it runs in Node.js 18 and later, modern browsers, Bun, Deno and edge runtimes. It ships as an ES module and as CommonJS.`,
  },
  { q: "Does piilite support TypeScript?", a: `Yes. piilite ships its own type definitions for the core and for the <code>piilite/openredaction</code>, <code>piilite/express</code> and <code>piilite/react</code> entry points.` },
  {
    q: "Does piilite make my app compliant with India's DPDP Act?",
    a: `piilite helps you minimise personal data, for example before logging it or sending it to an AI provider, and it has a <code>dpdp</code> preset for the Digital Personal Data Protection Act, 2023. Compliance also depends on consent, purpose, storage and security, so piilite alone does not make an app compliant. This is not legal advice.`,
  },
  {
    q: "How accurate is piilite?",
    a: `On a held-out benchmark of ${ACCURACY.samples} synthetic samples that was never used for tuning, piilite caught ${ACCURACY.piilite.recall}% of personal data with ${ACCURACY.piilite.precision}% precision. Every ID-style type (Aadhaar, PAN, GSTIN, UPI, phone, bank account, email, cards, licences) scored 100%. Names scored ${ACCURACY.piilite.names}% and addresses ${ACCURACY.piilite.addresses}%.`,
  },
  {
    q: "What are piilite's limitations?",
    a: `Names with no clue around them and addresses without a label, house marker or PIN code can be missed, because piilite does not use an AI model. Some types (bank account, passport, UAN, OTP) need a label nearby. The benchmark data is synthetic, so real text may contain cases it does not cover.`,
  },
  {
    q: "How is piilite different from OpenRedaction?",
    a: `OpenRedaction is a broader, global library with 570+ patterns and enterprise modules such as audit logging and RBAC. piilite focuses on Indian data and is far more accurate on it (${ACCURACY.piilite.recall}% vs ${ACCURACY.openredaction.recall}% recall in the benchmark), is smaller, and can use OpenRedaction's global patterns through its optional <code>piilite/openredaction</code> bridge.`,
  },
  {
    q: "How is piilite different from Microsoft Presidio?",
    a: `Presidio is a Python framework that combines patterns with NLP models such as spaCy and usually runs as a separate service. piilite is a JavaScript library that runs inside your app with no models and no service, and it covers Indian formats out of the box. Presidio can catch more free-text names; piilite is lighter and faster to adopt in JavaScript projects.`,
  },
  { q: "How do I report a missed or wrong detection?", a: `Open an issue on <a href="${REPO}/issues">GitHub</a> with a sample sentence that uses fake data. Confirmed cases become tests, so they stay fixed.` },
];

export const pages = [
  // ------------------------------------------------------------------ home
  {
    path: "",
    title: "piilite: India-first PII detection and masking for JavaScript",
    description:
      "Detect and mask Aadhaar, PAN, GSTIN, UPI, +91 phones, Indian names and addresses in JavaScript. Zero dependencies, 27 KB, built for LLM apps. Free, MIT.",
    h1: "India-first PII detection and masking for JavaScript",
    crumb: "Home",
    wide: true,
    body: (c) => `
<section class="hero">
<h1>India-first PII detection and masking for JavaScript</h1>
<p class="lead"><strong>piilite</strong> finds and masks personal data such as Aadhaar, PAN, GSTIN, UPI IDs, +91 phone numbers, Indian names and addresses before it reaches your logs, your database or an AI model. No AI model, no network calls, no dependencies.</p>
<div class="cta"><a class="btn primary" href="guide/">Get started</a><a class="btn" href="playground/">Try it in your browser</a><a class="btn" href="${REPO}" rel="noopener">GitHub</a></div>
${code(INSTALL, "bash")}
<ul class="pills"><li>${c.gzipKB} KB gzipped</li><li>Zero dependencies</li><li>ESM + CommonJS + TypeScript</li><li>Node 18+, browsers, Bun, Deno</li><li>MIT licensed</li></ul>
</section>

${h2("Quick start")}
<p class="answer">Create a <code>Piilite</code> instance and call <code>detect()</code>. You get the redacted text, every detection with its position, and a map to restore the originals.</p>
${code(QUICK)}

${h2("What is piilite?")}
<p class="answer">piilite is a free, open-source JavaScript library for PII detection and data masking, built for Indian data. It checks real checksums, understands Hinglish and nine Indian scripts, and is made for apps that send user text to large language models.</p>
<div class="grid">
<div class="card"><h3>Real checksums</h3><p>Verhoeff for Aadhaar, mod-36 for GSTIN, Luhn for cards (incl. RuPay), mod-97 for IBAN. Random numbers are not flagged.</p></div>
<div class="card"><h3>Writes like India writes</h3><p>Hinglish (&ldquo;mera naam &hellip; hai&rdquo;), Indic digits (९८७६&hellip;), spoken numbers, disguised emails, S/O and W/O.</p></div>
<div class="card"><h3>Built for LLM apps</h3><p>Consistent placeholders, fuzzy <code>restore()</code>, streaming redaction for token streams, <code>redactObject()</code> for chat payloads.</p></div>
<div class="card"><h3>Presets</h3><p>DPDP Act 2023, KYC, fintech, PCI, healthcare, HR, GDPR, HIPAA and secrets, in one option.</p></div>
<div class="card"><h3>Tiny and fast</h3><p>${c.gzipKB} KB gzipped, about 1.5 ms for a 1 KB message, tested against slow-regex (ReDoS) attacks.</p></div>
<div class="card"><h3>Drop-in for OpenRedaction</h3><p>Same <code>detect()</code> result shape and custom patterns, plus an optional bridge to its 110 global ID types.</p></div>
</div>

${h2("What personal data does piilite detect?")}
<p class="answer">piilite detects 45+ types of personal data: every common Indian ID and financial format, phone numbers, emails, names, addresses, cards, IP addresses and API keys. See <a href="india-pii/">all Indian PII types</a>.</p>
${table(["Group", "Types"], [
  ["Indian IDs", "Aadhaar, Aadhaar VID, PAN, GSTIN, TAN, CIN, voter ID, passport, driving licence, vehicle number, ration card, ABHA, UAN, ESIC"],
  ["Money", "UPI ID, bank account, IFSC, cards (RuPay, Visa, Mastercard, Maestro, Amex), CVV, expiry, IBAN, SWIFT"],
  ["Contact", "+91 mobiles and landlines, international phones, email (also disguised), social and coding profiles"],
  ["People and places", "Names (10 Indian languages), addresses, PIN codes, date of birth, opt-in city / location"],
  ["Secrets", "OTPs, UPI / ATM PINs, passwords, API keys (OpenAI, AWS, Razorpay, Stripe, GitHub &hellip;), JWTs, private keys"],
])}

${h2("How accurate is piilite?")}
<p class="answer">On a held-out benchmark of ${ACCURACY.samples} samples, piilite caught <strong>${ACCURACY.piilite.recall}%</strong> of personal data with <strong>${ACCURACY.piilite.precision}%</strong> precision, against ${ACCURACY.openredaction.recall}% and ${ACCURACY.openredaction.precision}% for OpenRedaction. <a href="accuracy/">See the full benchmark</a>.</p>

${h2("How do I use piilite with an AI model?")}
<p class="answer">Redact the prompt, send the redacted text to the model, then restore the answer. The model never sees the real values.</p>
${code(`const { redacted, redactionMap } = shield.detect(userMessage);
const answer = await callYourModel(redacted);           // the model sees [NAME_1], [PHONE_IN_1] ...
const reply = shield.restore(answer, redactionMap);     // real values only on your server`)}
<p><a href="llm/">Read the LLM guide</a> for streaming, chat payloads and Express middleware.</p>
`,
  },

  // ------------------------------------------------------------------ guide
  {
    path: "guide/",
    title: "How to use piilite: install, detect, mask and restore PII",
    description:
      "Step-by-step piilite guide: install from npm, detect PII, pick a masking mode, filter types, add custom patterns, and use it in TypeScript or the browser.",
    h1: "piilite guide: install, detect, mask and restore",
    crumb: "Guide",
    body: (c) => `
<h1>piilite guide: install, detect, mask and restore</h1>
<p class="lead">Everything you need to use piilite in a Node.js, browser or TypeScript project, from installing it to writing your own patterns.</p>

${h2("How do I install piilite?")}
<p class="answer">Install piilite from npm with <code>npm install piilite</code>. It has no dependencies and works with npm, pnpm, yarn and bun.</p>
${code(INSTALL, "bash")}

${h2("How do I detect and redact PII?")}
<p class="answer">Call <code>detect(text)</code> on a <code>Piilite</code> instance. It returns the redacted text, the list of detections and a map from each placeholder to its original value.</p>
${code(QUICK)}
<p>The result has the same shape as OpenRedaction's <code>detect()</code>:</p>
${code(c.exampleResult)}
<p>Need only part of that? <code>redact(text)</code> returns the redacted string, <code>scan(text)</code> returns the matches without changing the text, and <code>hasPII(text)</code> returns <code>true</code> or <code>false</code>.</p>

${h2("How do I use piilite with CommonJS or TypeScript?")}
<p class="answer">piilite ships ES modules, CommonJS and TypeScript types, so <code>import</code> and <code>require</code> both work and types load automatically.</p>
${code(`// ES modules / TypeScript
import { Piilite, redact, type DetectionResult } from "piilite";

// CommonJS
const { Piilite } = require("piilite");`)}

${h2("Which masking modes are there?")}
<p class="answer">piilite has five masking modes: placeholders (default), partial mask, full mask, remove, or your own function.</p>
${table(["Mode", "Input", "Output"], [
  ["<code>placeholder</code> (default)", "call 9123456780", "call [PHONE_IN_1]"],
  ["<code>mask</code>", "call 9123456780", "call XXXXXX6780"],
  ["<code>mask</code>", "PAN ABCPS1234K", "PAN XXXXXX234K"],
  ["<code>mask</code>", "rahul@gmail.com", "rXXXX@gmail.com"],
  ["<code>mask-all</code> + <code>maskChar: \"*\"</code>", "call 9123456780", "call **********"],
  ["<code>remove</code>", "call 9123456780 now", "call &nbsp;now"],
  ["function", "call 9123456780", "call &lt;PHONE_IN&gt;"],
])}
${code(`new Piilite({ mode: "mask" }).redact("call 9123456780");                // "call XXXXXX6780"
new Piilite({ mode: (m) => \`<\${m.type}>\` }).redact("call 9123456780");  // "call <PHONE_IN>"`)}

${h2("How do I detect only some types?")}
<p class="answer">Pass <code>types</code> to detect only those types, <code>exclude</code> to skip some, or a <a href="../presets/">preset</a> such as <code>kyc</code>. Opt-in types like <code>LOCATION</code> run only when you add them with <code>include</code>.</p>
${code(`new Piilite({ types: ["AADHAAR", "PAN"] });          // only these
new Piilite({ exclude: ["IP_ADDRESS"] });            // everything else
new Piilite({ preset: "kyc", exclude: ["PINCODE"] }); // a preset, adjusted
new Piilite({ include: ["LOCATION"] });              // also redact cities`)}

${h2("How do I keep some values, like my support email?")}
<p class="answer">Add them to <code>allow</code>. Strings match exactly (case-insensitive); regular expressions match any detected value.</p>
${code(`new Piilite({ allow: ["support@acme.in", /@acme\\.in$/] });`)}

${h2("How do I add my own patterns?")}
<p class="answer">Pass <code>customPatterns</code>. Each pattern needs a <code>type</code> and a <code>regex</code>; a <code>validator</code>, <code>priority</code> and <code>severity</code> are optional. OpenRedaction patterns work unchanged.</p>
${code(`const shield = new Piilite({
  customPatterns: [
    { type: "EMPLOYEE_ID", regex: /\\bEMP-\\d{5}\\b/g, priority: 90, severity: "medium" },
    {
      type: "ORDER_REF",
      regex: /\\bORD\\d{8}\\b/g,
      context: /order|booking/i,   // must appear near the match...
      requireContext: true,        // ...or the match is dropped
    },
  ],
});
shield.redact("id EMP-00421"); // "id [EMPLOYEE_ID_1]"`)}

${h2("What options does piilite accept?")}
${table(["Option", "Default", "What it does"], [
  ["<code>preset</code>", "none", "A ready-made type set: <code>dpdp</code>, <code>kyc</code>, <code>fintech</code>, <code>pci</code>, <code>healthcare</code>, <code>hr</code>, <code>secrets</code>, <code>gdpr</code>, <code>hipaa</code>, <code>strict</code>, <code>precise</code>"],
  ["<code>mode</code>", "<code>placeholder</code>", "How PII is replaced (see above)"],
  ["<code>types</code> / <code>exclude</code> / <code>include</code>", "all", "Choose which types run"],
  ["<code>allow</code>", "[]", "Values never redacted"],
  ["<code>minConfidence</code>", "0.5", "Drop weaker matches; 0.4 catches more, 0.8 is stricter"],
  ["<code>skipFakeNumbers</code>", "true", "Skip test-looking numbers such as 9876543210; <code>false</code> masks them too"],
  ["<code>maskChar</code> / <code>keepLast</code>", "X / 4", "Mask character and digits left visible in <code>mask</code> mode"],
  ["<code>placeholder</code>", "<code>[TYPE_n]</code>", "Function that builds placeholder text"],
  ["<code>maxInputSize</code>", "5,000,000", "Throws a RangeError above this length; stream larger input"],
  ["<code>onDetect</code>", "none", "Called after every <code>detect()</code>, for audit logs"],
  ["<code>customPatterns</code>", "[]", "Your own patterns"],
])}

${h2("What methods does a Piilite instance have?")}
${table(["Method", "Returns"], [
  ["<code>detect(text)</code>", "<code>{ original, redacted, detections, redactionMap, stats }</code>"],
  ["<code>redact(text)</code>", "Redacted string"],
  ["<code>scan(text)</code>", "Matches: <code>{ type, value, start, end, severity, confidence }[]</code>"],
  ["<code>hasPII(text)</code>", "<code>boolean</code>"],
  ["<code>redactObject(obj, { skipKeys })</code>", "<code>{ value, redactionMap }</code> with every string redacted"],
  ["<code>restore(text, map, { fuzzy })</code>", "Text with the original values back"],
  ["<code>createStream()</code> / <code>redactStream()</code> / <code>transformStream()</code>", "Streaming redaction (see <a href=\"../llm/\">LLM guide</a>)"],
])}
<p>The module also exports <code>redact</code>, <code>scan</code>, <code>detect</code>, <code>hasPII</code> and <code>restore</code> with default options, plus the validators <code>verhoeff</code>, <code>luhn</code>, <code>aadhaar</code>, <code>pan</code> and <code>gstin</code>.</p>

${h2("Can I use piilite in the browser?")}
<p class="answer">Yes. piilite is plain JavaScript with no Node-only APIs, so bundlers like Vite, webpack and esbuild include it as is, and you can load it from a CDN as an ES module.</p>
${code(`<script type="module">
  import { redact } from "https://cdn.jsdelivr.net/npm/piilite@${c.version}/src/index.js";
  console.log(redact("call 9123456780")); // "call [PHONE_IN_1]"
</script>`, "html")}
`,
  },

  // ------------------------------------------------------------------ india
  {
    path: "india-pii/",
    title: "Detect Aadhaar, PAN, GSTIN, UPI and Indian PII in JavaScript",
    description:
      "Detect and mask Aadhaar, PAN, GSTIN, UPI IDs, +91 phones, bank accounts, voter IDs, vehicle numbers, Indian names and addresses in JavaScript.",
    h1: "Detect Indian PII in JavaScript",
    crumb: "Indian PII",
    keywords: ["aadhaar validation javascript", "pan validation regex", "gstin checksum", "upi id regex", "indian phone number regex", "verhoeff javascript", "detect aadhaar number", "mask aadhaar", "pii india", "dpdp"],
    body: () => `
<h1>Detect Aadhaar, PAN, GSTIN, UPI and other Indian PII in JavaScript</h1>
<p class="lead">piilite detects every common Indian identity, tax, banking and contact format, checks real checksums, and understands how people in India actually write them.</p>

${h2("Which Indian data types does piilite detect?")}
${table(["Type", "Example", "How it is checked"], INDIA_TYPES)}
<p>All examples on this page are fake values.</p>

${h2("How do I detect Aadhaar numbers in JavaScript?")}
<p class="answer">Use <code>new Piilite({ types: ["AADHAAR"] })</code> and call <code>scan()</code>. piilite accepts 12-digit numbers written plain, with spaces or with dashes, and keeps only those that pass the Verhoeff checksum UIDAI uses.</p>
${code(`import { Piilite, aadhaar } from "piilite";

const s = new Piilite({ types: ["AADHAAR"] });
s.scan("Aadhaar: 4918 3726 5017");      // [{ type: "AADHAAR", value: "4918 3726 5017", ... }]
s.scan("UTR 412398765432 credited");    // [] (reference numbers are skipped)

aadhaar("491837265017");                // true: checksum only, no text needed`)}
<p>Numbers starting with 0 or 1 are never Aadhaar numbers. When the text says &ldquo;aadhaar&rdquo; (in English or eight Indian scripts), a number with a typo is still redacted, because the user clearly meant it as one.</p>

${h2("How do I validate a PAN number?")}
<p class="answer">A PAN is five letters, four digits and a letter, and its fourth letter must be a valid holder type (P for a person, C for a company, H, F, A, T, B, L, J, G). piilite checks both and skips codes after labels like SKU or model.</p>
${code(`import { pan } from "piilite";
pan("ABCPS1234K"); // true
pan("ABCXS1234K"); // false: X is not a holder type`)}

${h2("How does piilite check a GSTIN?")}
<p class="answer">A GSTIN must start with a real state code (01 to 38, 97 or 99), contain a valid PAN, and end with the correct mod-36 check character. piilite verifies all three, so a mistyped GSTIN is not mistaken for a valid one.</p>
${code(`import { gstin } from "piilite";
gstin("27AAPFU0939F1ZV"); // true`)}

${h2("How do I detect UPI IDs?")}
<p class="answer">piilite recognises UPI IDs on 85+ known handles such as <code>@okhdfcbank</code>, <code>@ybl</code>, <code>@paytm</code> and <code>@oksbi</code>. Any other <code>name@handle</code> counts when the text mentions UPI, GPay, PhonePe, Paytm or BHIM.</p>
${code(`import { redact } from "piilite";
redact("pay rahul.k@okhdfcbank or 9123456780@ybl"); // "pay [UPI_ID_1] or [UPI_ID_2]"`)}

${h2("Which Indian phone number formats are supported?")}
<p class="answer">piilite detects Indian mobile numbers starting with 6-9 and landlines with STD codes, in every common format. It also understands digits in Indian scripts and numbers spoken in English or Hinglish.</p>
${table(["Written as", "Detected"], [
  ["9123456780, 91234 56780, 912-345-6780", "Yes"],
  ["+91 91234 56780, +919123456780, 0091 9123456780, 919123456780", "Yes"],
  ["091234 56780, 011-23456781 (landline)", "Yes"],
  ["९१२३४५६७८० (Devanagari), ৯১২৩৪৫৬৭৮০ (Bengali)", "Yes"],
  ["nine one two three &hellip;, nau ek do teen &hellip;", "Yes"],
  ["9999999999, 9876543210 (test numbers)", "Skipped by default; masked with <code>skipFakeNumbers: false</code> or the <code>strict</code> preset"],
])}

${h2("How do I detect bank account numbers and IFSC codes?")}
<p class="answer">Bank account numbers are 9 to 18 digits, so piilite only flags them after an account label (A/c, account, khata) or a bank name such as SBI or HDFC. IFSC codes are matched by their structure: four letters, a zero, and six characters.</p>
${code(`redact("my SBI A/c 50100234567890, IFSC SBIN0004512");
// "my SBI A/c [BANK_ACCOUNT_1], IFSC [IFSC_1]"`)}

${h2("How does piilite find Indian names?")}
<p class="answer">piilite finds names from the words around them and from a dictionary of 1,100 first names and 640 surnames from every region, without an AI model.</p>
<ul>
<li><strong>Intros:</strong> my name is, mera naam &hellip; hai, myself, this is, and &ldquo;my name is&rdquo; in Hindi, Marathi, Bengali, Punjabi, Gujarati, Odia, Tamil, Telugu, Kannada and Malayalam.</li>
<li><strong>Labels:</strong> Name:, Father's Name:, Candidate:, Beneficiary:, JSON keys like <code>cust_name</code>.</li>
<li><strong>Titles and relations:</strong> Shri, Smt, Dr., Kumari, S/O, W/O, D/O.</li>
<li><strong>Patterns:</strong> initials (K. Ramesh), surname endings (-kar, -wala, -iya), résumé header lines, CSV rows.</li>
</ul>
<p>Places named after people (Gandhi Nagar, Nehru Place), schools (Vidya Mandir) and tools (MS Excel) are not flagged.</p>

${h2("How does piilite find Indian addresses?")}
<p class="answer">piilite finds addresses that start at a label (Address:, Ship to:, mera pata, ঠিকানা:), a house or village marker (Flat no, H.No, Vill., Post, Dist.) or a landmark (near, opp, Sector 15), and ends them at the PIN code.</p>
<p>A company's own address, such as &ldquo;Example Technologies Pvt Ltd, Sector 62, Noida&rdquo;, is not personal data and is left alone by default. The <code>strict</code> preset masks it too.</p>
${code(`redact("Address: Flat no 302, Sai Krupa Apartment, MG Road, Pune - 411001. Phone 9123456780");
// "Address: [ADDRESS_1]. Phone [PHONE_IN_1]"`)}

${h2("Can piilite redact cities and locations?")}
<p class="answer">Yes, with the opt-in <code>LOCATION</code> type. It is off by default because a city alone rarely identifies a person and search or matching features often need it.</p>
${code(`new Piilite({ include: ["LOCATION"] }).redact("Based in: Kotputli, Rajasthan");
// "Based in: [LOCATION_1]"`)}
`,
  },

  // ------------------------------------------------------------------ llm
  {
    path: "llm/",
    title: "Redact PII before sending prompts to ChatGPT, Claude or Gemini",
    description:
      "Mask personal data in prompts to ChatGPT, Claude, Gemini or local models, restore it in the answer, and redact streaming LLM responses with piilite.",
    h1: "Using piilite with LLMs",
    crumb: "LLM apps",
    keywords: ["redact pii before llm", "mask pii chatgpt", "llm data privacy", "pii redaction streaming", "anonymize prompt", "restore pii llm response", "express pii middleware"],
    body: () => `
<h1>Redact PII before it reaches an LLM</h1>
<p class="lead">Send user messages to ChatGPT, Claude, Gemini or a local model without sending the user's personal data, and still give a personal answer back.</p>

${h2("Why redact personal data before calling an LLM?")}
<p class="answer">Prompts you send to a hosted model leave your servers, may be logged by the provider and can end up in your own logs and traces. Redacting first keeps Aadhaar numbers, phone numbers and names out of all of them, which is what India's DPDP Act and most security reviews expect.</p>

${h2("How do I redact a prompt and restore the answer?")}
<p class="answer">Call <code>detect()</code> on the prompt, send <code>redacted</code> to the model, then call <code>restore()</code> on the answer with the <code>redactionMap</code>. Keep the map on your server.</p>
${code(`import { Piilite } from "piilite";
const shield = new Piilite({ preset: "dpdp" });

const { redacted, redactionMap } = shield.detect(userMessage);
// "Hi, I am [NAME_1], my number is [PHONE_IN_1]. Change my plan."

const answer = await callYourModel(redacted);
// "Sure [NAME_1], I have updated the plan for [PHONE_IN_1]."

const reply = shield.restore(answer, redactionMap);
// "Sure Rahul Sharma, I have updated the plan for 9123456780."`)}

${h2("What if the model changes the placeholders?")}
<p class="answer">restore() is fuzzy by default: it also restores placeholders a model rewrote, such as [NAME 1], [name_1], NAME_1 or [ NAME-1 ]. Pass <code>{ fuzzy: false }</code> for exact matching only.</p>
<p>Placeholders are case-exact: &ldquo;RAHUL&rdquo; and &ldquo;Rahul&rdquo; get separate placeholders, so each comes back exactly as the user wrote it.</p>

${h2("How do I redact streaming LLM output?")}
<p class="answer">Use <code>redactStream()</code> on any async iterable of text chunks. piilite holds back a short tail of text, so a value split across two chunks is never emitted half-redacted.</p>
${code(`for await (const piece of shield.redactStream(modelTextStream)) {
  process.stdout.write(piece);
}

// manual control
const stream = shield.createStream();
socket.on("data", (chunk) => send(stream.push(chunk)));
socket.on("end", () => send(stream.end()));

// Web Streams (fetch, Deno, edge runtimes)
response.body.pipeThrough(new TextDecoderStream()).pipeThrough(shield.transformStream());`)}

${h2("How do I redact a whole chat history or tool result?")}
<p class="answer">Use <code>redactObject()</code>. It redacts every string in an object or array and gives the same value the same placeholder everywhere, so the model can still follow the conversation.</p>
${code(`const { value, redactionMap } = shield.redactObject(
  { messages, toolResult },
  { skipKeys: ["id", "role"] }
);`)}

${h2("How do I add PII redaction to an Express API?")}
<p class="answer">Add <code>piiliteMiddleware()</code> after <code>express.json()</code>. It redacts <code>req.body</code> before your handlers run and keeps the originals on <code>req.pii</code>.</p>
${code(`import express from "express";
import { piiliteMiddleware } from "piilite/express";

const app = express();
app.use(express.json(), piiliteMiddleware({ preset: "dpdp" }));

app.post("/chat", async (req, res) => {
  const answer = await callYourModel(req.body.message); // already redacted
  res.json({ answer: req.pii.restore(answer) });
});

// reject requests that contain secrets with HTTP 422
app.use("/logs", piiliteMiddleware({ preset: "secrets", block: true }));`)}

${h2("How do I warn users before they send personal data?")}
<p class="answer">Use the <code>usePIIDetector</code> React hook to check a message as the user types and show a warning or a redacted preview.</p>
${code(`import { usePIIDetector } from "piilite/react";

function ChatInput({ text }) {
  const { hasPII, redacted } = usePIIDetector(text);
  return hasPII ? <p>This message contains personal data: {redacted}</p> : null;
}`, "jsx")}

${h2("Best practices")}
<ul>
<li>Redact model <strong>output</strong> too before you log or store it.</li>
<li>Keep the <code>redactionMap</code> on the server, never in logs, analytics or the client.</li>
<li>Use <code>mask</code> mode for display only; it keeps the last digits and is not anonymisation.</li>
<li>Use <code>onDetect</code> to count what was redacted for audits, without storing the values.</li>
</ul>
`,
  },

  // ------------------------------------------------------------------ presets
  {
    path: "presets/",
    title: "PII presets for DPDP Act 2023, KYC, GDPR, HIPAA and PCI in JS",
    description:
      "Ready-made piilite presets for India's DPDP Act 2023, KYC, fintech, PCI DSS, healthcare, HR, GDPR, HIPAA and secrets, in one line of JavaScript.",
    h1: "Presets",
    crumb: "Presets",
    keywords: ["dpdp act pii", "dpdp compliance javascript", "kyc data masking", "gdpr pii detection javascript", "hipaa redaction javascript", "pci dss masking"],
    body: () => `
<h1>Presets for DPDP, KYC, GDPR, HIPAA and more</h1>
<p class="lead">A preset is a ready-made set of PII types for one use case. Pick one with a single option and adjust it with your own options.</p>
${code(`new Piilite({ preset: "dpdp" });
new Piilite({ preset: "kyc", exclude: ["PINCODE"] }); // your options win`)}

${h2("Which presets are available?")}
${table(["Preset", "Use it for", "Covers"], [
  ["<code>dpdp</code>", "India's Digital Personal Data Protection Act, 2023", "Contact details, all Indian IDs, financial, health and employment IDs, device IDs, DOB, vehicle number, GSTIN"],
  ["<code>kyc</code>", "Identity verification", "Aadhaar, VID, PAN, voter ID, passport, DL, ration card, name, address, PIN, DOB, phone, email"],
  ["<code>fintech</code>", "Payments, lending, banking support", "Bank account, UPI, cards, CVV, OTP, PINs, PAN, Aadhaar, GSTIN, IFSC, SWIFT, passwords, contact"],
  ["<code>pci</code>", "Card data (PCI DSS)", "Card number, CVV, expiry, PINs"],
  ["<code>healthcare</code>", "Hospitals, telemedicine, insurance", "ABHA, contact details, Aadhaar, DOB, passport"],
  ["<code>hr</code>", "Payroll, hiring, résumés", "UAN, ESIC, contact details, Aadhaar, PAN, bank, IFSC, passport, DOB, DL"],
  ["<code>secrets</code>", "Logs, code, support tickets", "API keys, private keys, JWTs, tokens, connection strings, passwords, OTPs, PINs"],
  ["<code>gdpr</code>", "EU personal data", "Contact details, IDs, financial, health and device data, DOB, IBAN, SWIFT, SSN"],
  ["<code>hipaa</code>", "US health data", "Contact details, health IDs, device IDs, DOB, SSN, vehicle number, bank, cards"],
  ["<code>strict</code>", "Prompts sent to third-party models", "Everything, with a lower confidence cut-off (0.4), test-looking numbers and company addresses too"],
  ["<code>precise</code>", "Analytics where false alarms are costly", "Everything, with a higher confidence cut-off (0.8)"],
])}

${h2("What does the DPDP preset cover?")}
<p class="answer">The <code>dpdp</code> preset covers any data that can identify a person under India's Digital Personal Data Protection Act, 2023: names, contact details, Aadhaar, PAN, voter ID, passport, bank and UPI details, health IDs, employment IDs, device IDs, date of birth and vehicle numbers.</p>
<div class="note"><p>Presets help you minimise personal data. Compliance also depends on consent, purpose limits, retention and security, so a preset alone does not make an app compliant. This is not legal advice.</p></div>
`,
  },

  // ------------------------------------------------------------------ playground
  {
    path: "playground/",
    title: "piilite playground: test PII redaction in your browser",
    description:
      "Paste text and see piilite detect and mask Aadhaar, PAN, UPI, phone numbers, names and addresses live. Runs entirely in your browser; nothing is uploaded.",
    h1: "Playground",
    crumb: "Playground",
    schemaType: "WebPage",
    extraSchema: (c) => [
      {
        "@type": "WebApplication",
        "@id": `${SITE}playground/#app`,
        name: "piilite playground",
        url: `${SITE}playground/`,
        applicationCategory: "DeveloperApplication",
        browserRequirements: "Requires JavaScript and ES modules",
        operatingSystem: "Any",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        isAccessibleForFree: true,
      },
    ],
    scripts: (root) => `<script type="module" src="${root}assets/playground.js"></script>`,
    body: (c) => `
<h1>piilite playground</h1>
<p class="lead">Type or paste text and watch piilite ${esc(c.version)} redact it. Everything runs in this browser tab; nothing is uploaded. Use fake data.</p>
<div class="pg">
<div class="samples" role="group" aria-label="Sample texts">
<button type="button" data-sample="chat">Hinglish chat</button>
<button type="button" data-sample="resume">Résumé</button>
<button type="button" data-sample="kyc">KYC form</button>
<button type="button" data-sample="support">Support ticket</button>
<button type="button" data-sample="clean">No PII</button>
</div>
<label for="pg-input" class="sr">Text to scan</label>
<textarea id="pg-input" spellcheck="false"></textarea>
<div class="controls">
<label>Mode <select id="pg-mode"><option value="placeholder">placeholder</option><option value="mask">mask</option><option value="mask-all">mask-all</option><option value="remove">remove</option></select></label>
<label>Preset <select id="pg-preset"><option value="">none (all types)</option></select></label>
<label><input type="checkbox" id="pg-location"> Include LOCATION</label>
</div>
<p class="stats" id="pg-stats" aria-live="polite"></p>
<output id="pg-output" for="pg-input" aria-label="Redacted text"></output>
${table(["Type", "Value", "Severity", "Confidence"], [], { num: [3] }).replace("<tbody></tbody>", '<tbody id="pg-rows"></tbody>')}
</div>
<noscript><p>The playground needs JavaScript. You can also install piilite and run the same code locally.</p></noscript>
${h2("Use the same code in your app")}
${code(`import { Piilite } from "piilite";
const { redacted, detections } = new Piilite({ mode: "placeholder" }).detect(text);`)}
`,
  },

  // ------------------------------------------------------------------ openredaction
  {
    path: "openredaction/",
    title: "piilite vs OpenRedaction: comparison, migration and bridge",
    description:
      "piilite vs OpenRedaction on accuracy, Indian data, features and size. Migrate in one line, or add OpenRedaction's global patterns via piilite's bridge.",
    h1: "piilite vs OpenRedaction",
    crumb: "vs OpenRedaction",
    keywords: ["openredaction alternative", "piilite vs openredaction", "openredaction india", "pii library comparison javascript"],
    body: () => `
<h1>piilite vs OpenRedaction</h1>
<p class="lead">piilite is far more accurate on Indian data; OpenRedaction is broader and has enterprise modules. You can use both together.</p>

${h2("Which one should I use?")}
${table(["If you need", "Use"], [
  ["Indian users, chats, résumés, KYC, LLM prompts", "piilite"],
  ["A small bundle, the browser, edge runtimes or streaming LLM output", "piilite"],
  ["IDs from many countries", "piilite with the OpenRedaction bridge, or OpenRedaction"],
  ["PDF, DOCX, OCR or XLSX input", "piilite with the OpenRedaction bridge, or OpenRedaction"],
  ["An audit database, RBAC, multi-tenancy or webhooks", "OpenRedaction"],
])}

${h2("How accurate is each on Indian data?")}
<p class="answer">On the same held-out benchmark of ${ACCURACY.samples} samples, piilite caught ${ACCURACY.piilite.recall}% of personal data and OpenRedaction ${ACCURACY.openredaction.recall}%. OpenRedaction redacted something in ${ACCURACY.openredaction.cleanFP}% of PII-free sentences; piilite did in ${ACCURACY.piilite.cleanFP}%.</p>
${table(["Metric", "piilite", "OpenRedaction 1.1.5"], [
  ["Recall", ...better(ACCURACY.piilite.recall, ACCURACY.openredaction.recall)],
  ["Precision", ...better(ACCURACY.piilite.precision, ACCURACY.openredaction.precision)],
  ["False alarms on clean text (lower is better)", ...better(ACCURACY.piilite.cleanFP, ACCURACY.openredaction.cleanFP, false)],
], { num: [1, 2] })}
<p>OpenRedaction was run as its lite entry with default options. Its full class with NER enabled was not scored. <a href="../accuracy/">Method and per-type results</a>.</p>

${h2("How do their features compare?")}
${table(["Feature", "piilite", "OpenRedaction"], [
  ["Indian IDs with checksums (Aadhaar, PAN, GSTIN, UPI &hellip;)", "Yes, 20+ types", "Aadhaar and IFSC"],
  ["Hinglish and Indian scripts", "Yes", "No"],
  ["Patterns for other countries", "Through the bridge (110 types)", "570+ patterns, 50+ countries"],
  ["Size", "About 27 KB gzipped", "About 500 KB of core code"],
  ["Fuzzy restore of placeholders", "Yes", "Exact only"],
  ["Streaming for LLM token streams", "Yes", "Chunked streaming detector"],
  ["PDF, DOCX, OCR, XLSX", "Through the bridge", "Yes"],
  ["Presets", "DPDP, KYC, fintech, PCI, healthcare, HR, secrets, GDPR, HIPAA", "GDPR, HIPAA, CCPA, finance, education, healthcare, transport, PCI, SOC 2"],
  ["Express and React", "Yes", "Yes, plus a REST server"],
  ["Audit database, RBAC, multi-tenancy, webhooks", "No (<code>onDetect</code> hook)", "Yes"],
])}

${h2("How do I migrate from OpenRedaction?")}
<p class="answer">Change the import. piilite's <code>detect()</code> returns the same <code>{ redacted, detections, redactionMap }</code> shape, still works with <code>await</code>, and accepts OpenRedaction custom patterns unchanged.</p>
${code(`- import { OpenRedaction } from "openredaction";
- const shield = new OpenRedaction();
+ import { Piilite } from "piilite";
+ const shield = new Piilite();

  const { redacted, detections, redactionMap } = await shield.detect(text);`, "diff")}

${h2("How do I use OpenRedaction's patterns with piilite?")}
<p class="answer">Install <code>@openredaction/core</code> and import from <code>piilite/openredaction</code>. You get piilite's Indian engine plus 110 of OpenRedaction's pattern types and its document processors.</p>
${code(`npm install piilite @openredaction/core`, "bash")}
${code(`import { createGlobalShield, redactDocument, redactJson, redactCsv } from "piilite/openredaction";

const shield = createGlobalShield({ preset: "gdpr" });
await redactDocument(pdfBuffer);              // PDF, DOCX, image (OCR) or text
await redactJson(payload);
redactCsv(csvText, { columns: ["phone"] });`)}
<p>The bridge adds national IDs of 45+ countries, foreign bank formats, crypto wallets, health IDs and extra secret formats. Each type was checked against 2,060 samples of Indian text and kept only if it never matched by mistake; Indian matches always win an overlap.</p>
<div class="note"><p>In OpenRedaction 1.1.5, <code>CsvProcessor.redact()</code> can apply detections to the wrong row when the file has a header. piilite's <code>redactCsv</code> uses OpenRedaction's CSV parser but redacts cells itself, so rows stay aligned.</p></div>
`,
  },

  // ------------------------------------------------------------------ accuracy
  {
    path: "accuracy/",
    title: "piilite accuracy benchmark: recall, precision and false alarms",
    description: `piilite caught ${ACCURACY.piilite.recall}% of PII with ${ACCURACY.piilite.precision}% precision on a held-out benchmark, vs ${ACCURACY.openredaction.recall}% and ${ACCURACY.openredaction.precision}% for OpenRedaction. Method, per-type results and limits.`,
    h1: "Accuracy",
    crumb: "Accuracy",
    body: () => `
<h1>piilite accuracy benchmark</h1>
<p class="lead">On a held-out set of ${ACCURACY.samples} labelled samples, piilite caught <strong>${ACCURACY.piilite.recall}%</strong> of personal data with <strong>${ACCURACY.piilite.precision}%</strong> precision. Every ID-style type scored 100%; names and addresses are the hard part.</p>

${h2("How does piilite compare with OpenRedaction?")}
${table(["Metric (held-out set)", "piilite", "OpenRedaction 1.1.5"], [
  ["Recall: PII fully redacted", ...better(ACCURACY.piilite.recall, ACCURACY.openredaction.recall)],
  ["Precision: detections that were PII", ...better(ACCURACY.piilite.precision, ACCURACY.openredaction.precision)],
  ["Clean sentences wrongly redacted (lower is better)", ...better(ACCURACY.piilite.cleanFP, ACCURACY.openredaction.cleanFP, false)],
  ["Names", ...better(ACCURACY.piilite.names, ACCURACY.openredaction.names)],
  ["Addresses", ...better(ACCURACY.piilite.addresses, ACCURACY.openredaction.addresses)],
], { num: [1, 2] })}

${h2("How accurate is each PII type?")}
${table(["Type", "piilite recall", "OpenRedaction recall"], ACCURACY.perType.map(([t, a, b]) => [t, ...better(a, b)]), { num: [1, 2] })}

${h2("How was this measured?")}
<ul>
<li><strong>Data:</strong> synthetic samples built from templates (forms, Hinglish chat, emails, tickets, résumés, KYC, CSV and JSON rows) with fake values, plus PII-free sentences with prices, UTRs, train numbers, product codes and Hinglish chat.</li>
<li><strong>Recall</strong> counts labelled values that end up fully redacted; <strong>precision</strong> counts detections that overlap a labelled value.</li>
<li><strong>Honesty:</strong> piilite's rules were tuned on two earlier sets (99.9% and 98.3% recall there). The held-out set reported here was written in one pass after tuning and never used to change a rule.</li>
<li><strong>OpenRedaction</strong> ran as its lite entry with default options; its full class with NER was not scored.</li>
</ul>
<p>Reproduce it from the repository: <code>npm run eval:all</code>.</p>

${h2("Has piilite been tested on real data?")}
<p class="answer">Yes, on a small set: 61 real résumé and profile chunks (17 people) from a hiring platform's AI search index. Every occurrence of each person's name, email, phone number, GitHub and LinkedIn was redacted, with no wrong detections. The text never left the server and is not in the repository.</p>

${h2("What are the known limits?")}
<ul>
<li>Names with no clue around them, and addresses with no label, marker or PIN code, can be missed.</li>
<li>Bank account, passport, UAN, ESIC and OTP need a label nearby.</li>
<li>The benchmark is synthetic and the real-data check is small; real text will contain other cases.</li>
<li>Names of famous people are redacted like anyone else's.</li>
</ul>
<p>Found a miss? <a href="${REPO}/issues">Open an issue</a> with a fake-data example.</p>
`,
  },

  // ------------------------------------------------------------------ faq
  {
    path: "faq/",
    title: "piilite FAQ: Aadhaar detection, LLM redaction, DPDP and more",
    description:
      "Answers about piilite: detecting Aadhaar and PAN in JavaScript, masking PII for LLMs, Hinglish support, the DPDP Act, accuracy, limits and alternatives.",
    h1: "Frequently asked questions",
    crumb: "FAQ",
    faq: FAQ,
    body: () => `
<h1>piilite FAQ</h1>
<p class="lead">Short answers to the questions people ask most about piilite.</p>
<div class="faq">
${FAQ.map(({ q, a }) => `<details><summary><h2 style="display:inline;font-size:inherit;margin:0">${esc(q)}</h2></summary><div><p>${a}</p></div></details>`).join("\n")}
</div>
`,
  },
];
