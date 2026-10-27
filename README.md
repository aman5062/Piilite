# piilite

**Lightweight, zero-dependency, India-first PII detection and masking for JavaScript.**

piilite finds and masks personal data before it reaches your logs, your database or an AI model:
Aadhaar, PAN, GSTIN, UPI IDs, +91 phone numbers, bank accounts, voter IDs, vehicle numbers, Indian names and
addresses, OTPs, API keys and more. It uses patterns, checksums and rules only. No AI model, no network calls,
no dependencies.

- **~21 KB gzipped**, zero dependencies, runs in Node 18+, Bun, Deno and the browser
- **Fast**: a 1 KB message in about 1.4 ms
- **Real checksums**: Verhoeff (Aadhaar / VID), GSTIN mod-36, Luhn (cards, RuPay, IMEI), IBAN mod-97, PAN holder type
- **Understands how Indians write**: Hinglish (`mera naam … hai`, `ghar ka pata`), Devanagari, Indic digits
  (`९८७६५४३२१०`), spoken numbers (`nau aath saat…`), disguised emails (`rahul dot sharma at gmail dot com`)
- **Built for LLM apps**: consistent placeholders, `restore()` for model answers, `redactObject()` for chat payloads
- **OpenRedaction-compatible API**: `detect()` returns the same `{ redacted, detections, redactionMap }` shape and
  OpenRedaction `PIIPattern` objects work as custom patterns

## Install

```bash
npm install piilite
# or straight from GitHub
npm install github:aman5062/Piilite
```

## Quick start

```js
import { Piilite } from "piilite";

const shield = new Piilite();

const { redacted, redactionMap } = shield.detect(
  "Myself Ankit Kumar Gupta, call 9123456780 or pay ankit@okhdfcbank. PAN ABCPS1234K, OTP is 482913"
);

console.log(redacted);
// Myself [NAME_1], call [PHONE_IN_1] or pay [UPI_ID_1]. PAN [PAN_1], OTP is [OTP_1]
```

### Use with an AI model

Redact before sending, restore after the answer comes back:

```js
const { redacted, redactionMap } = shield.detect(userMessage);

const answer = await callYourModel(redacted);      // the model only ever sees [NAME_1], [PHONE_IN_1] …

const finalAnswer = shield.restore(answer, redactionMap);
```

For a whole chat payload or tool result, use `redactObject()`. Every string inside is redacted and the same value
always gets the same placeholder:

```js
const { value, redactionMap } = shield.redactObject({ messages });
```

Also run model **output** through `shield.redact()` before you log or store it.

### Masking modes

```js
new Piilite({ mode: "placeholder" }).redact("call 9123456780"); // call [PHONE_IN_1]   (default)
new Piilite({ mode: "mask" }).redact("call 9123456780");        // call XXXXXX6780
new Piilite({ mode: "mask" }).redact("PAN ABCPS1234K");         // PAN XXXXXX234K
new Piilite({ mode: "mask" }).redact("rahul@gmail.com");        // rXXXX@gmail.com
new Piilite({ mode: "mask-all", maskChar: "*" }).redact("call 9123456780"); // call **********
new Piilite({ mode: "remove" }).redact("call 9123456780 now");  // call  now
new Piilite({ mode: (m) => `<${m.type}>` }).redact("call 9123456780");     // call <PHONE_IN>
```

## What it detects

### India

| Type | Example | How it is checked |
|---|---|---|
| `AADHAAR` | `4918 3726 5013` | 12 digits, starts 2-9, **Verhoeff checksum** (accepted without checksum only when the text says "aadhaar") |
| `AADHAAR_VID` | 16-digit Virtual ID | Verhoeff + "VID" nearby |
| `PAN` | `ABCPS1234K` | structure + valid holder type (P, C, H, F, A, T, B, L, J, G) |
| `GSTIN` | `27AAPFU0939F1ZV` | state code + embedded PAN + **mod-36 checksum** |
| `TAN`, `CIN` | `DELA12345B`, `L17110MH1973PLC019786` | structure (TAN needs a label) |
| `UPI_ID` | `rahul@okhdfcbank`, `9123456780@ybl` | 90+ known handles; any handle when UPI/GPay/PhonePe is mentioned |
| `BANK_ACCOUNT` | `A/c 50100234567890` | 9-18 digits after an account / khata label |
| `IFSC` | `HDFC0001234` | structure |
| `PHONE_IN` | `+91 91234 56780`, `091234-56780`, `011-23456781`, `nine one two…` | mobile (6-9 start) and landline, every common format, spoken digits |
| `VOTER_ID` | `ABC1234567` | EPIC structure |
| `PASSPORT_IN` | `K1234567` | structure + "passport" label |
| `DRIVING_LICENSE` | `MH12 20110012345` | state code + RTO + year + number |
| `VEHICLE_REG` | `MH 12 AB 1234`, `22 BH 1234 AA` | real state/UT codes, Bharat series |
| `RATION_CARD` | `Ration card no: …` | label |
| `ABHA`, `ABHA_ADDRESS` | `91-1234-5678-9012`, `rahul@abdm` | ABDM health IDs |
| `UAN`, `ESIC` | `UAN 100123456789` | label |
| `OTP`, `PIN_SECRET` | `OTP is 482913`, `UPI PIN 4821` | label |
| `DATE_OF_BIRTH` | `DOB 12/05/1998`, `janm tithi …` | date after a birth label, validated calendar date |
| `PINCODE` | `pincode 110001`, `Patna - 800001` | label, or after one of 200+ Indian cities / states |
| `NAME` | `Rahul Sharma`, `mera naam priya verma hai`, `Shri …`, `S/O …`, `मेरा नाम …` | intro phrases, honorifics, relations, Indian name dictionary |
| `ADDRESS` | `Flat no 302, …, Pune - 411001`, `Vill. Rampur, Post …, Bihar 843302` | address labels, house / village markers, ends at PIN code |

