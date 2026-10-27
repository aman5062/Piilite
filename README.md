# piilite

[![npm version](https://img.shields.io/npm/v/piilite.svg)](https://www.npmjs.com/package/piilite)
[![npm downloads](https://img.shields.io/npm/dm/piilite.svg)](https://www.npmjs.com/package/piilite)
[![bundle size](https://img.shields.io/bundlephobia/minzip/piilite)](https://bundlephobia.com/package/piilite)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![types: TypeScript](https://img.shields.io/badge/types-TypeScript-3178c6.svg)](index.d.ts)

**Lightweight, zero-dependency, India-first PII detection and masking for JavaScript.**

**Docs and live playground: [aman5062.github.io/Piilite](https://aman5062.github.io/Piilite/)** · **npm: [piilite](https://www.npmjs.com/package/piilite)**

piilite finds and masks personal data before it reaches your logs, your database or an AI model:
Aadhaar, PAN, GSTIN, UPI IDs, +91 phone numbers, bank accounts, voter IDs, vehicle numbers, Indian names and
addresses, OTPs, API keys and more. The core uses patterns, checksums and rules only: no AI model, no network
calls, no dependencies. An optional bridge adds [OpenRedaction](https://github.com/sam247/openredaction)'s global
pattern library and document processors on top.

- **25 KB gzipped**, zero dependencies, ESM + CommonJS, Node 18+, Bun, Deno, browsers
- **Fast**: about 1.5 ms for a 1 KB message, 37 ms worst case on 20 KB of hostile input (ReDoS-tested)
- **Real checksums**: Verhoeff (Aadhaar / VID), GSTIN mod-36, Luhn (cards incl. RuPay & Maestro, IMEI), IBAN mod-97
- **Writes like India writes**: Hinglish (`mera naam … hai`, `ghar ka pata`), 9 Indian scripts, Indic digits
  (`९८७६५४३२१०`), spoken numbers (`nau aath saat…`), disguised emails (`rahul dot sharma at gmail dot com`)
- **Built for LLM apps**: consistent placeholders, fuzzy `restore()` for model answers, streaming redaction for
  token streams, `redactObject()` for chat payloads
- **Presets** for DPDP Act 2023, KYC, fintech, PCI, healthcare, HR, GDPR, HIPAA, secrets
- **Drop-in for OpenRedaction**: same `detect()` result shape, same custom-pattern format, same hook name

## Install

```bash
npm install piilite        # or: pnpm add piilite · yarn add piilite · bun add piilite

# optional: global ID types + PDF / DOCX / CSV / JSON / XLSX processors
npm install @openredaction/core
```

## Quick start

```js
import { Piilite } from "piilite";          // or: const { Piilite } = require("piilite")

const shield = new Piilite();

const { redacted, redactionMap } = shield.detect(
  "Myself Ankit Kumar Gupta, call 9123456780 or pay ankit@okhdfcbank. PAN ABCPS1234K, OTP is 482913"
);

console.log(redacted);
// Myself [NAME_1], call [PHONE_IN_1] or pay [UPI_ID_1]. PAN [PAN_1], OTP is [OTP_1]
```

## Use with an AI model

```js
const { redacted, redactionMap } = shield.detect(userMessage);
const answer = await callYourModel(redacted);            // the model only sees [NAME_1], [PHONE_IN_1] …
const finalAnswer = shield.restore(answer, redactionMap); // also fixes "[NAME 1]", "[name_1]", "NAME_1"
```

**Streaming answers.** Text is held back just long enough that a value split across two chunks is never
leaked:

```js
for await (const piece of shield.redactStream(llmTokenStream)) process.stdout.write(piece);

// or push / end yourself
const stream = shield.createStream();
socket.on("data", (chunk) => send(stream.push(chunk)));
socket.on("end", () => send(stream.end()));

// or as a Web TransformStream
response.body.pipeThrough(new TextDecoderStream()).pipeThrough(shield.transformStream());
```

**Whole payloads.** Every string is redacted and the same value always gets the same placeholder:

```js
const { value, redactionMap } = shield.redactObject({ messages }, { skipKeys: ["id"] });
```

Also run model **output** through `shield.redact()` before you log or store it.

## Masking modes

```js
new Piilite({ mode: "placeholder" }).redact("call 9123456780"); // call [PHONE_IN_1]   (default)
new Piilite({ mode: "mask" }).redact("call 9123456780");        // call XXXXXX6780
new Piilite({ mode: "mask" }).redact("PAN ABCPS1234K");         // PAN XXXXXX234K
new Piilite({ mode: "mask" }).redact("rahul@gmail.com");        // rXXXX@gmail.com
new Piilite({ mode: "mask-all", maskChar: "*" }).redact("call 9123456780"); // call **********
new Piilite({ mode: "remove" }).redact("call 9123456780 now");  // call  now
new Piilite({ mode: (m) => `<${m.type}>` }).redact("call 9123456780");     // call <PHONE_IN>
```

## Presets

```js
new Piilite({ preset: "dpdp" });   // India's DPDP Act 2023: any data about an identifiable person
```

| Preset | Covers |
|---|---|
| `dpdp` | contact details, all Indian IDs, financial, health, employment, device IDs, DOB, vehicle, GSTIN |
| `kyc` | Aadhaar, VID, PAN, voter ID, passport, DL, ration card, name, address, PIN, DOB, phone, email |
| `fintech` | bank, UPI, cards, CVV, OTP, PINs, PAN, Aadhaar, GSTIN, IFSC, SWIFT, passwords, contact |
| `pci` | card number, CVV, expiry, PINs |
| `healthcare` | ABHA, contact details, Aadhaar, DOB, passport |
| `hr` | UAN, ESIC, contact details, Aadhaar, PAN, bank, IFSC, passport, DOB, DL |
| `secrets` | API keys, private keys, JWTs, tokens, connection strings, passwords, OTPs, PINs |
| `gdpr`, `hipaa` | the identifiers those laws name, as far as they apply to text |
| `strict` | everything, a lower (0.4) confidence cut-off, test-looking numbers and company addresses too |
| `precise` | everything, with a higher (0.8) confidence cut-off |

Your own options override the preset: `new Piilite({ preset: "kyc", exclude: ["PINCODE"] })`.

## What it detects

### India

| Type | Example | How it is checked |
|---|---|---|
| `AADHAAR` | `4918 3726 5017` | 12 digits, starts 2-9, **Verhoeff checksum**; "aadhaar" in any of 8 scripts allows a typo'd number; UTR / order / ref numbers are skipped |
| `AADHAAR_VID` | 16-digit Virtual ID | Verhoeff + "VID" nearby |
| `PAN` | `ABCPS1234K` | structure + valid holder type; skipped after SKU / model / product labels |
| `GSTIN` | `27AAPFU0939F1ZV` | state code + embedded PAN + **mod-36 checksum** |
| `TAN`, `CIN` | `DELA12345B`, `L17110MH1973PLC019786` | structure (TAN needs a label) |
| `UPI_ID` | `rahul@okhdfcbank`, `9123456780@ybl` | 85+ known handles; any handle when UPI / GPay / PhonePe is mentioned |
| `BANK_ACCOUNT` | `A/c 50100234567890`, `my SBI 3456…` | 9-18 digits after an account / khata label or one of 40+ bank names |
| `IFSC` | `HDFC0001234` | structure |
| `PHONE_IN` | `+91 91234 56780`, `919123456780`, `011-23456781`, `nine one two…` | mobile and landline in every common format, spoken digits |
| `VOTER_ID` | `ABC1234567` | EPIC structure |
| `PASSPORT_IN` | `K1234567` | structure + "passport" label |
| `DRIVING_LICENSE` | `MH12 20110012345` | state code + RTO + year + number |
| `VEHICLE_REG` | `MH 12 AB 1234`, `22 BH 1234 AA` | real state/UT codes, Bharat series |
| `RATION_CARD`, `UAN`, `ESIC` | `UAN 100123456789` | label |
| `ABHA`, `ABHA_ADDRESS` | `91-1234-5678-9012`, `rahul@abdm` | ABDM health IDs |
| `OTP`, `PIN_SECRET` | `OTP is 482913`, `UPI PIN 4821` | label |
| `DATE_OF_BIRTH` | `DOB 12/05/1998`, `janm tithi …` | date after a birth label, validated calendar date |
| `PINCODE` | `pincode 110001`, `Patna - 800001` | label, or after one of 200+ Indian cities / states |
| `LOCATION` *(opt-in)* | `Based in: Kotputli, Rajasthan`, `Hometown: …` | profile labels and "Town, State" pairs; off by default because a city alone rarely identifies anyone and search / matching often needs it. Turn on with `include: ["LOCATION"]` |
| `NAME` | see below | rules + a 1,700-name dictionary |
| `ADDRESS` | see below | labels, house / village / landmark markers, PIN codes |

**Names** are found from: intros (`my name is`, `mera naam … hai`, `myself`, `this is`), form and JSON labels
(`Name:`, `Father's Name:`, `cust_name=`, `"full_name": "…"`), roles (`Candidate:`, `Caller`, `Owner`,
`Beneficiary:`, `cc:`), greetings (`Dear`, `Congratulations`, `Thanks`), honorifics (`Shri`, `Smt`, `Dr.`),
relations (`S/O`, `W/O`, `D/O`), sentence cues (`X joined`, `interview with X`, `bro X se baat hui`), CSV rows,
initial-first names (`K. Ramesh`, `A.K. Sharma`), Indian surname endings (`-kar`, `-wala`, `-iya`, `-ani`),
a dictionary of 1,100 first names and 640 surnames from every region, and "my name is" in Hindi, Marathi,
Bengali, Punjabi, Gujarati, Odia, Tamil, Telugu, Kannada and Malayalam. Places named after people
(`Gandhi Nagar`, `Nehru Place`), schools (`… Vidya Mandir`) and tools (`MS Excel`) are not names. The first line of
a résumé is taken as the name when contact details follow.

**Addresses** are found after labels (`Address:`, `Permanent address`, `Ship to:`, `mera pata`, `ঠিকানা:`,
`முகவரி:` …), from house and village markers (`Flat no`, `H.No`, `Vill.`, `Post`, `Dist.`), from landmarks
(`near Hanuman Mandir, Sector 15, Noida`), after verbs (`shifted to`, `update address to`), and with no label at
all when a comma-separated tail ends in `City PIN`. A company's own address ("Example Technologies Pvt Ltd, Sector 62,
Noida") is not personal data, so it is left alone by default; the `strict` preset masks it too.

### Global

`EMAIL` (also disguised), `PHONE` (international, US), `CREDIT_CARD` (Luhn, incl. RuPay and Maestro), `CVV`,
`CARD_EXPIRY`, `IBAN` (mod-97), `SWIFT_BIC`, `SSN`, `IP_ADDRESS` (v4/v6), `MAC_ADDRESS`, `IMEI`, `SOCIAL_PROFILE`
(LinkedIn, GitHub, GitLab, LeetCode, CodeChef, Codeforces, HackerRank, GeeksforGeeks, Kaggle, X, Instagram,
Facebook, Telegram, WhatsApp and more; links, labelled handles like `GitHub: handle`, and bare LinkedIn slugs).

### Secrets

`API_KEY` (OpenAI, Anthropic, AWS, Google, GitHub, Stripe, **Razorpay**, Slack, npm, PyPI, GitLab, generic
`api_key=`), `PRIVATE_KEY`, `JWT`, `BEARER_TOKEN`, `CONNECTION_STRING`, `URL_CREDENTIALS`, `PASSWORD`.

## OpenRedaction bridge (optional)

With `@openredaction/core` installed, `piilite/openredaction` adds OpenRedaction's library on top of the India
engine:

```js
import { createGlobalShield, redactDocument, redactJson, redactCsv, detectXlsx } from "piilite/openredaction";

const shield = createGlobalShield({ preset: "gdpr" });  // piilite + 110 OpenRedaction pattern types

await redactDocument(pdfBuffer);                // PDF / DOCX / image (OCR) / text → piilite.detect()
await redactJson(payload);                      // OpenRedaction JsonProcessor on the piilite detector
redactCsv(csvText, { columns: ["phone"] });     // cell by cell, header kept, placeholders shared
await detectXlsx(workbookBuffer);               // needs the `xlsx` package
```

- **110 extra types**: national IDs of 45+ countries (UK NINO / NHS, Brazil CPF, Mexico CURP, Singapore NRIC,
  UAE Emirates ID, …), passport MRZ lines, UK / US / AU / MX bank formats, 10 crypto wallets, health IDs (MRN,
  NPI, DEA, EHIC), VIN, IMSI and 15 more secret formats (AWS secret keys, Azure, GCP service accounts, Twilio,
  SendGrid, Mailgun, Heroku, Docker, Kubernetes, Firebase …).
- **Only types that stay quiet on Indian text.** Each one was run against 2,060 samples (clean text, Indian PII
  and Indian UTR / order / booking / AWB / loan numbers) and dropped if it matched anything it shouldn't.
  OpenRedaction's name, ZIP, licence-plate, gamer-tag and business-reference patterns are left out. Re-run the
  check with `node eval/openredaction-noise.js`.
- **Indian matches always win.** Bridge patterns rank below every piilite pattern.
- `redactCsv` uses OpenRedaction's CSV parser but redacts cells itself, because `CsvProcessor.redact()` in
  1.1.5 maps detections to the wrong row when the file has a header.

## Express and React

```js
import { piiliteMiddleware } from "piilite/express";

app.use(express.json(), piiliteMiddleware({ preset: "dpdp" }));
app.post("/chat", async (req, res) => {
  const answer = await callYourModel(req.body.message);  // already redacted
  res.json({ answer: req.pii.restore(answer) });          // originals stay on the server
});

app.use("/logs", piiliteMiddleware({ preset: "secrets", block: true }));  // 422 if a request has PII
```

```jsx
import { usePIIDetector } from "piilite/react";

function ChatInput({ text }) {
  const { hasPII, redacted } = usePIIDetector(text);
  return hasPII ? <Warning preview={redacted} /> : null;
}
```

## Options and API

```js
new Piilite({
  preset: "dpdp",
  mode: "placeholder",          // "placeholder" | "mask" | "mask-all" | "remove" | (match) => string
  types: ["AADHAAR", "PAN"],    // only these types
  exclude: ["IP_ADDRESS"],      // everything except these
  include: ["LOCATION"],        // also run opt-in types
  allow: ["support@acme.in", /@acme\.in$/], // never redact these values
  minConfidence: 0.5,
  skipFakeNumbers: true,        // false also masks test numbers like 9876543210 / 9999999999
  maskChar: "X",
  keepLast: 4,                  // digits left visible in "mask" mode
  placeholder: (type, n) => `<<${type}-${n}>>`,
  maxInputSize: 5_000_000,      // RangeError above this; use the stream API for more
  onDetect: (result) => audit.log(result.stats.byType), // audit hook
  customPatterns: [{ type: "EMPLOYEE_ID", regex: /\bEMP-\d{5}\b/g, priority: 90, severity: "medium" }],
});
```

| Method | Returns |
|---|---|
| `detect(text)` | `{ original, redacted, detections, redactionMap, stats: { piiCount, byType, processingTime } }` |
| `redact(text)` | redacted string |
| `scan(text)` | matches only: `[{ type, value, start, end, severity, confidence }]` |
| `hasPII(text)` | `boolean` |
| `redactObject(obj, { skipKeys })` | `{ value, redactionMap }` |
| `restore(text, map, { fuzzy })` | text with placeholders replaced by the original values |
| `createStream()` / `redactStream(iterable)` / `transformStream()` | streaming redaction |

Shortcuts with default options: `redact`, `scan`, `detect`, `hasPII`, `restore`. Validators are exported too:
`verhoeff`, `luhn`, `aadhaar`, `pan`, `gstin`.

## Accuracy

`eval/` holds three labelled synthetic sets (fake data) and a scorer that runs piilite and OpenRedaction on the
same text. **Recall** counts labelled values that end up fully redacted, **precision** counts detections that
hit a labelled value, and **false alarms** counts PII-free sentences (prices, UTRs, trains, product codes,
Hinglish chat) where something was redacted anyway.

The rules were tuned while looking at `dataset.json` and `holdout.json`, so those scores are optimistic.
`holdout2.json` was written in one go after tuning and never used to change a rule, so **its score is the
honest estimate**:

| `holdout2.json`, 480 samples | piilite | OpenRedaction 1.1.5 |
|---|---|---|
| Recall | **84.3%** | 45.7% |
| Precision | **99.7%** | 76.7% |
| False alarms on clean text | **6.7%** | 86.7% |
| Names | **71.6%** | 64.2% |
| Addresses | **50.0%** | 0% |
| Aadhaar, PAN, GSTIN, UPI, bank, IFSC, phone, email, cards, DL, voter ID, passport, vehicle, OTP, DOB, API keys | **100% each** | 0-100% |

For reference, the tuned sets score 99.9% (`dataset.json`) and 98.3% (`holdout.json`) recall.

**Real-data check.** piilite was also run on 61 real résumé and profile chunks (17 people) from a hiring
platform's AI search index; the text never left the server and none of it is in this repo. Every occurrence of
each person's own name, email, phone number, GitHub and LinkedIn was redacted, with no wrong detections.
Cities are only redacted with the opt-in `LOCATION` type.

```bash
npm run eval        # honest holdout score
npm run eval:all    # every set + the OpenRedaction noise check
```

## Limitations

- **Names with no clue around them** are still the hardest part ("Spoke to her, Kshama was upset" or a bare
  unknown name in a sentence). Rules can't catch every name without an AI model. Run a small NER model after
  piilite if you need that.
- **Addresses** without a label, marker or `City PIN` ending are missed, and where an address ends is a guess.
- **Context-only types** (bank account, passport, UAN, ESIC, OTP, PIN code) need a nearby label.
- **Synthetic evaluation.** The eval sets are generated, not real user data; real text will have cases they
  don't. Please send failing examples (with fake data) as issues so they become tests.
- **Test numbers are skipped on purpose.** Sequences like `9876543210` and `9999999999` are almost always fake, so they
  are not masked unless you set `skipFakeNumbers: false` or use the `strict` preset.
- **The `redactionMap` holds the real values.** Keep it on the server and never log it. `mask` mode is not
  anonymisation, it keeps the last digits.
- **Restore depends on the model** keeping placeholders recognisable; fuzzy matching covers the common rewrites.
- Some public figures' names are redacted too ("Sachin Tendulkar"), since piilite can't tell who is famous.

## Development

Tests, the evaluation sets and the website source live in the [GitHub repository](https://github.com/aman5062/Piilite),
not in the npm package (they need dev-only packages such as Express, React and OpenRedaction).

```bash
git clone https://github.com/aman5062/Piilite.git && cd Piilite && npm install
npm test         # 80+ tests, node:test, no runtime dependencies
npm run build    # CommonJS builds in dist/
npm run bench
npm run eval:all
npm run site     # rebuilds the docs website in docs/
```

## Contributing

Bug reports and examples of misses are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md). Please use fake data only.
Security issues: see [SECURITY.md](SECURITY.md).

## Credits

Built on ideas, the API shape and (through the optional bridge) the pattern library and processors of
[OpenRedaction](https://github.com/sam247/openredaction) (MIT). piilite's own patterns and engine are written
separately, with a focus on Indian data.

## License

MIT © Aman kumar keshri
