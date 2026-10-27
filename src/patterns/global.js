import * as v from "../validators.js";
import { keywords } from "../text.js";

// Curated, low-noise global patterns. The set is modelled on OpenRedaction's
// personal / financial / network categories, limited to formats that rarely
// collide with Indian text.

const TLD = "[a-z]{2,24}";
const OBF_AT = String.raw`(?:\s*[\(\[\{<]\s*at\s*[\)\]\}>]\s*|\s+at\s+|\s*@\s*)`;
const OBF_DOT = String.raw`(?:\s*[\(\[\{<]\s*dot\s*[\)\]\}>]\s*|\s+dot\s+|\.)`;
const PART = "[a-z0-9_+-]{1,64}";

export const globalPatterns = [
  {
    type: "EMAIL",
    regex: /(?<![\w.+-])[a-z0-9](?:[a-z0-9._%+-]{0,63})@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,24}(?![\w-])/gi,
    validator: (val) => !/\.\./.test(val) && !/@(?:example|test|sample)\.(?:com|org)$/i.test(val),
    priority: 90,
    severity: "high",
    confidence: 0.95,
  },
  {
    // "rahul dot sharma at gmail dot com", "rahul[at]gmail[dot]com"
    type: "EMAIL",
    regex: new RegExp(
      String.raw`(?<![\w.+-])${PART}(?:${OBF_DOT}${PART}){0,4}${OBF_AT}${PART}(?:${OBF_DOT}${PART}){0,4}${OBF_DOT}(?:com|in|co\.in|co|net|org|edu|gov|io|ai|me|info|biz|ac|nic|res|us|uk)(?![\w])`,
      "gi"
    ),
    // must actually be disguised; plain emails are handled above
    validator: (val) => /[\(\[\{<]\s*(?:at|dot)|\s(?:at|dot)\s|\s@|@\s/i.test(val),
    priority: 89,
    severity: "high",
  },
  {
    type: "CREDIT_CARD",
    regex: /(?<![\w])\d(?:[ -]?\d){12,18}(?![\w])/g,
    validator: v.creditCard,
    context: keywords(["card", "credit", "debit", "visa", "mastercard", "rupay", "amex", "cc"]),
    priority: 94,
    severity: "critical",
    confidence: 0.9,
  },
  {
    type: "CVV",
    regex: /(?:\bcvv2?\b|\bcvc\b|card\s+verification|security\s+code)[^0-9\n]{0,12}?(\d{3,4})(?!\d)/gid,
    group: 1,
    priority: 98,
    severity: "critical",
    confidence: 0.95,
  },
  {
    type: "CARD_EXPIRY",
    regex: /(?:\bexp(?:iry|iration)?\b|\bexpires\b|valid\s+(?:thru|through|till|upto|until))[^0-9\n]{0,10}?((?:0[1-9]|1[0-2])\s?[\/-]\s?(?:20)?\d{2})(?!\d)/gid,
    group: 1,
    priority: 76,
    severity: "high",
  },
  {
    type: "IBAN",
    regex: /(?<![A-Za-z0-9])[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){2,7}(?:\s?[A-Z0-9]{1,4})?(?![A-Za-z0-9])/g,
    validator: v.iban,
    priority: 85,
    severity: "critical",
  },
  {
    type: "SWIFT_BIC",
    regex: /(?<![A-Za-z0-9])[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?(?![A-Za-z0-9])/g,
    context: keywords(["swift", "bic", "swift code", "bic code"]),
    requireContext: true,
    priority: 72,
    severity: "medium",
  },
  {
    type: "SSN",
    regex: /(?<![\w-])(?!000|666|9\d\d)\d{3}-(?!00)\d{2}-(?!0000)\d{4}(?![\w-])/g,
    context: keywords(["ssn", "social security"]),
    priority: 84,
    severity: "critical",
  },
  {
    // international numbers other than +91 (those are handled by PHONE_IN)
    type: "PHONE",
    regex: /(?<![\w+])(?:\+|00)(?!91)[1-9]\d{0,2}[\s.-]?\(?\d{1,4}\)?(?:[\s.-]?\d{2,5}){2,4}(?![\w])/g,
    validator: (val, _ctx, _text, _start, _end, opts) => {
      const d = v.digitsOf(val).replace(/^00/, "");
      return d.length >= 8 && d.length <= 15 && !v.isFake(d, opts);
    },
    priority: 77,
    severity: "high",
  },
  {
    // (415) 555-0132
    type: "PHONE",
    regex: /(?<![\w(])\(\d{3}\)\s?\d{3}[\s.-]\d{4}(?![\w])/g,
    priority: 76,
    severity: "high",
  },
  {
    type: "IP_ADDRESS",
    regex: /(?<![\w.])(?:\d{1,3}\.){3}\d{1,3}(?![\w.])/g,
    validator: (val, ctx) => v.ipv4(val) && !/\b(?:version|ver|v)\s*$/i.test(ctx.split("\u0000")[0]),
    priority: 60,
    severity: "medium",
  },
  {
    type: "IP_ADDRESS",
    regex: /(?<![\w:])(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}(?![\w:])|(?<![\w:])(?:[0-9a-f]{1,4}:){1,7}:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4}(?![\w:])/gi,
    validator: (val) => /[0-9a-f]{3}/i.test(val) && (val.match(/:/g) ?? []).length >= 3,
    priority: 60,
    severity: "medium",
  },
  {
    type: "MAC_ADDRESS",
    regex: /(?<![\w:-])[0-9a-f]{2}(?:([:-])[0-9a-f]{2})(?:\1[0-9a-f]{2}){4}(?![\w:-])/gi,
    priority: 60,
    severity: "low",
  },
  {
    type: "SOCIAL_PROFILE",
    regex: /(?:https?:\/\/)?(?:www\.|[a-z]{2}\.)?(?:linkedin\.com\/in|github\.com|gitlab\.com|bitbucket\.org|twitter\.com|x\.com|instagram\.com|facebook\.com|fb\.com|t\.me|wa\.me|leetcode\.com(?:\/u)?|codechef\.com\/users|codeforces\.com\/profile|hackerrank\.com(?:\/profile)?|geeksforgeeks\.org\/user|auth\.geeksforgeeks\.org\/user|kaggle\.com|medium\.com|dev\.to|behance\.net|dribbble\.com|stackoverflow\.com\/users\/\d+|youtube\.com\/(?:@|c\/|channel\/)?|threads\.net\/@?|hashnode\.com\/@)\/?@?[A-Za-z0-9_.\-%]{2,100}\/?/gi,
    validator: (val) => !/\/(?:login|signup|share|sharer|home|explore|search|about|help|settings|intent|hashtag|problems|contest|discuss|jobs|pricing|features)\b/i.test(val),
    priority: 86,
    severity: "medium",
  },
  {
    // "GitHub: handle", "Leetcode (handle)", "LinkedIn - handle"
    type: "SOCIAL_PROFILE",
    regex: /\b(?:github|gitlab|leetcode|linkedin|codechef|codeforces|hackerrank|hackerearth|kaggle|gfg|geeksforgeeks|twitter|insta(?:gram)?|medium|behance|dribbble|telegram|discord)\s*(?:id|handle|username|profile)?\s*(?::|-|\(|=)\s*@?([A-Za-z0-9][A-Za-z0-9_.\-]{2,60})(?=\)|[\s,|;]|$)/gid,
    group: 1,
    // a handle has a digit, "_", "-", ".", camelCase, or is a long lowercase word; "Projects" is not one
    validator: (val) => /\d|[_.-]|[a-z][A-Z]/.test(val) || (val.length >= 6 && /^[a-z]+$/.test(val)),
    priority: 85,
    severity: "medium",
  },
  {
    // LinkedIn vanity slug with its generated suffix: "first-last-a1b2c3d4e"
    type: "SOCIAL_PROFILE",
    regex: /(?<![\w\/-])[a-z]+(?:-[a-z]+){1,4}-[0-9a-f]{6,12}(?![\w-])/g,
    validator: (val) => /\d/.test(val.split("-").pop()),
    priority: 84,
    severity: "medium",
  },
  {
    type: "IMEI",
    regex: /(?<![\w])\d{15}(?![\w])/g,
    validator: (val) => v.luhn(val),
    context: keywords(["imei"]),
    requireContext: true,
    priority: 83,
    severity: "medium",
  },
];