### Global

`EMAIL` (also disguised), `PHONE` (international, US), `CREDIT_CARD` (Luhn, incl. RuPay), `CVV`, `CARD_EXPIRY`,
`IBAN` (mod-97), `SWIFT_BIC`, `SSN`, `IP_ADDRESS` (v4/v6), `MAC_ADDRESS`, `IMEI`, `SOCIAL_PROFILE`
(LinkedIn, GitHub, X, Instagram, Facebook, Telegram, WhatsApp links).

### Secrets

`API_KEY` (OpenAI, Anthropic, AWS, Google, GitHub, Stripe, **Razorpay**, Slack, npm, PyPI, GitLab, generic
`api_key=` assignments), `PRIVATE_KEY`, `JWT`, `BEARER_TOKEN`, `CONNECTION_STRING`, `URL_CREDENTIALS`, `PASSWORD`.

## Options

```js
new Piilite({
  mode: "placeholder",          // "placeholder" | "mask" | "mask-all" | "remove" | (match) => string
  types: ["AADHAAR", "PAN"],    // only these types
  exclude: ["IP_ADDRESS"],      // everything except these
  allow: ["support@acme.in", /@acme\.in$/], // never redact these values
  minConfidence: 0.5,           // raise to 0.7 for fewer, surer matches
  maskChar: "X",
  keepLast: 4,                  // digits left visible in "mask" mode
  placeholder: (type, n) => `<<${type}-${n}>>`,
  customPatterns: [
    { type: "EMPLOYEE_ID", regex: /\bEMP-\d{5}\b/g, priority: 90, severity: "medium" },
  ],
});
```

### API

| Method | Returns |
|---|---|
| `detect(text)` | `{ original, redacted, detections, redactionMap, stats }` |
| `redact(text)` | redacted string |
| `scan(text)` | matches only: `[{ type, value, start, end, severity, confidence }]` |
| `hasPII(text)` | `boolean` |
| `redactObject(obj)` | `{ value, redactionMap }`, deep-redacts every string |
| `restore(text, map)` | text with placeholders replaced by the original values |

Shortcuts with default options: `redact`, `scan`, `detect`, `hasPII`, `restore`. Validators are exported too:
`verhoeff`, `luhn`, `aadhaar`, `pan`, `gstin`.

## Migrating from OpenRedaction

```diff
- import { OpenRedaction } from "openredaction";
- const shield = new OpenRedaction();
+ import { Piilite } from "piilite";
+ const shield = new Piilite();

  const { redacted, detections, redactionMap } = await shield.detect(text); // same shape, await still works
```

Your OpenRedaction `customPatterns` (`{ type, regex, priority, validator, placeholder, severity }`) work unchanged.

## How accurate is it?

piilite catches numbers and IDs with a fixed format very reliably, because it checks real checksums and context
words, and it avoids the usual false alarms (order numbers, dates, prices, versions, train numbers).

Names and addresses are the hard part for any library without an AI model. piilite handles the common Indian
ways of writing them (intros, honorifics, S/O / W/O, labels, PIN codes, a name dictionary), but an unusual name
with no clue around it ("Spoke to Xyzabc yesterday") can still get through. If you need to catch every name in
free text, run a small NER model after piilite.

Found a miss or a false alarm? Open an issue with an example sentence (with fake data) so it can become a test.

## Development

```bash
npm test        # node:test, no dependencies
npm run bench
```

## Credits

The overall approach and the OpenRedaction-compatible API are inspired by
[OpenRedaction](https://github.com/sam247/openredaction) (MIT). piilite's patterns and engine are written
separately, with a focus on Indian data.

## License

MIT © Aman kumar keshri
