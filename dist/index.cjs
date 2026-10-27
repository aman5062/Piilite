var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.js
var index_exports = {};
__export(index_exports, {
  PII_TYPES: () => PII_TYPES,
  Piilite: () => Piilite,
  StreamRedactor: () => StreamRedactor,
  aadhaar: () => aadhaar,
  builtinPatterns: () => builtinPatterns,
  default: () => index_default,
  detect: () => detect,
  gstin: () => gstin,
  gstinChecksum: () => gstinChecksum,
  hasPII: () => hasPII,
  luhn: () => luhn,
  pan: () => pan,
  presets: () => presets,
  redact: () => redact,
  restore: () => restore,
  scan: () => scan,
  verhoeff: () => verhoeff,
  verhoeffDigit: () => verhoeffDigit
});
module.exports = __toCommonJS(index_exports);

// src/text.js
var DIGIT_ZEROS = [2406, 2534, 2662, 2790, 2918, 3046, 3174, 3302, 3430, 65296];
function normalize(text) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    let ch = text[i];
    for (const zero of DIGIT_ZEROS) {
      if (code >= zero && code <= zero + 9) {
        ch = String(code - zero);
        break;
      }
    }
    if (code === 8203 || code === 65279 || code === 160 || code >= 8192 && code <= 8202) ch = " ";
    else if (code === 65312) ch = "@";
    else if (code === 8208 || code === 8209 || code === 8210 || code === 8211 || code === 8212) ch = "-";
    out += ch;
  }
  return out;
}
function contextAround(text, start, end, before = 40, after = 20) {
  return (text.slice(Math.max(0, start - before), start) + " \0 " + text.slice(end, end + after)).toLowerCase();
}
function contextBefore(text, start, before = 40) {
  return text.slice(Math.max(0, start - before), start).toLowerCase();
}
function keywords(list) {
  return new RegExp(`(?:^|[^a-z0-9])(?:${list.join("|")})(?![a-z0-9])`, "i");
}

// src/engine.js
var DEFAULT_CONFIDENCE = 0.8;
function runPattern(p, norm) {
  const out = [];
  if (p.find) {
    for (const m2 of p.find(norm)) out.push({ ...m2, conf: m2.confidence ?? p.confidence ?? DEFAULT_CONFIDENCE });
    return out;
  }
  let re = p.regex;
  const needIndices = p.group != null && !re.hasIndices;
  if (!re.global || needIndices) {
    const flags = new Set(re.flags.split(""));
    flags.add("g");
    if (p.group != null) flags.add("d");
    re = new RegExp(re.source, [...flags].join(""));
  }
  re.lastIndex = 0;
  let m;
  while (m = re.exec(norm)) {
    if (m[0] === "") {
      re.lastIndex++;
      continue;
    }
    let start = m.index;
    let end = start + m[0].length;
    if (p.group != null) {
      const span2 = m.indices?.[p.group];
      if (!span2) continue;
      [start, end] = span2;
    }
    if (end <= start) continue;
    const value = norm.slice(start, end);
    const ctx = p.contextOnly === "before" ? contextBefore(norm, start, p.contextWindow ?? 40) : contextAround(norm, start, end, p.contextWindow ?? 40, p.contextAfter ?? 20);
    const hasContext = p.context ? p.context.test(ctx) : false;
    if (p.requireContext && !hasContext) continue;
    if (p.negativeContext && !hasContext && p.negativeContext.test(contextBefore(norm, start, 30))) continue;
    let conf = p.confidence ?? DEFAULT_CONFIDENCE;
    if (p.validator && !p.validator(value, ctx, norm, start, end)) {
      if (!(p.lenient && hasContext)) continue;
      conf = Math.min(conf, 0.7);
    } else if (hasContext) {
      conf = Math.min(1, conf + 0.15);
    }
    out.push({ start, end, conf });
  }
  return out;
}
var TRIM_HEAD = /^[\s,.;:\-–()/]+/;
var TRIM_TAIL = /[\s,;:\-–(/]+$/;
function trimSpan(text, start, end) {
  const s = text.slice(start, end);
  const head = s.match(TRIM_HEAD)?.[0].length ?? 0;
  const tail = s.slice(head).match(TRIM_TAIL)?.[0].length ?? 0;
  return [start + head, end - tail];
}
function subtract(start, end, accepted) {
  let pieces = [[start, end]];
  for (const a of accepted) {
    const next = [];
    for (const [s, e] of pieces) {
      if (a.end <= s || a.start >= e) next.push([s, e]);
      else {
        if (a.start > s) next.push([s, a.start]);
        if (a.end < e) next.push([a.end, e]);
      }
    }
    pieces = next;
  }
  return pieces;
}
var overlaps = (a, b) => a.start < b.end && b.start < a.end;
function findAll(text, patterns, opts) {
  if (opts.maxInputSize && text.length > opts.maxInputSize) {
    throw new RangeError(
      `piilite: input is ${text.length} characters, above maxInputSize (${opts.maxInputSize}). Split it or use the stream API.`
    );
  }
  const norm = normalize(text);
  const candidates = [];
  for (const p of patterns) {
    for (const m of runPattern(p, norm)) {
      if (m.conf < opts.minConfidence) continue;
      candidates.push({ p, start: m.start, end: m.end, conf: m.conf });
    }
  }
  candidates.sort(
    (a, b) => (b.p.priority ?? 50) - (a.p.priority ?? 50) || b.end - b.start - (a.end - a.start) || a.start - b.start
  );
  const accepted = [];
  for (const c of candidates) {
    const clash = accepted.some((a) => overlaps(a, c));
    if (!clash) {
      accepted.push(c);
      continue;
    }
    if (!c.p.region) continue;
    for (const [s, e] of subtract(c.start, c.end, accepted)) {
      const [ts, te] = trimSpan(norm, s, e);
      if (/[\p{L}\p{N}]{2}/u.test(norm.slice(ts, te))) accepted.push({ ...c, start: ts, end: te });
    }
  }
  accepted.sort((a, b) => a.start - b.start);
  return accepted.map((a) => ({
    type: a.p.type,
    value: text.slice(a.start, a.end),
    start: a.start,
    end: a.end,
    severity: a.p.severity ?? "medium",
    confidence: Math.round(a.conf * 100) / 100,
    pattern: a.p
  }));
}

// src/validators.js
var digitsOf = (s) => s.replace(/\D/g, "");
var V_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];
var V_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];
var V_INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];
function verhoeff(num) {
  const d = digitsOf(num);
  if (!d) return false;
  let c = 0;
  for (let i = 0; i < d.length; i++) {
    c = V_D[c][V_P[i % 8][+d[d.length - 1 - i]]];
  }
  return c === 0;
}
function verhoeffDigit(num) {
  const d = digitsOf(num);
  let c = 0;
  for (let i = 0; i < d.length; i++) {
    c = V_D[c][V_P[(i + 1) % 8][+d[d.length - 1 - i]]];
  }
  return V_INV[c];
}
function luhn(num) {
  const d = digitsOf(num);
  if (d.length < 12) return false;
  let sum = 0;
  let dbl = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = +d[i];
    if (dbl) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}
function isJunkNumber(d) {
  if (/^(\d)\1+$/.test(d)) return true;
  return "01234567890".includes(d) || "09876543210".includes(d);
}
var CARD_PREFIX = /^(?:4|5[0-8]|2[2-7]|3[47]|3[0689]|35|6|81|82)/;
function creditCard(value) {
  const d = digitsOf(value);
  return d.length >= 13 && d.length <= 19 && CARD_PREFIX.test(d) && luhn(d) && !isJunkNumber(d);
}
function aadhaar(value) {
  const d = digitsOf(value);
  return d.length === 12 && /^[2-9]/.test(d) && !isJunkNumber(d) && verhoeff(d);
}
function aadhaarVid(value) {
  const d = digitsOf(value);
  return d.length === 16 && !isJunkNumber(d) && verhoeff(d);
}
var PAN_HOLDER = "PCHFATBLJGE";
function pan(value) {
  const v = value.toUpperCase();
  return /^[A-Z]{3}[A-Z][A-Z]\d{4}[A-Z]$/.test(v) && PAN_HOLDER.includes(v[3]) && !/^0000/.test(v.slice(5, 9));
}
var GST_STATES = /* @__PURE__ */ new Set([
  ...Array.from({ length: 38 }, (_, i) => String(i + 1).padStart(2, "0")),
  "97",
  "99"
]);
var B36 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
function gstinChecksum(value) {
  const v = value.toUpperCase();
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const prod = B36.indexOf(v[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(prod / 36) + prod % 36;
  }
  return B36[(36 - sum % 36) % 36];
}
function gstin(value) {
  const v = value.toUpperCase();
  return v.length === 15 && GST_STATES.has(v.slice(0, 2)) && pan(v.slice(2, 12)) && v[14] === gstinChecksum(v);
}
function iban(value) {
  const v = value.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(v)) return false;
  const re = (v.slice(4) + v.slice(0, 4)).replace(/[A-Z]/g, (c) => c.charCodeAt(0) - 55);
  let rem = 0;
  for (const ch of re) rem = (rem * 10 + +ch) % 97;
  return rem === 1;
}
function indianMobile(value) {
  let d = digitsOf(value);
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 13 && d.startsWith("091")) d = d.slice(3);
  else if (d.length === 14 && d.startsWith("0091")) d = d.slice(4);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d.length === 10 && /^[6-9]/.test(d) && !isJunkNumber(d);
}
function indianLandline(value) {
  let d = digitsOf(value);
  if (d.startsWith("91") && d.length === 12) d = d.slice(2);
  else if (d.startsWith("0") && d.length === 11) d = d.slice(1);
  else return false;
  return d.length === 10 && /^[1-5]/.test(d) && !isJunkNumber(d);
}
function ipv4(value) {
  const parts = value.split(".");
  return parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p) && +p <= 255 && !(p.length > 1 && p[0] === "0"));
}
function validDate(day, month, year) {
  const d = +day;
  const m = +month;
  let y = +year;
  if (String(year).length === 2) y += y > 30 ? 1900 : 2e3;
  if (m < 1 || m > 12 || d < 1 || y < 1900 || y > 2100) return false;
  return d <= new Date(y, m, 0).getDate();
}

// src/data/places.js
var STATES = [
  "andhra pradesh",
  "arunachal pradesh",
  "assam",
  "bihar",
  "chhattisgarh",
  "goa",
  "gujarat",
  "haryana",
  "himachal pradesh",
  "jharkhand",
  "karnataka",
  "kerala",
  "madhya pradesh",
  "maharashtra",
  "manipur",
  "meghalaya",
  "mizoram",
  "nagaland",
  "odisha",
  "orissa",
  "punjab",
  "rajasthan",
  "sikkim",
  "tamil nadu",
  "telangana",
  "tripura",
  "uttar pradesh",
  "uttarakhand",
  "uttaranchal",
  "west bengal",
  "andaman",
  "nicobar",
  "chandigarh",
  "dadra",
  "daman",
  "diu",
  "delhi",
  "new delhi",
  "jammu",
  "kashmir",
  "ladakh",
  "lakshadweep",
  "puducherry",
  "pondicherry",
  "ncr",
  "india"
];
var CITIES = [
  "mumbai",
  "bombay",
  "pune",
  "nagpur",
  "nashik",
  "thane",
  "navi mumbai",
  "aurangabad",
  "solapur",
  "kolhapur",
  "amravati",
  "bengaluru",
  "bangalore",
  "mysuru",
  "mysore",
  "mangaluru",
  "mangalore",
  "hubli",
  "dharwad",
  "belgaum",
  "belagavi",
  "chennai",
  "madras",
  "coimbatore",
  "madurai",
  "trichy",
  "tiruchirappalli",
  "salem",
  "tirunelveli",
  "vellore",
  "erode",
  "hyderabad",
  "secunderabad",
  "warangal",
  "vijayawada",
  "visakhapatnam",
  "vizag",
  "guntur",
  "nellore",
  "tirupati",
  "kurnool",
  "kochi",
  "cochin",
  "ernakulam",
  "thiruvananthapuram",
  "trivandrum",
  "kozhikode",
  "calicut",
  "thrissur",
  "kollam",
  "kannur",
  "kolkata",
  "calcutta",
  "howrah",
  "durgapur",
  "asansol",
  "siliguri",
  "kharagpur",
  "ahmedabad",
  "surat",
  "vadodara",
  "baroda",
  "rajkot",
  "bhavnagar",
  "jamnagar",
  "gandhinagar",
  "anand",
  "jaipur",
  "jodhpur",
  "udaipur",
  "kota",
  "ajmer",
  "bikaner",
  "alwar",
  "lucknow",
  "kanpur",
  "agra",
  "varanasi",
  "banaras",
  "prayagraj",
  "allahabad",
  "meerut",
  "ghaziabad",
  "noida",
  "greater noida",
  "bareilly",
  "aligarh",
  "moradabad",
  "gorakhpur",
  "jhansi",
  "mathura",
  "ayodhya",
  "faizabad",
  "saharanpur",
  "gurugram",
  "gurgaon",
  "faridabad",
  "panipat",
  "ambala",
  "karnal",
  "rohtak",
  "hisar",
  "sonipat",
  "ludhiana",
  "amritsar",
  "jalandhar",
  "patiala",
  "bathinda",
  "mohali",
  "bhopal",
  "indore",
  "jabalpur",
  "gwalior",
  "ujjain",
  "sagar",
  "rewa",
  "satna",
  "raipur",
  "bhilai",
  "bilaspur",
  "durg",
  "korba",
  "patna",
  "gaya",
  "bhagalpur",
  "muzaffarpur",
  "darbhanga",
  "purnia",
  "begusarai",
  "sitamarhi",
  "hajipur",
  "ara",
  "arrah",
  "chhapra",
  "motihari",
  "samastipur",
  "ranchi",
  "jamshedpur",
  "dhanbad",
  "bokaro",
  "hazaribagh",
  "deoghar",
  "bhubaneswar",
  "cuttack",
  "rourkela",
  "berhampur",
  "sambalpur",
  "puri",
  "guwahati",
  "dibrugarh",
  "silchar",
  "jorhat",
  "tezpur",
  "shillong",
  "imphal",
  "aizawl",
  "kohima",
  "dimapur",
  "agartala",
  "gangtok",
  "itanagar",
  "dehradun",
  "haridwar",
  "rishikesh",
  "haldwani",
  "roorkee",
  "nainital",
  "shimla",
  "dharamshala",
  "mandi",
  "solan",
  "srinagar",
  "leh",
  "panaji",
  "panjim",
  "margao",
  "vasco"
];
var escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+");
var PLACE_LIST = [...STATES, ...CITIES];
var CITY_OR_STATE = PLACE_LIST.map(escape).join("|");

// src/patterns/india.js
var STATE_CODES = "AN|AP|AR|AS|BR|CG|CH|DD|DL|DN|GA|GJ|HP|HR|JH|JK|KA|KL|LA|LD|MH|ML|MN|MP|MZ|NL|OD|OR|PB|PY|RJ|SK|TN|TR|TS|UK|UA|UP|WB";
var STATE_SET = new Set(STATE_CODES.split("|"));
var UPI_HANDLES = [
  "ok(?:axis|hdfcbank|icici|sbi)",
  "ybl",
  "ibl",
  "axl",
  "paytm",
  "pt(?:hdfc|sbi|yes|axis)",
  "upi",
  "apl",
  "yapl",
  "rapl",
  "axisbank",
  "axisb",
  "icici",
  "sbi",
  "hdfcbank",
  "kotak",
  "kmbl",
  "wa(?:icici|hdfcbank|axis|sbi)",
  "jupiteraxis",
  "fbl",
  "ikwik",
  "freecharge",
  "airtel",
  "jio",
  "idfcbank",
  "idfcfirst",
  "indus",
  "federal",
  "pnb",
  "barodampay",
  "cnrb",
  "boi",
  "unionbank",
  "uboi",
  "kbl",
  "rbl",
  "yesbank",
  "yesbankltd",
  "dbs",
  "hsbc",
  "sc",
  "citi",
  "citigold",
  "abfspay",
  "slice",
  "naviaxis",
  "superyes",
  "goaxb",
  "tapicici",
  "timecosmos",
  "postbank",
  "ippb",
  "mahb",
  "indianbank",
  "iob",
  "ucobank",
  "centralbank",
  "equitas",
  "aubank",
  "dlb",
  "kvb",
  "tmb",
  "csbpay",
  "jkb",
  "obc",
  "allbank",
  "andb",
  "vijb",
  "denabank",
  "syndicate",
  "corporation",
  "hdfcbankjd",
  "amazonpay",
  "apay",
  "okbizaxis",
  "pockets",
  "mobikwik",
  "ezeepay",
  "fam",
  "omni",
  "pingpay",
  "jarunion",
  "shriramhdfcbank",
  "yescred",
  "niyoicici",
  "cmsidfc"
].join("|");
var REFERENCE = keywords([
  "utr",
  "rrn",
  "upi ref",
  "ref",
  "ref no",
  "reference",
  "txn",
  "transaction",
  "txn id",
  "order",
  "order id",
  "invoice",
  "inv",
  "receipt",
  "ticket",
  "awb",
  "tracking",
  "pnr",
  "booking",
  "sku",
  "item",
  "product",
  "model",
  "part",
  "serial",
  "batch",
  "lot",
  "imei",
  "folio",
  "policy",
  "claim",
  "loan",
  "emi",
  "cust id"
]);
var BANKS = [
  "sbi",
  "state bank",
  "hdfc",
  "icici",
  "axis",
  "kotak",
  "pnb",
  "punjab national",
  "bob",
  "bank of baroda",
  "canara",
  "union bank",
  "boi",
  "bank of india",
  "idbi",
  "idfc",
  "indusind",
  "yes bank",
  "federal",
  "indian bank",
  "iob",
  "uco",
  "central bank",
  "bandhan",
  "au bank",
  "rbl",
  "south indian bank",
  "karnataka bank",
  "kvb",
  "city union",
  "dbs",
  "hsbc",
  "citi",
  "standard chartered",
  "paytm payments",
  "airtel payments",
  "india post",
  "ippb",
  "cooperative bank",
  "gramin bank"
];
var MONTHS = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
var noState = (value) => {
  const code = value.slice(0, 2).toUpperCase();
  return STATE_SET.has(code) ? code : null;
};
var plateCase = (value) => {
  const code = value.slice(0, 2);
  return code === code.toUpperCase() || !/\s/.test(value);
};
var indiaPatterns = [
  // ---------------------------------------------------------------- secrets typed in chat
  {
    type: "OTP",
    regex: /(?:\botp\b|one[\s-]?time[\s-]?pass(?:word|code)|verification code|auth(?:entication)? code|login code|\bओटीपी)[^0-9\n]{0,24}?(\d{4,8})(?!\d)/gid,
    group: 1,
    priority: 98,
    severity: "critical",
    confidence: 0.95,
    placeholder: "[OTP_{n}]"
  },
  {
    type: "PIN_SECRET",
    regex: /(?:\b(?:upi|atm|debit card|credit card|card|net ?banking)\s*pin|\bm-?pin|\bt-?pin)\b[^0-9\n]{0,16}?(\d{4,6})(?!\d)/gid,
    group: 1,
    priority: 98,
    severity: "critical",
    confidence: 0.95
  },
  // ---------------------------------------------------------------- UIDAI
  {
    // 16 digit Virtual ID, only with context because it is the same length as a card
    type: "AADHAAR_VID",
    regex: /(?<![\w])\d{4}([\s-]?)\d{4}\1\d{4}\1\d{4}(?![\w])/g,
    validator: aadhaarVid,
    context: keywords(["vid", "virtual id", "virtual-id", "aadhaar vid", "aadhar vid"]),
    requireContext: true,
    lenient: true,
    priority: 97,
    severity: "critical"
  },
  {
    type: "AADHAAR",
    regex: /(?<![\w])[2-9]\d{3}([\s-]?)\d{4}\1\d{4}(?![\w-])/g,
    validator: aadhaar,
    context: keywords(["aadhaar", "aadhar", "adhaar", "adhar", "aadhaar card", "uid", "uidai", "\u0906\u0927\u093E\u0930", "\u0986\u09A7\u09BE\u09B0", "\u0B86\u0BA4\u0BBE\u0BB0\u0BCD", "\u0C06\u0C27\u0C3E\u0C30\u0C4D", "\u0C86\u0CA7\u0CBE\u0CB0\u0CCD", "\u0D06\u0D27\u0D3E\u0D7C", "\u0A86\u0AA7\u0ABE\u0AB0", "\u0A06\u0A27\u0A3E\u0A30"]),
    negativeContext: REFERENCE,
    lenient: true,
    priority: 93,
    severity: "critical",
    confidence: 0.85
  },
  // ---------------------------------------------------------------- employment / health IDs (context only)
  {
    type: "UAN",
    regex: /(?<![\w])\d{12}(?![\w])/g,
    context: keywords(["uan", "universal account number", "epf", "pf no", "pf number", "provident fund"]),
    requireContext: true,
    contextOnly: "before",
    priority: 96,
    severity: "high"
  },
  {
    type: "ESIC",
    regex: /(?<![\w])(?:\d{17}|\d{10})(?![\w])/g,
    context: keywords(["esic", "esi no", "esi number", "insurance number", "ip number"]),
    requireContext: true,
    contextOnly: "before",
    priority: 96,
    severity: "high"
  },
  {
    type: "ABHA",
    regex: /(?<![\w-])\d{2}-\d{4}-\d{4}-\d{4}(?![\w-])/g,
    context: keywords(["abha", "health id", "ndhm", "abdm", "ayushman"]),
    priority: 96,
    severity: "high"
  },
  {
    type: "ABHA",
    regex: /(?<![\w])\d{14}(?![\w])/g,
    context: keywords(["abha", "health id", "ndhm", "abdm", "ayushman"]),
    requireContext: true,
    priority: 96,
    severity: "high"
  },
  {
    type: "ABHA_ADDRESS",
    regex: /(?<![\w.\-])[a-z0-9][\w.]{2,31}@(?:abdm|sbx|ndhm)(?![\w@]|\.\w)/gi,
    priority: 95,
    severity: "high"
  },
  // ---------------------------------------------------------------- tax
  {
    type: "GSTIN",
    regex: /(?<![A-Za-z0-9])\d{2}[A-Za-z]{5}\d{4}[A-Za-z][1-9A-Za-z][Zz][0-9A-Za-z](?![A-Za-z0-9])/g,
    validator: gstin,
    context: keywords(["gst", "gstin", "gst no", "gst number"]),
    lenient: true,
    priority: 95,
    severity: "medium"
  },
  {
    type: "PAN",
    regex: /(?<![A-Za-z0-9])[A-Za-z]{5}\d{4}[A-Za-z](?![A-Za-z0-9])/g,
    validator: pan,
    context: keywords(["pan", "pan card", "pan no", "pan number", "permanent account", "\u092A\u0948\u0928"]),
    negativeContext: REFERENCE,
    lenient: true,
    priority: 90,
    severity: "critical",
    confidence: 0.85
  },
  {
    type: "TAN",
    regex: /(?<![A-Za-z0-9])[A-Za-z]{4}\d{5}[A-Za-z](?![A-Za-z0-9])/g,
    context: keywords(["tan", "tan no", "tan number", "tax deduction"]),
    requireContext: true,
    priority: 89,
    severity: "medium"
  },
  {
    type: "CIN",
    regex: /(?<![A-Za-z0-9])[LUlu]\d{5}[A-Za-z]{2}\d{4}[A-Za-z]{3}\d{6}(?![A-Za-z0-9])/g,
    validator: (val) => STATE_SET.has(val.slice(6, 8).toUpperCase()),
    priority: 88,
    severity: "low"
  },
  // ---------------------------------------------------------------- banking
  {
    type: "UPI_ID",
    regex: new RegExp(`(?<![\\w.\\-])[\\w.\\-]{2,256}@(?:${UPI_HANDLES})(?![\\w@]|\\.\\w)`, "gi"),
    priority: 91,
    severity: "high",
    confidence: 0.9
  },
  {
    // any handle, but only when the text talks about UPI
    type: "UPI_ID",
    regex: /(?<![\w.\-])[\w.\-]{2,256}@[a-z]{2,20}(?![\w@]|\.\w)/gi,
    context: keywords(["upi", "vpa", "gpay", "google pay", "phonepe", "phone pe", "paytm", "bhim", "pay to", "send to", "upi id"]),
    requireContext: true,
    priority: 90,
    severity: "high"
  },
  {
    type: "BANK_ACCOUNT",
    regex: /(?<![\w])\d(?:[\s-]?\d){8,17}(?![\w])/g,
    validator: (val) => !isJunkNumber(digitsOf(val)),
    context: keywords([
      "a/c",
      "a/c no",
      "ac no",
      "acc",
      "acc no",
      "acct",
      "account",
      "account no",
      "account number",
      "bank",
      "khata",
      "khata number",
      "saving",
      "savings",
      "current account",
      "\u092C\u0948\u0902\u0915",
      "\u0916\u093E\u0924\u093E",
      ...BANKS
    ]),
    requireContext: true,
    contextOnly: "before",
    contextWindow: 30,
    priority: 92,
    severity: "critical"
  },
  {
    type: "IFSC",
    regex: /(?<![A-Za-z0-9])[A-Za-z]{4}0[A-Za-z0-9]{6}(?![A-Za-z0-9])/g,
    validator: (val, ctx) => val === val.toUpperCase() || /ifsc/i.test(ctx),
    context: keywords(["ifsc", "ifsc code", "branch"]),
    priority: 70,
    severity: "medium"
  },
  // ---------------------------------------------------------------- phones
  {
    type: "PHONE_IN",
    regex: /(?<![\w+])(?:(?:\+|00)\s?91[\s.-]*|91[\s.-]+|91(?=[6-9]\d{9}(?!\d))|0)?[6-9](?:[\s.-]?\d){9}(?![\w])/g,
    validator: indianMobile,
    context: keywords(["phone", "mobile", "mob", "cell", "call", "contact", "whatsapp", "number", "no", "ph", "tel", "\u092B\u093C\u094B\u0928", "\u092E\u094B\u092C\u093E\u0907\u0932"]),
    negativeContext: REFERENCE,
    priority: 80,
    severity: "high",
    confidence: 0.85
  },
  {
    type: "PHONE_IN",
    // landline: 0 + STD code (2-4 digits) + local number, 10 digits after the 0
    regex: /(?<![\w+])(?:\+91[\s-]?|0)[1-5]\d{1,3}[\s-]?\d{6,8}(?![\w])/g,
    validator: indianLandline,
    priority: 79,
    severity: "high"
  },
  {
    // "nine eight seven six ..." or Hinglish "nau aath saat ..."
    type: "PHONE_IN",
    regex: /(?<![a-z])(?:(?:zero|oh|one|two|three|four|five|six|seven|eight|nine|double|triple|shunya|ek|do|teen|char|chaar|paanch|panch|chhe|chhah|chheh|saat|aath|nau)(?:[\s,.-]+|$)){8,}/gi,
    validator: (val) => {
      const tokens = val.toLowerCase().match(/[a-z]+/g) ?? [];
      const digits = tokens.filter((t) => t !== "double" && t !== "triple").length;
      return digits >= 7;
    },
    priority: 78,
    severity: "high"
  },
  // ---------------------------------------------------------------- government IDs
  {
    type: "VOTER_ID",
    regex: /(?<![A-Za-z0-9])[A-Za-z]{3}\d{7}(?![A-Za-z0-9])/g,
    validator: (val, ctx) => val === val.toUpperCase() || /voter|epic|election/i.test(ctx),
    negativeContext: REFERENCE,
    context: keywords(["voter", "voter id", "epic", "election card", "election id", "matdata", "\u092E\u0924\u0926\u093E\u0924\u093E"]),
    priority: 85,
    severity: "high",
    confidence: 0.7
  },
  {
    type: "PASSPORT_IN",
    regex: /(?<![A-Za-z0-9])[A-PR-WYa-pr-wy][1-9]\d\s?\d{4}[1-9](?![A-Za-z0-9])/g,
    context: keywords(["passport", "passport no", "passport number", "\u092A\u093E\u0938\u092A\u094B\u0930\u094D\u091F"]),
    requireContext: true,
    priority: 87,
    severity: "critical"
  },
  {
    type: "DRIVING_LICENSE",
    regex: new RegExp(`(?<![A-Za-z0-9])(?:${STATE_CODES})[\\s-]?\\d{2}[\\s-]?(?:19|20)\\d{2}[\\s-]?\\d{7}(?!\\d)`, "gi"),
    validator: (val) => noState(val) !== null,
    context: keywords(["dl", "d.l", "driving", "licence", "license"]),
    priority: 88,
    severity: "high"
  },
  {
    // older / irregular licence numbers, only right after a licence label
    type: "DRIVING_LICENSE",
    regex: /(?:\bdl\b|\bd\.l\.|driving\s+licen[cs]e|\blicen[cs]e)\s*(?:no\.?|number|#)?\s*[:\-]?\s*([A-Za-z]{2}[\s-]?\d{1,2}[\sA-Za-z0-9\/-]{5,16}\d)(?![\w])/gid,
    group: 1,
    validator: (val) => noState(val) !== null,
    priority: 87,
    severity: "high"
  },
  {
    type: "VEHICLE_REG",
    regex: new RegExp(
      `(?<![A-Za-z0-9])(?:${STATE_CODES})[\\s-]?\\d{1,2}[\\s-]?(?:[A-Za-z]{1,3}[\\s-]?)?\\d{4}(?![A-Za-z0-9])`,
      "gi"
    ),
    validator: (val) => noState(val) !== null && plateCase(val),
    context: keywords(["vehicle", "car", "bike", "scooter", "gaadi", "gadi", "registration", "reg no", "number plate", "rc"]),
    priority: 70,
    severity: "medium"
  },
  {
    // Bharat series: 22 BH 1234 AA
    type: "VEHICLE_REG",
    regex: /(?<![A-Za-z0-9])\d{2}[\s-]?BH[\s-]?\d{4}[\s-]?[A-Z]{1,2}(?![A-Za-z0-9])/gi,
    priority: 71,
    severity: "medium"
  },
  {
    type: "RATION_CARD",
    regex: /(?:ration\s*card|राशन\s*कार्ड)\s*(?:no\.?|number|#)?\s*[:\-]?\s*([A-Za-z0-9\/-]{8,20})(?![\w])/gid,
    group: 1,
    validator: (val) => /\d{4}/.test(val),
    priority: 86,
    severity: "high"
  },
  // ---------------------------------------------------------------- dates of birth
  {
    type: "DATE_OF_BIRTH",
    regex: new RegExp(
      `(?:\\bdob\\b|\\bd\\.o\\.b\\.?|date\\s+of\\s+birth|birth\\s*date|\\bborn(?:\\s+on)?|janm(?:\\s*tithi|\\s*din)?|\u091C\u0928\u094D\u092E(?:\\s*\u0924\u093F\u0925\u093F)?)[^0-9A-Za-z\\n]{0,12}?(?:is\\s+|hai\\s+)?(\\d{1,2}[\\/.\\-]\\d{1,2}[\\/.\\-](?:19|20)?\\d{2}|(?:19|20)\\d{2}-\\d{2}-\\d{2}|\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTHS})[a-z]*,?\\s+(?:19|20)\\d{2}|(?:${MONTHS})[a-z]*\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+(?:19|20)\\d{2})(?!\\d)`,
      "gid"
    ),
    group: 1,
    validator: (val) => {
      const m = val.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
      if (m) return validDate(m[1], m[2], m[3]) || validDate(m[2], m[1], m[3]);
      const iso = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (iso) return validDate(iso[3], iso[2], iso[1]);
      return true;
    },
    priority: 75,
    severity: "high"
  },
  // ---------------------------------------------------------------- PIN codes
  {
    type: "PINCODE",
    regex: /(?<![\w])[1-9]\d{2}\s?\d{3}(?![\w])/g,
    context: keywords(["pin", "pincode", "pin code", "postal code", "postal", "zip", "zipcode", "\u092A\u093F\u0928", "\u092A\u093F\u0928\u0915\u094B\u0921"]),
    requireContext: true,
    contextOnly: "before",
    contextWindow: 20,
    priority: 50,
    severity: "medium"
  },
  {
    // "Mumbai 400053", "Patna - 800001", "Delhi-110001"
    type: "PINCODE",
    regex: new RegExp(`(?<=\\b(?:${CITY_OR_STATE})[\\s,.-]{1,3})[1-9]\\d{2}\\s?\\d{3}(?![\\w])(?!\\s+(?:area|areas|region|zone|belt|circle|division))`, "gi"),
    priority: 50,
    severity: "medium"
  }
];

// src/patterns/global.js
var OBF_AT = String.raw`(?:\s*[\(\[\{<]\s*at\s*[\)\]\}>]\s*|\s+at\s+|\s*@\s*)`;
var OBF_DOT = String.raw`(?:\s*[\(\[\{<]\s*dot\s*[\)\]\}>]\s*|\s+dot\s+|\.)`;
var PART = "[a-z0-9_+-]{1,64}";
var globalPatterns = [
  {
    type: "EMAIL",
    regex: /(?<![\w.+-])[a-z0-9](?:[a-z0-9._%+-]{0,63})@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,24}(?![\w-])/gi,
    validator: (val) => !/\.\./.test(val) && !/@(?:example|test|sample)\.(?:com|org)$/i.test(val),
    priority: 90,
    severity: "high",
    confidence: 0.95
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
    severity: "high"
  },
  {
    type: "CREDIT_CARD",
    regex: /(?<![\w])\d(?:[ -]?\d){12,18}(?![\w])/g,
    validator: creditCard,
    context: keywords(["card", "credit", "debit", "visa", "mastercard", "rupay", "amex", "cc"]),
    priority: 94,
    severity: "critical",
    confidence: 0.9
  },
  {
    type: "CVV",
    regex: /(?:\bcvv2?\b|\bcvc\b|card\s+verification|security\s+code)[^0-9\n]{0,12}?(\d{3,4})(?!\d)/gid,
    group: 1,
    priority: 98,
    severity: "critical",
    confidence: 0.95
  },
  {
    type: "CARD_EXPIRY",
    regex: /(?:\bexp(?:iry|iration)?\b|\bexpires\b|valid\s+(?:thru|through|till|upto|until))[^0-9\n]{0,10}?((?:0[1-9]|1[0-2])\s?[\/-]\s?(?:20)?\d{2})(?!\d)/gid,
    group: 1,
    priority: 76,
    severity: "high"
  },
  {
    type: "IBAN",
    regex: /(?<![A-Za-z0-9])[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){2,7}(?:\s?[A-Z0-9]{1,4})?(?![A-Za-z0-9])/g,
    validator: iban,
    priority: 85,
    severity: "critical"
  },
  {
    type: "SWIFT_BIC",
    regex: /(?<![A-Za-z0-9])[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?(?![A-Za-z0-9])/g,
    context: keywords(["swift", "bic", "swift code", "bic code"]),
    requireContext: true,
    priority: 72,
    severity: "medium"
  },
  {
    type: "SSN",
    regex: /(?<![\w-])(?!000|666|9\d\d)\d{3}-(?!00)\d{2}-(?!0000)\d{4}(?![\w-])/g,
    context: keywords(["ssn", "social security"]),
    priority: 84,
    severity: "critical"
  },
  {
    // international numbers other than +91 (those are handled by PHONE_IN)
    type: "PHONE",
    regex: /(?<![\w+])(?:\+|00)(?!91)[1-9]\d{0,2}[\s.-]?\(?\d{1,4}\)?(?:[\s.-]?\d{2,5}){2,4}(?![\w])/g,
    validator: (val) => {
      const d = digitsOf(val).replace(/^00/, "");
      return d.length >= 8 && d.length <= 15 && !isJunkNumber(d);
    },
    priority: 77,
    severity: "high"
  },
  {
    // (415) 555-0132
    type: "PHONE",
    regex: /(?<![\w(])\(\d{3}\)\s?\d{3}[\s.-]\d{4}(?![\w])/g,
    priority: 76,
    severity: "high"
  },
  {
    type: "IP_ADDRESS",
    regex: /(?<![\w.])(?:\d{1,3}\.){3}\d{1,3}(?![\w.])/g,
    validator: (val, ctx) => ipv4(val) && !/\b(?:version|ver|v)\s*$/i.test(ctx.split("\0")[0]),
    priority: 60,
    severity: "medium"
  },
  {
    type: "IP_ADDRESS",
    regex: /(?<![\w:])(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}(?![\w:])|(?<![\w:])(?:[0-9a-f]{1,4}:){1,7}:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4}(?![\w:])/gi,
    validator: (val) => /[0-9a-f]{3}/i.test(val) && (val.match(/:/g) ?? []).length >= 3,
    priority: 60,
    severity: "medium"
  },
  {
    type: "MAC_ADDRESS",
    regex: /(?<![\w:-])[0-9a-f]{2}(?:([:-])[0-9a-f]{2})(?:\1[0-9a-f]{2}){4}(?![\w:-])/gi,
    priority: 60,
    severity: "low"
  },
  {
    type: "SOCIAL_PROFILE",
    regex: /(?:https?:\/\/)?(?:www\.|[a-z]{2}\.)?(?:linkedin\.com\/in|github\.com|twitter\.com|x\.com|instagram\.com|facebook\.com|fb\.com|t\.me|wa\.me)\/[A-Za-z0-9_.\-%]{2,100}\/?/gi,
    validator: (val) => !/\/(?:login|signup|share|sharer|home|explore|search|about|help|settings|intent|hashtag)\b/i.test(val),
    priority: 86,
    severity: "medium"
  },
  {
    type: "IMEI",
    regex: /(?<![\w])\d{15}(?![\w])/g,
    validator: (val) => luhn(val),
    context: keywords(["imei"]),
    requireContext: true,
    priority: 83,
    severity: "medium"
  }
];

// src/patterns/secrets.js
var secretPatterns = [
  { type: "PRIVATE_KEY", regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY(?: BLOCK)?-----[\s\S]+?-----END (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY(?: BLOCK)?-----/g },
  { type: "API_KEY", regex: /(?<![\w-])sk-ant-[A-Za-z0-9_-]{20,}/g },
  { type: "API_KEY", regex: /(?<![\w-])sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}(?![\w-])/g },
  { type: "API_KEY", regex: /(?<![\w])(?:AKIA|ASIA)[0-9A-Z]{16}(?![\w])/g },
  { type: "API_KEY", regex: /(?<![\w])AIza[0-9A-Za-z_-]{35}(?![\w-])/g },
  { type: "API_KEY", regex: /(?<![\w])(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})(?![\w])/g },
  { type: "API_KEY", regex: /(?<![\w])(?:sk|rk|pk)_(?:live|test)_[0-9A-Za-z]{16,}(?![\w])/g },
  { type: "API_KEY", regex: /(?<![\w])rzp_(?:live|test)_[A-Za-z0-9]{14,}(?![\w])/g },
  { type: "API_KEY", regex: /(?<![\w])xox[abprs]-[A-Za-z0-9-]{10,}(?![\w])/g },
  { type: "API_KEY", regex: /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9\/]+/g },
  { type: "API_KEY", regex: /(?<![\w])(?:npm_[A-Za-z0-9]{36}|pypi-[A-Za-z0-9_-]{50,}|glpat-[A-Za-z0-9_-]{20})(?![\w])/g },
  { type: "JWT", regex: /(?<![\w-])eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}(?![\w-])/g },
  { type: "BEARER_TOKEN", regex: /\bBearer\s+([A-Za-z0-9\-._~+/]{20,}=*)/gd, group: 1 },
  {
    type: "CONNECTION_STRING",
    regex: /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|redis|rediss|amqps?|mssql|sqlserver):\/\/[^\s:@\/]+:[^\s@\/]+@[^\s"'<>]+/gi
  },
  { type: "URL_CREDENTIALS", regex: /\bhttps?:\/\/[^\s:@\/]+:([^\s@\/]+)@/gid, group: 1 },
  {
    type: "PASSWORD",
    regex: /(?:\bpassword|\bpasswd|\bpwd|\bpasscode|\bpass\s?word)\s*(?:is|hai|:|=|-)\s*["']?([^\s"',;]{4,64})/gid,
    group: 1,
    validator: (val) => !/^(?:incorrect|wrong|required|invalid|expired|weak|strong|changed|reset|empty|missing|mandatory|correct|same|different|updated|sent|not|too|the|your|my|is|hai|kya|ki|ke|ka|hidden|protected)$/i.test(val)
  },
  {
    type: "API_KEY",
    regex: /(?:api[_-]?key|api[_-]?secret|secret[_-]?key|client[_-]?secret|access[_-]?token|auth[_-]?token|private[_-]?key)["']?\s*[:=]\s*["']?([A-Za-z0-9_\-./+=]{16,})/gid,
    group: 1
  }
].map((p) => ({ priority: 100, severity: "critical", confidence: 0.95, ...p }));

// src/data/names.js
var FIRST_NAMES = new Set(`
aarav aarush aayush abhay abhijeet abhijit abhinav abhishek aditya adil afzal ajay ajit akash akhil akshay alok
aman amit amitabh amol anand anant aniket anil anirudh ankit ankur anmol anoop anshul anuj anup anurag arijit
arjun arnav arun arvind ashish ashok ashutosh ashwin atul avinash ayaan ayush azhar balaji bharat bhavesh bhushan
chetan chirag darshan deepesh devendra dhananjay dharmendra dheeraj dhruv dilip dinesh gaurav girish gopal govind
gurpreet harish harsh harshit hemant himanshu hitesh imran irfan ishaan jagdish jatin jayant jayesh jitendra karan
kartik kaushik keshav kishore krishnan kunal lalit lokesh madhav mahesh manish manoj mayank mihir mohit mohan mukesh
mukul nachiket nadeem naman narendra naresh naveen navin neeraj nikhil nilesh niraj nishant nitin nitesh omkar
pankaj paras parth pavan pawan piyush pradeep prakash pramod pranav prasad prashant prateek pratik praveen
prithvi pritam puneet rahul rajat rajeev rajendra rajesh rajiv rakesh ramesh ranjit ravi rishabh rishi ritesh
rohan rohit sachin sahil sai sameer samir sandeep sanjay sanjeev santosh sarthak satish saurabh shailesh shankar
shantanu sharad shashank shekhar shivam shreyas shubham siddharth siddhant sohail somnath subhash sudhir sujit
sumit sunil suraj suresh sushant swapnil tarun tushar uday umesh utkarsh vaibhav varun vedant vicky vijay vikas
vikram vinay vineet vinod vipin vishal vishnu vivek yash yashwant yogesh yuvraj zubair mohd mohammad mohammed
muhammad md abdul ahmad ahmed arif asif faisal farhan iqbal javed junaid kamran khalid mujeeb nasir rizwan
salman shahid shakeel shoaib tariq wasim yusuf zaid zakir aslam salim sajid rashid harpreet jaspreet manpreet
simranjeet gurdeep jaswinder kuldeep navdeep rajinder sukhwinder balwinder hardeep amandeep lovepreet
murali senthil karthik karthikeyan arumugam balu ganesan murugesan ramasamy saravanan selvaraj sivakumar
venkat venkatesh srinivas srinivasan sudhakar suresh raghav raghavendra ramana nagaraj manjunath basavaraj
chandrashekhar anoop biju shibu sreejith sreekanth subin vineeth jibin jithin arnab sourav soumya subhajit
debashish debasis partha pritam sayan sudip suman tanmay indranil anirban abhirup
aarti aditi aishwarya akanksha alka amrita ananya anita anjali ankita anu anupama anushka aparna archana
arpita arti bhavana bhavna chitra deepa deepika deepti devika divya diya gauri harshita isha ishita jaya
jyoti kajal kalpana kamala kavita kavya khushi komal kriti lata madhuri mamta manisha mansi meena meenakshi
megha meghna monika nandini neelam neha nidhi nikita nisha nishita pallavi pooja poonam prachi pragya
pratibha preeti preeti priya priyanka puja radha radhika rashmi reena rekha renu richa ritu riya rohini
ruchi rupali sadhana sakshi sangeeta sanjana sapna sarita shalini shikha shilpa shivani shraddha shreya
shruti simran sneha sonal sonali sonam sonia suman sunita supriya swati tanvi tanya trisha uma urmila
vandana varsha vidya vineeta yamini zoya ayesha farah fatima nazia noor rubina sana shabana shaheen
tabassum yasmin gurleen harleen jasleen navneet manjeet parminder kiranjeet lakshmi saraswati padma
revathi kavitha sangeetha anitha sumathi geetha latha malathi priyadarshini dhanya sreeja aswathy

aadarsh aakash aarnav abhimanyu achyut adarsh adinath advait agastya ajinkya akhilesh alankar ambar amitesh
amrit anay anirban anshuman antariksh anubhav apoorv arpit aryan ashwath atharv avdhesh balram bhanu bhaskar
bhupendra bipin brajesh chaitanya chandramohan charan daksh debojyoti deepanshu devansh devashish dhairya
dharam dushyant ganesh gaurang ghanshyam gopinath gulshan gyan hari haresh harinder hemendra hrithik indrajit
ishwar jagannath jagjit janardan jeevan jignesh kailash kalyan kamal kanhaiya kapil karthick kartikeya ketan
kirti krish kshitij lakshya laxman madhukar mahavir mahendra mangesh manohar manthan mayur milind mithun
mridul mrinal nagendra nakul nandan narayan navneet nihar nikunj nilay nimesh nirmal nitish ojas omprakash
pallav paramjit parag parikshit pradyumna prajwal pranay prashanth pravin prem prince pulkit purushottam
raghu raghunath rajan rajkumar rajnish rakshit ramakant ramesh ranveer ratan ravindra ritwik rohtash ronak
rudra rupesh sachchidanand sagar sahdev sameep samarth sanchit sandesh sangram sanket saransh sarvesh satyam
satyendra saurav shailendra shankar sharvan shashi shaurya shiv shivendra shrikant shyam siddhesh som subodh
sudarshan sudhanshu sujay sumeet sunny surendra suryansh susheel swaraj tanay tejas trilok tushar ujjwal
umang upendra utsav vaibhav vansh vasant vedprakash venkatesh vibhav vidyut vighnesh vikrant vimal vinayak
viraj virendra vishwas vivaan yatin yogendra yudhishthir
abhilash ajith anand anil aravind arjun ashwin bala chandran deepak dileep gokul gopi hari jayan jithesh
krishnakumar mahesh manoj midhun nandakumar pradeep prajith rahul rajeesh ranjith sajith sanal sanjay
santhosh sarath shaji shyam sibin sujith sunil sreenath unni vimal vinod vishnu
aravindan dinesh elango gopinath ilango jayakumar kannan kathir kumar madhavan manikandan muthu nandhakumar
prabhu ragul rajkumar ramesh sathish senthilkumar shankar sundar thangaraj thiru vasanth velu vignesh
anjaneyulu chiranjeevi gopalakrishna harikrishna koteswara lakshman mallikarjun nagarjuna narasimha prabhakar
rambabu ramu ravikiran satyanarayana srikanth srinu subbarao sudheer venkateswara
ayan biplab biswajit dipankar gautam kaushik prasenjit rajarshi saikat shubhankar soumitra subrata sukanta
tapas tathagata
ajmal altaf anwar arshad ashraf azad dawood ejaz fahad fardeen faraz feroz habib hamid haris hasan hassan
imtiaz ishaq jamal jawed kabir kaleem karim khalil mahmood majid mansoor masood mehboob moin mujahid mukhtar
murtaza mustafa nadeem naveed nawaz obaid omar parvez rafiq rahim rehan sadiq saeed saif sajjad sameer
saqib shabbir shadab shafiq shahnawaz shamim sharif shoeb sohail sufiyan tabrez taufiq umar usman wajid
waseem yaseen zafar zeeshan
amarjeet baljit bhupinder charanjit davinder gurjeet gurmeet gurnam harbhajan harjinder harvinder inderjit
jagmeet jarnail jasbir kanwaljit karamjit lakhwinder mandeep paramvir pritpal ranbir ranjit satnam sukhdev
sukhjinder surjit tejinder
aldrin anthony ashley benny binu chris cyril dennis derek elvis francis gilbert ivan jerry jince jobin
johnson jomon joseph joshy justin kevin linto melvin nelson noel peter reji robin roshan sabu shibu sijo
simon stanley stephen sunny thomas tony vinu wilson
aadhya aarohi aashna advika akshara alisha amisha amruta anamika anika anisha anjana ankita antara anupriya
anvi apeksha arundhati ashwini avani bhagyashree bhumika charu chhavi damini darshana deeksha devyani dhriti
disha drishti eesha ekta garima gayatri gunjan harsha hema himani indu ira ishani janhvi jasmine jhanvi juhi
kanak kanika kashish kaveri ketaki kirti krutika kumud lavanya leela madhavi mahima malini manju manvi
maya medha mehak mitali mohini mridula namita namrata nandita neelima neetu nikita nirmala niyati pakhi
pallavi parul payal poorva pranjal prarthana pratiksha preksha pritika purvi rachna ragini rajni ranjana
rashi ratna reema reshma ridhi rimjhim roshni rucha rupa saanvi sakshi saloni samiksha sanchita sandhya
sangita sanya sarika seema shaila shalu sharmila sheetal shilpi shobha shubhangi shweta siddhi smita
smriti snehal sonakshi srishti sudha sujata sukanya sulochana sushma swara tanisha tanuja trupti tulsi
urvashi vaishali vani vartika vedika vibha vinita vrinda yashika yogita
ambika anitha bindu deepthi divya gopika indira jayashree jyothi kalyani kavya lakshmi leena manjula
meera nithya parvathy prameela preetha radhika ramya rekha remya revathy saritha shanthi sindhu sreelakshmi
sruthi suja sumathi swapna thulasi usha vasantha vijayalakshmi
anwesha arpita barnali debjani dipika ishita moumita oindrila paromita piyali rituparna sanchari sayani
sharmistha sohini soma sreyashi sudeshna susmita tanushree
afreen aliya amna anam arshi asma bushra farheen fiza haleema hina humaira iram khadija mahira maryam
mehjabeen muskan nargis nasreen nida nilofar parveen rabia rehana ruksar rukhsana saba sadia safiya
saima samina sania shabnam shagufta shazia sumaiya tahira uzma zainab zeenat zubeda
amandeep gurpreet harmeet harpreet inderpreet jasmeet jaswinder kamaljeet kulwinder manjit navjot parmjit
rajwinder sarabjit sukhpreet
alisha angel ann anna annie beena celine christina daisy elizabeth jenny jessy jincy jismy julie liya
maria mary merin neethu nimmy reena riya rosamma rose sherin sneha sonia teresa tinu
`.trim().split(/\s+/));
var SURNAMES = new Set(`
sharma verma varma gupta singh kumar yadav patel shah mehta jain agarwal aggarwal agrawal bansal goyal goel
mittal singhal garg jindal khandelwal maheshwari rastogi srivastava shrivastava saxena mathur nigam tiwari
tripathi pandey mishra dubey dwivedi chaturvedi upadhyay upadhyaya shukla bajpai vajpayee awasthi dixit
trivedi pathak joshi bhatt reddy naidu nair menon pillai iyer iyengar krishnan subramanian ramachandran
narayanan swamy murthy hegde shetty kamath prabhu gowda patil deshmukh deshpande kulkarni gokhale apte bapat
sawant pawar jadhav shinde chavan kadam gaikwad bhosale salunkhe desai parekh modi thakkar chauhan rathore
rajput solanki parmar jadeja vaghela chaudhary choudhary chowdhury chowdary dutta datta ghosh basu banerjee
chatterjee mukherjee bhattacharya bhattacharjee chakraborty chakrabarti sengupta saha mondal mandal biswas
sarkar majumdar mazumdar haldar naskar behera mohanty panda patnaik pattnaik pradhan sahoo nayak jena barik
hussain hussein ansari qureshi siddiqui shaikh sheikh syed ahmed mirza baig pathan malik rizvi naqvi kazmi
abbasi farooqui chishti gill sandhu sidhu dhillon grewal brar bajwa randhawa bains cheema kaur ahuja arora
bhatia chopra kapoor khanna khurana malhotra mehra sethi sahni sood suri talwar tandon wadhwa bedi bakshi
chawla dhawan grover kohli luthra oberoi sabharwal sachdeva taneja thomas george joseph mathew varghese
kurian abraham jacob philip chacko cherian fernandes dsouza pereira rodrigues gomes lobo pinto almeida
coutinho naik gaonkar kamat prasad sinha jha thakur ojha choubey sahu kushwaha maurya paswan manjhi mahto
kashyap rawat negi bisht bhandari dobhal nautiyal bhardwaj bharadwaj vashisht kaushik vats gautam tomar
sengar bhadoria parihar chandel baghel lodhi meena gurjar jaiswal kesarwani keshri keshari varshney rustagi
tyagi bhargava sehgal handa marwah narang vohra bhalla babbar kalra lamba makkar krishnamurthy balakrishnan
raghavan rangarajan sundaram natarajan chandrasekhar chandrasekaran rajan kumaran selvam murugan pandian
chettiar mudaliar gounder nadar raju setty bora baruah barua gogoi saikia kalita singha sangma lyngdoh
rajagopal venkataraman ramakrishnan gopalakrishnan subramaniam sastry shastri acharya bhagat dhar kaul
raina razdan wani lone bhat mir dar ganguly sanyal lahiri bagchi roychowdhury kar nath sharma pandit

agnihotri ahluwalia ambedkar anand ansal arya asthana atre awasthy bajaj banerji barman bhalerao bhandarkar
bhasin bhatnagar bhattacharyya bhave bhonsle bhowmick bhuyan bisht bose chakravarty chandak chandra chaturvedi
chhabra chitnis choksi contractor dalal damle dange dasgupta dave deo deol desai dhadda dhamija dhanuka
dhoni dhupar dixit doshi dugar dutt gadgil gaikwad ganatra gandhi garewal ghatak godbole gokarn gola
goradia goswami guha gulati gupte halder hazarika hiremath iyengar jadhav jagtap jaitley jhaveri jhunjhunwala
joshi kabra kakkar kale kalia kanojia kapadia kapur karnik kathuria kaushal khandekar khanna kher khosla
kirloskar kochhar kothari kripalani kumawat lad lakhani lalwani lele lokhande loya mahajan maheshwari
mahindra majithia malviya mane manjrekar marathe mehrotra merchant mhatre mirchandani mistry mohanty
motwani mukherji munshi murthy nadkarni nagpal nambiar namboodiri nanavati narula nayar nayyar nehra
ogale oswal padukone pai palkar palsule pande pandya paranjape parikh parulekar patankar pathania
patwardhan phadke phadnis pillay poddar ponnappa poonawala purohit rajagopalan rajput ramaswamy ranade
rane rathi rathod raut rawal rege sabnis sachdev sahay sahgal saigal salvi samant sanghvi sant saraf
sarin sathe savarkar sawhney sehwag sekhon seth shah shenoy shroff sidhwani singla sodhi somani sonawane
subramanyam sule sundaresan suryavanshi swaminathan tagore talreja tamhane tata tendulkar thackeray
thakare thapar tikoo tilak toor tripathy vaid vakil vartak vasudevan vyas wadia wagh walia yadav zaveri
achari ayyar bhaskaran chandrasekharan devarajan eapen gopalan govindan jayaraman kannan krishnaswamy
kurup madhavan mahalingam muthuswamy nagarajan nambiar padmanabhan panicker parameswaran pisharody
ramakrishna ramanathan sankaran seshadri sivaraman srinath thampi unnikrishnan varier venugopal warrier
ahmad alam ansary azmi bukhari chaudhry dehlvi faruqui gilani haider hashmi husain jafri kidwai lari
mansoori mirza nadvi nomani quadri rahman rizvi saifi salmani shah shamsi siddiqi sultan usmani zaidi
ahluwalia atwal aulakh bal bhullar chahal chatha deol dhaliwal dhindsa gosal heer hundal johal kahlon
kang khaira khehra mann maan nijjar pannu sahota sangha sarai sekhon sohal sohi thind toor virk
alvares andrade barreto braganza carvalho correia costa crasto cunha dcosta dcruz dias dmello fonseca
furtado lewis lopes machado mascarenhas menezes miranda monteiro noronha rebello saldanha sequeira
silva soares vaz
batliwala bharucha billimoria contractor daruwala engineer godrej irani jeejeebhoy mistry patel sethna
tata wadia
borah chetia deka dutta goswami hazarika kakati mahanta medhi phukan rajkhowa sarma talukdar
`.trim().split(/\s+/));
var AMBIGUOUS_SURNAMES = new Set(
  "more ram rai ray roy pal paul engineer contractor merchant tata sultan dave lad mane deo bal heer maan mann kang sant gola dias costa silva lewis vaz sarin lal das sen ali rao pai dua rana bose nanda chand gill singh kumar kaur dar mir lone wani kar nath dhar bhat george thomas joseph mathew jacob philip abraham anand gautam bhagat naik modi shah jain pinto lobo".split(" ")
);
var AMBIGUOUS_FIRST = new Set(
  "asha kiran pooja puja deepak prem amar raja rani sagar sunny lucky ram shiva hari krishna ganesh laxmi lakshmi durga sita gita geeta jai raj dev om shanti shakti chanda suraj chandan moti heera hira param vijay sai uma jaya radha noor sana suman vicky anand prakash bharat uday arjun mohan gopal govind madhav keshav vishnu shankar sonam khushi simran meena vidya padma lata kamala diya ritu sapna jyoti rekha md prince sunny angel rose daisy jasmine maya gyan kirti ratna tulsi indu rupa usha hema leela vani ira kabir som shiv shyam lakshya ganesh mahavir kamal jeevan ishwar nirmal vimal ratan sudha shobha raghu mithun pakhi charu".split(" ")
);
var NOT_NAME = new Set(`
the this that these those there here hello hi hey dear sir madam mam team thanks thank regards best kind warm
yours sincerely please kindly note subject re fw fwd attached find mr mrs ms dr shri smt good morning evening
afternoon night today tomorrow yesterday monday tuesday wednesday thursday friday saturday sunday january
february march april may june july august september october november december india indian bank state
national new old north south east west central road street lane nagar colony sector phase block city district
village post office police station hospital school college university company private limited ltd pvt
government ministry department customer support service account card number phone mobile email address name
amount total balance payment order invoice ticket date time and or but if then also not yes no ok okay my your
our his her their its i we you he she they it is am are was were be been will shall can could would should
`.trim().split(/\s+/));

// src/finders/names.js
var PLACES = new Set(PLACE_LIST);
var STOP = new Set(`
is hai hu hoon hun hoo h and aur from se ka ki ke the a an i am my me here ji sir madam working studying live
living rehta rehti rahta rahti i'm im age aged years yrs contact phone mobile email call at in on with for to of
by kya kaise but or so please pls plz thanks thank hello hi hey good morning evening bhai sahab saab urf alias
also too only just main mein hum we you he she they it this that was were will can not no yes ok okay mera meri
mere naam name number no. s/o d/o w/o c/o son daughter wife husband father mother,
`.trim().split(/\s+/));
var STRONG = new RegExp(
  [
    String.raw`\bmy\s+(?:full\s+|good\s+|first\s+|last\s+)?name\s*(?:is|'s|:|-|=)?`,
    String.raw`\b(?:mera|meri|apna|hamara)\s+(?:naam|name)(?:\s+(?:hai|h))?`,
    String.raw`\b(?:naam|name)\s+(?:hai|h)\b`,
    String.raw`(?<!\b(?:file|user|host|domain|brand|company|product|variable|column|field|display|screen|app|project|class|function|table|database|db|business|shop|store|team|group|channel|code|bank|model|device|server|branch|course|package|key)\s)` + String.raw`\b(?:(?:full|first|last|middle|sur|given|candidate'?s?|applicant'?s?|customer'?s?|patient'?s?|student'?s?|employee'?s?|account\s+holder'?s?|holder'?s?|father'?s?|mother'?s?|husband'?s?|wife'?s?|spouse'?s?|guardian'?s?|nominee'?s?|parent'?s?|contact)\s*)?name\s*(?::|-|=|\bis\b)`,
    String.raw`\b(?:naam|nam)\s*[:\-=]`,
    String.raw`(?:(?<![a-z])[a-z]{1,20}_|\b)(?:full_?|first_?|last_?|customer_?|cust_?|user_?|contact_?|display_?)?name"?\s*[:=]\s*"?(?=[A-Za-z])`,
    String.raw`\b(?:s\/o|d\/o|w\/o|c\/o|son\s+of|daughter\s+of|wife\s+of|husband\s+of|father\s+name|mother\s+name)\s*[:\-]?`
  ].join("|"),
  "gi"
);
var MEDIUM = new RegExp(
  [
    String.raw`\bmyself\s*[,:\-]?\s*`,
    String.raw`\b(?:candidate|applicant|customer|client|patient|student|employee|member|holder|beneficiary|nominee|guardian|sender|receiver|recipient|payee|payer|tenant|landlord|owner|borrower|co-?applicant|insured|policyholder|passenger|guest|attn|attention|prepared\s+by|submitted\s+by|approved\s+by|signed\s+by|signed|contact\s+person|spoke\s+to|spoke\s+with|talked\s+to|met\s+with|referred\s+by|assigned\s+to)\s*(?::|-)\s*`,
    String.raw`\b(?:spoke\s+to|spoke\s+with|talked\s+to|met\s+with|referred\s+by|assigned\s+to|forwarded\s+to|reported\s+by|raised\s+by|on\s+behalf\s+of)\s+(?=[A-Z])`,
    String.raw`\b(?:caller|owner|driver|rider|agent|cc|bcc|attendee|speaker|host|interviewer|interviewee|reviewer|author|by)\s*(?::|-)?\s+(?=[A-Z])`,
    String.raw`\b(?:dear|hi|hello|hey|congratulations|congrats|welcome|thanks|thank\s+you|kudos|happy\s+birthday)\s*,?\s+(?=[A-Z])`,
    String.raw`\b(?:the\s+)?undersigned\s*,?\s*(?=[A-Z])`,
    String.raw`\b(?:interview|meeting|call|chat|session|appointment|demo|discussion)\s+(?:is\s+)?(?:scheduled\s+|fixed\s+|booked\s+)?with\s+(?=[A-Z])`,
    String.raw`\b(?:bro|bhai|bhaiya|didi|yaar|sir|madam|ma'am|ji)\s+(?=[A-Z][a-z]+\s+(?:se|ko|ka|ki|ke|ne|bhi|aur)\b)`
  ].join("|"),
  "gi"
);
var POST = /\b([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+){1,2})(?=\s+(?:joined|joins|said|says|wrote|writes|replied|asked|told|called|emailed|messaged|resigned|left|will\s+join|has\s+joined|is\s+joining|has\s+resigned|reported|confirmed|approved|signed)\b)/g;
var CSV_ROW = /^[ \t"]*([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+){1,3})[ \t"]*[,;|\t][ \t"]*(?=\+?\d[\d \t-]{7,}|[\w.+-]+@[\w-]+\.)/gm;
var WEAK = /\b(?:i\s+am|i'm|im|this\s+is|call\s+me|it'?s|main|mai|me|hum|regards|thanks|thank\s+you|sincerely|cheers)\s*[,:\-]?\s*/gi;
var HONORIFIC = /\b(?:mr|mrs|ms|miss|mister|dr|shri|sri|shree|smt|shrimati|kumari|km|kum|prof|er|adv|late|sh|sushri|janab|sardar|captain|capt|col|maj|gen|lt|justice)\.?\s+/gi;
var SCRIPTS = [
  ["\u092E\u0947\u0930\u093E\\s+\u0928\u093E\u092E|\u092E\u0947\u0930\u0940\\s+\u0928\u093E\u092E|\u092E\u093E\u091D\u0947\\s+\u0928\u093E\u0935|\u092E\u093E\u091D\u0902\\s+\u0928\u093E\u0935", "\u0928\u093E\u092E|\u0928\u093E\u0935", "\\u0900-\\u097F", "\u0939\u0948|\u0939\u0942\u0901|\u0939\u0942\u0902|\u0939\u0948\u0902|\u0914\u0930|\u0915\u093E|\u0915\u0940|\u0915\u0947|\u0906\u0939\u0947|\u0906\u0923\u093F"],
  ["\u0986\u09AE\u09BE\u09B0\\s+\u09A8\u09BE\u09AE", "\u09A8\u09BE\u09AE", "\\u0980-\\u09FF", "\u098F\u09AC\u0982|\u0986\u09AE\u09BF|\u09B9\u09B2|\u09B9\u09B2\u09CB"],
  ["\u0A2E\u0A47\u0A30\u0A3E\\s+\u0A28\u0A3E\u0A2E|\u0A2E\u0A47\u0A30\u0A3E\\s+\u0A28\u0A3E\u0A02", "\u0A28\u0A3E\u0A2E|\u0A28\u0A3E\u0A02", "\\u0A00-\\u0A7F", "\u0A39\u0A48|\u0A05\u0A24\u0A47"],
  ["\u0AAE\u0ABE\u0AB0\u0AC1\u0A82\\s+\u0AA8\u0ABE\u0AAE|\u0AAE\u0ABE\u0AB0\u0AC1\\s+\u0AA8\u0ABE\u0AAE", "\u0AA8\u0ABE\u0AAE", "\\u0A80-\\u0AFF", "\u0A9B\u0AC7|\u0A85\u0AA8\u0AC7"],
  ["\u0B2E\u0B4B\u0B30\\s+\u0B28\u0B3E\u0B2E|\u0B2E\u0B4B\\s+\u0B28\u0B3E\u0B2E", "\u0B28\u0B3E\u0B2E", "\\u0B00-\\u0B7F", "\u0B0F\u0B2C\u0B02|\u0B05\u0B1F\u0B47"],
  ["\u0B8E\u0BA9\u0BCD\\s+\u0BAA\u0BC6\u0BAF\u0BB0\u0BCD|\u0B8E\u0BA9\u0BA4\u0BC1\\s+\u0BAA\u0BC6\u0BAF\u0BB0\u0BCD", "\u0BAA\u0BC6\u0BAF\u0BB0\u0BCD", "\\u0B80-\\u0BFF", "\u0BAE\u0BB1\u0BCD\u0BB1\u0BC1\u0BAE\u0BCD"],
  ["\u0C28\u0C3E\\s+\u0C2A\u0C47\u0C30\u0C41", "\u0C2A\u0C47\u0C30\u0C41", "\\u0C00-\\u0C7F", "\u0C2E\u0C30\u0C3F\u0C2F\u0C41"],
  ["\u0CA8\u0CA8\u0CCD\u0CA8\\s+\u0CB9\u0CC6\u0CB8\u0CB0\u0CC1", "\u0CB9\u0CC6\u0CB8\u0CB0\u0CC1", "\\u0C80-\\u0CFF", "\u0CAE\u0CA4\u0CCD\u0CA4\u0CC1"],
  ["\u0D0E\u0D28\u0D4D\u0D31\u0D46\\s+\u0D2A\u0D47\u0D30\u0D4D|\u0D0E\u0D28\u0D4D\u0D31\u0D46\\s+\u0D2A\u0D47\u0D30\u0D4D", "\u0D2A\u0D47\u0D30\u0D4D", "\\u0D00-\\u0D7F", "\u0D06\u0D23\u0D4D|\u0D09\u0D02"]
].map(([phrase, label, range, stop]) => ({
  re: new RegExp(`(?:${phrase}|(?:${label})\\s*[:\\-])\\s*[:\\-]?\\s*((?:[${range}]+[ \\t]*){1,4})`, "gu"),
  stop: new RegExp(`(?:^|\\s)(?:${stop})(?:\\s|$).*$`, "su")
}));
var HONOR_WORDS = new Set("mr mrs ms miss dr shri sri shree smt kumari km late sh sushri prof er adv janab sardar".split(" "));
var WORD = /[A-Za-z][A-Za-z'.]*(?![A-Za-z'.\/])/y;
function readWords(text, pos, max = 4) {
  const words = [];
  let i = pos;
  while (words.length < max) {
    while (i < text.length && (text[i] === " " || text[i] === "	" || text[i] === '"' || text[i] === "'")) i++;
    WORD.lastIndex = i;
    const m = WORD.exec(text);
    if (!m) break;
    const raw = m[0].replace(/\.+$/, (dots) => m[0].length <= 2 ? dots : "");
    words.push({ text: raw, start: i, end: i + raw.length, lower: raw.toLowerCase().replace(/\.$/, "") });
    i = i + m[0].length;
    if (/^[,;!?\n]/.test(text.slice(i, i + 1)) || /^\.\s/.test(text.slice(i - 1, i + 1)) && raw.length > 2) break;
  }
  return words;
}
var isCap = (w) => /^[A-Z]/.test(w.text);
var isInitial = (w) => /^[A-Za-z]\.?$/.test(w.text) && isCap(w);
var known = (w) => FIRST_NAMES.has(w.lower) || SURNAMES.has(w.lower);
function takeWhile(words, ok) {
  const out = [];
  for (const w of words) {
    if (STOP.has(w.lower) || NOT_NAME.has(w.lower) && !known(w)) break;
    if (!ok(w, out.length)) break;
    out.push(w);
  }
  return out;
}
function span(words, confidence) {
  if (!words.length) return null;
  return { start: words[0].start, end: words[words.length - 1].end, confidence };
}
function findNames(text) {
  const out = [];
  let m;
  STRONG.lastIndex = 0;
  while (m = STRONG.exec(text)) {
    const read = readWords(text, m.index + m[0].length, 5);
    while (read.length && HONOR_WORDS.has(read[0].lower)) read.shift();
    const words = takeWhile(read, (w) => w.text.length > 1 || isInitial(w));
    const s = span(words, 0.95);
    if (s) out.push(s);
  }
  MEDIUM.lastIndex = 0;
  while (m = MEDIUM.exec(text)) {
    const words = readWords(text, m.index + m[0].length);
    while (words.length && HONOR_WORDS.has(words[0].lower)) words.shift();
    if (!words.length || !isCap(words[0])) continue;
    const taken = takeWhile(words, (w) => isCap(w) && !NOT_NAME.has(w.lower) || isInitial(w) || known(w));
    if (taken.length && PLACE_AFTER.has(taken[taken.length - 1].lower)) continue;
    if (taken.length && PLACES.has(taken.map((w) => w.lower).join(" "))) continue;
    const s = span(taken, 0.85);
    if (s) out.push(s);
  }
  WEAK.lastIndex = 0;
  while (m = WEAK.exec(text)) {
    const words = readWords(text, m.index + m[0].length);
    if (!words.length) continue;
    const first = words[0];
    const looksLikeName = FIRST_NAMES.has(first.lower) && (isCap(first) || !NOT_NAME.has(first.lower)) || isCap(first) && !NOT_NAME.has(first.lower) && words[1] && SURNAMES.has(words[1].lower) && isCap(words[1]);
    if (!looksLikeName) continue;
    const taken = takeWhile(words, (w, i) => i === 0 || known(w) || isCap(w) && !NOT_NAME.has(w.lower) || isInitial(w));
    const s = span(taken, 0.9);
    if (s) out.push(s);
  }
  HONORIFIC.lastIndex = 0;
  while (m = HONORIFIC.exec(text)) {
    const taken = takeWhile(readWords(text, m.index + m[0].length), (w) => isCap(w) || known(w));
    const s = span(taken, 0.9);
    if (s) out.push(s);
  }
  for (const { re, stop } of SCRIPTS) {
    re.lastIndex = 0;
    while (m = re.exec(text)) {
      const name = m[1].replace(stop, "").replace(/[\s\u0964\u0965]+$/u, "").trim();
      if (!name) continue;
      const start = m.index + m[0].lastIndexOf(m[1]);
      out.push({ start, end: start + name.length, confidence: 0.9 });
    }
  }
  POST.lastIndex = 0;
  while (m = POST.exec(text)) {
    const first = m[1].split(/\s+/)[0].toLowerCase();
    if (NOT_NAME.has(first) || PLACES.has(m[1].toLowerCase())) continue;
    out.push({ start: m.index, end: m.index + m[1].length, confidence: 0.75 });
  }
  CSV_ROW.lastIndex = 0;
  while (m = CSV_ROW.exec(text)) {
    const start = m.index + m[0].indexOf(m[1]);
    if (NOT_NAME.has(m[1].split(/\s+/)[0].toLowerCase())) continue;
    out.push({ start, end: start + m[1].length, confidence: 0.8 });
  }
  out.push(...dictionaryNames(text));
  return out;
}
var PLACE_AFTER = new Set(`
nagar road rd marg chowk place colony vihar enclave park street st market bazar bazaar ganj puram pur layout
circle station hospital college school university institute stadium airport bridge setu bhawan bhavan sadan
hall maidan ground garden gardens gate temple mandir masjid church nagri basti chauraha tower towers complex
society apartments residency memorial trust foundation award awards scheme yojana express mall cinema
`.trim().split(/\s+/));
var SURNAME_ENDING = /^[A-Z][a-z]{2,}(?:kar|ekar|wala|walla|wale|wani|vani|ani|iya|ariya|ariya|ji|appa|amma|esan|ayya|aiah|anna)$/;
var looksLikeSurname = (w) => SURNAME_ENDING.test(w.text) && !NOT_NAME.has(w.lower);
function dictionaryNames(text) {
  const out = [];
  const re = /[A-Za-z][A-Za-z']*/g;
  const words = [];
  let m;
  while (m = re.exec(text)) {
    words.push({ text: m[0], start: m.index, end: m.index + m[0].length, lower: m[0].toLowerCase() });
  }
  const adjacent = (a, b) => /^[ \t]+$/.test(text.slice(a.end, b.start)) || /^[ \t]*[A-Z]\.[ \t]*$/.test(text.slice(a.end, b.start));
  const caseMatch = (a, b) => isCap(a) === isCap(b);
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const isFirst = FIRST_NAMES.has(w.lower);
    if (!isFirst && !(isCap(w) && !NOT_NAME.has(w.lower))) continue;
    let end = i;
    while (end - i < 3) {
      const nx = words[end + 1];
      if (!nx || !adjacent(words[end], nx) || !known(nx) || !caseMatch(w, nx)) break;
      if (!isFirst && end === i && !SURNAMES.has(nx.lower)) break;
      end++;
    }
    const run = words.slice(i, end + 1);
    const hasFirst = run.some((x) => FIRST_NAMES.has(x.lower));
    const hasSurname = run.slice(1).some((x) => SURNAMES.has(x.lower));
    const strongSurname = run.slice(1).some((x) => SURNAMES.has(x.lower) && !AMBIGUOUS_SURNAMES.has(x.lower));
    let start = w.start;
    for (let j = i - 1; j >= 0 && i - j <= 3; j--) {
      const gap = text.slice(words[j].end, j === i - 1 ? w.start : words[j + 1].start);
      if (!/^[A-Z]$/.test(words[j].text) || !/^\.?[ \t]*$/.test(gap) || text[words[j].start - 1] === "/") break;
      start = words[j].start;
    }
    const hasInitials = start < w.start;
    let confidence = 0;
    if (run.length === 1 && hasInitials && isCap(w) && known(w)) confidence = 0.8;
    else if (run.length === 1 && isCap(w) && !NOT_NAME.has(w.lower) && words[i + 1] && adjacent(w, words[i + 1]) && looksLikeSurname(words[i + 1])) {
      end = i + 1;
      confidence = 0.65;
    } else if (run.length > 1 && hasFirst && (hasSurname || run.length > 2)) confidence = 0.9;
    else if (run.length > 1 && hasFirst && isCap(w)) confidence = 0.8;
    else if (run.length > 1 && strongSurname && isCap(w)) confidence = 0.85;
    else if (run.length === 1 && isFirst && isCap(w)) {
      const nx = words[i + 1];
      if (nx && adjacent(w, nx) && isCap(nx) && !NOT_NAME.has(nx.lower) && !FIRST_NAMES.has(nx.lower)) {
        end = i + 1;
        confidence = 0.75;
      } else if (!AMBIGUOUS_FIRST.has(w.lower)) confidence = 0.65;
    }
    if (!confidence) continue;
    const after = words[end + 1];
    if (after && adjacent(words[end], after) && PLACE_AFTER.has(after.lower)) continue;
    out.push({ start, end: words[end].end, confidence });
    i = end;
  }
  return out;
}

// src/finders/address.js
var LABEL = new RegExp(
  [
    // "Permanent address", "my address", or a bare "address" followed by ":" / "is"
    String.raw`(?<!\b(?:e-?mail|ip|mac|web|wallet|billing\s+e-?mail)\s)\b(?:(?:residential|permanent|current|present|correspondence|home|office|shipping|billing|delivery|postal|communication|my|our|his|her|their|your)\s+)(?:address|addr)\b\s*(?:is|:|-|=)?`,
    String.raw`(?<!\b(?:e-?mail|ip|mac|web|wallet)\s)\b(?:address|addr)\b\.?\s*(?::|-|=|\bis\b)`,
    String.raw`\b(?:shipping|delivery|billing|ship\s+to|deliver\s+to|send\s+to|courier\s+to)\s*[:\-]`,
    String.raw`\b(?:address|addr)\s+(?:to|as)\b`,
    String.raw`\b(?:shifted|moved|relocated|shifting|moving|relocating)\s+to\s+(?=[\w#])`,
    // "pata" alone also means "know" ("mujhe nahi pata"), so it needs ":" or an owner
    String.raw`\b(?:(?:ghar|office|dukaan|shop)\s+ka\s+pata|(?:mera|hamara|apna|uska)\s+pata)\s*(?:hai|h|:|-)?|\bpata\s*[:\-]`,
    String.raw`(?:(?:घर|ऑफिस|दुकान)\s+का\s+पता|(?:मेरा|हमारा|उसका)\s+पता)\s*(?:है|:|-)?|पता\s*[:\-]`,
    // address labels in Indian scripts
    String.raw`(?:ঠিকানা|முகவரி|చిరునామా|સરનામું|पत्ता|ਪਤਾ|ವಿಳಾಸ|വിലാസം|ଠିକଣା)\s*[:\-]`,
    String.raw`\b(?:r\/o|resident\s+of|residing\s+at|lives?\s+(?:in|at)|living\s+(?:in|at)|staying\s+(?:in|at)|stay\s+(?:in|at))`,
    String.raw`\b(?:rehta|rehti|rahta|rahti)\s+(?:hu|hoon|hun|hai)\s+(?=\S)`
  ].join("|"),
  "gi"
);
var MARKER = /\b(?:flat|house|plot|door|shop|quarter|qtr|bungalow)\s*(?:no\.?|number|#)?\s*[:\-]?\s*(?=[\w#])|\b(?:h|d)\.?\s?no\.?\s*[:\-]?\s*(?=\w)|\bhno\.?\s*(?=\d)|#\s?\d+[\w\/-]*\s*,|\b(?:vill(?:age)?|gram|grām)\.?\s*[:\-]?\s*(?=[A-Za-z])/gi;
var LANDMARK = /\b(?:near|nr\.?|opp\.?|opposite|behind|beside|next\s+to|in\s+front\s+of)\s+(?=[A-Za-z])|\b(?:sector|sec|phase|block|ward|gali|street|lane|khasra|survey|cross)\s*(?:no\.?|number)?\s*[-:]?\s*\d+[A-Za-z]?\b|\b\d+(?:st|nd|rd|th)\s+(?:cross|main|floor|block|stage|phase|sector)\b/gi;
var HAS_PLACE = new RegExp(`\\b(?:${CITY_OR_STATE})\\b`, "i");
var PIN_AFTER_PLACE = new RegExp(`\\b(?:${CITY_OR_STATE})[\\s,.-]{1,3}[1-9]\\d{2}\\s?\\d{3}(?![\\w])`, "gi");
var PIN = /(?<![\w])[1-9]\d{2}\s?\d{3}(?![\w])/g;
var BREAK = /\s+(?:and|but|aur|lekin|par|phone|mobile|mob|email|e-mail|call|contact|whatsapp|my|mera|meri|i|please|pls|since|for|because|is|are|was|were|will|has|have|had|hai|tha|thi)\b/i;
var ADDRESS_WORD = /\b(?:road|rd|street|st|lane|marg|path|nagar|colony|sector|sec|phase|block|cross|main|layout|hills?|salai|lines|chowk|bazar|bazaar|market|vihar|enclave|apartments?|apts?|society|soc|tower|floor|wing|near|opp|behind|post|p\.?o|dist|distt|district|village|vill|tehsil|taluk|taluka|mandal|ward|gali|mohalla|puram|pet|palya|halli|wadi|pada|ganj|bagh|garden|park|extension|extn|stage|town|city|nagri|basti|estate|complex|residency|heights|plaza|bhawan|bhavan|kunj|niwas|sadan|kutir|tola|mohalla)\b/i;
var NAME_LINK = /\b(?:s\/o|d\/o|w\/o|c\/o|son of|daughter of|wife of|husband of|name|mr|mrs|ms|shri|smt|dr)\b/i;
var ABBR = /(?:^|[\s,])(?:no|nr|opp|rd|st|h|d|flat|sec|ph|dist|distt|po|ps|p\.o|vill|teh|tq|tal|mg|ext|apt|bldg|blk|near|plot|old|new|jn|ave|marg|chs|soc|[a-z])$/i;
var MAX_LEN = 180;
function clauseEnd(text, from) {
  const limit = Math.min(text.length, from + MAX_LEN);
  let end = limit;
  for (let i = from; i < limit; i++) {
    const ch = text[i];
    if (ch === "\n" || ch === "@" || ch === ";" || ch === "!" || ch === "?" || ch === "|" || ch === "\u0964") {
      end = i;
      break;
    }
    if (ch === "." && /\s|$/.test(text[i + 1] ?? "") && !ABBR.test(text.slice(Math.max(from, i - 6), i))) {
      end = i;
      break;
    }
  }
  const tail = text.slice(from, end);
  const brk = tail.match(BREAK);
  if (brk && brk.index > 2) end = from + brk.index;
  const phone = text.slice(from, end).match(/(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)/);
  if (phone && phone.index > 0) end = from + phone.index;
  return end;
}
function extend(text, start, from) {
  let end = clauseEnd(text, from);
  PIN.lastIndex = from;
  let pin;
  let lastPin = null;
  while ((pin = PIN.exec(text)) && pin.index < end) lastPin = pin;
  if (lastPin) end = lastPin.index + lastPin[0].length;
  const value = text.slice(start, end).replace(/[\s,.\-:]+$/, "");
  return { start, end: start + value.length, value };
}
function findAddresses(text) {
  const out = [];
  let m;
  LABEL.lastIndex = 0;
  while (m = LABEL.exec(text)) {
    const from = m.index + m[0].length;
    const lead = text.slice(from).match(/^[\s:,-]*/)[0].length;
    const a = extend(text, from + lead, from + lead);
    const words = a.value.split(/[\s,]+/).filter(Boolean);
    if (a.value.length < 3 || words.length < 1) continue;
    out.push({ start: a.start, end: a.end, confidence: words.length >= 2 || /\d/.test(a.value) ? 0.9 : 0.7 });
  }
  MARKER.lastIndex = 0;
  while (m = MARKER.exec(text)) {
    const a = extend(text, m.index, m.index + m[0].length);
    const tail = a.value.slice(m[0].length);
    const strong = /,/.test(a.value) && (/[1-9]\d{2}\s?\d{3}$/.test(a.value) || HAS_PLACE.test(tail) || ADDRESS_WORD.test(tail));
    if (!strong) continue;
    out.push({ start: a.start, end: a.end, confidence: 0.85 });
  }
  PIN_AFTER_PLACE.lastIndex = 0;
  while (m = PIN_AFTER_PLACE.exec(text)) {
    const end = m.index + m[0].length;
    if (out.some((a) => a.end === end)) continue;
    const lineStart = Math.max(text.lastIndexOf("\n", m.index) + 1, end - MAX_LEN);
    const head = text.slice(lineStart, end);
    const parts = head.split(/(?<=,)/);
    let take = 1;
    for (let k = parts.length - 2; k >= 0 && take < 7; k--) {
      const seg = parts[k].replace(/,$/, "").trim();
      if (!seg || NAME_LINK.test(seg) || /[.!?:;]\s/.test(seg) || seg.split(/\s+/).length > 5) break;
      const firstWord = seg.split(/\s+/)[0].toLowerCase();
      if (FIRST_NAMES.has(firstWord) || /^[a-z]/.test(seg) && !ADDRESS_WORD.test(seg)) break;
      if (!(/\d/.test(seg) || ADDRESS_WORD.test(seg) || HAS_PLACE.test(seg) || /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}$/.test(seg))) break;
      take++;
    }
    if (take < 3) continue;
    const startOffset = parts.slice(0, parts.length - take).join("").length;
    let start = lineStart + startOffset;
    while (start < end && /[\s,]/.test(text[start])) start++;
    out.push({ start, end, confidence: 0.8 });
  }
  LANDMARK.lastIndex = 0;
  while (m = LANDMARK.exec(text)) {
    const a = extend(text, m.index, m.index + m[0].length);
    const endsInPin = /[1-9]\d{2}\s?\d{3}$/.test(a.value);
    if (!/,/.test(a.value) || !(endsInPin || HAS_PLACE.test(a.value))) continue;
    out.push({ start: a.start, end: a.end, confidence: 0.75 });
  }
  return out;
}

// src/presets.js
var CONTACT = ["NAME", "ADDRESS", "PINCODE", "PHONE_IN", "PHONE", "EMAIL", "SOCIAL_PROFILE"];
var INDIA_IDS = ["AADHAAR", "AADHAAR_VID", "PAN", "VOTER_ID", "PASSPORT_IN", "DRIVING_LICENSE", "RATION_CARD"];
var FINANCIAL = ["BANK_ACCOUNT", "UPI_ID", "CREDIT_CARD", "CVV", "CARD_EXPIRY", "IBAN", "OTP", "PIN_SECRET"];
var HEALTH = ["ABHA", "ABHA_ADDRESS"];
var EMPLOYMENT = ["UAN", "ESIC"];
var SECRETS = [
  "API_KEY",
  "PRIVATE_KEY",
  "JWT",
  "BEARER_TOKEN",
  "CONNECTION_STRING",
  "URL_CREDENTIALS",
  "PASSWORD",
  "OTP",
  "PIN_SECRET"
];
var DEVICE = ["IP_ADDRESS", "MAC_ADDRESS", "IMEI"];
var uniq = (...lists) => [...new Set(lists.flat())];
var presets = {
  // India's Digital Personal Data Protection Act, 2023: any data about an identifiable person
  dpdp: {
    types: uniq(CONTACT, INDIA_IDS, FINANCIAL, HEALTH, EMPLOYMENT, DEVICE, ["DATE_OF_BIRTH", "VEHICLE_REG", "GSTIN", "SSN"])
  },
  // identity verification flows
  kyc: {
    types: uniq(INDIA_IDS, ["NAME", "ADDRESS", "PINCODE", "DATE_OF_BIRTH", "PHONE_IN", "EMAIL"])
  },
  // payments, lending, banking support
  fintech: {
    types: uniq(FINANCIAL, ["PAN", "AADHAAR", "AADHAAR_VID", "GSTIN", "IFSC", "SWIFT_BIC", "PASSWORD", "NAME", "PHONE_IN", "EMAIL"])
  },
  // card data only (PCI DSS)
  pci: { types: ["CREDIT_CARD", "CVV", "CARD_EXPIRY", "PIN_SECRET"] },
  // hospitals, telemedicine, insurance
  healthcare: {
    types: uniq(HEALTH, CONTACT, ["AADHAAR", "DATE_OF_BIRTH", "PASSPORT_IN"])
  },
  // payroll, hiring, resumes
  hr: {
    types: uniq(EMPLOYMENT, CONTACT, ["AADHAAR", "PAN", "BANK_ACCOUNT", "IFSC", "PASSPORT_IN", "DATE_OF_BIRTH", "DRIVING_LICENSE"])
  },
  // credentials only, e.g. for logs and code
  secrets: { types: SECRETS },
  // EU GDPR personal data
  gdpr: {
    types: uniq(CONTACT, INDIA_IDS, FINANCIAL, HEALTH, DEVICE, ["DATE_OF_BIRTH", "IBAN", "SWIFT_BIC", "SSN"])
  },
  // US HIPAA identifiers that apply to text
  hipaa: {
    types: uniq(CONTACT, HEALTH, DEVICE, ["DATE_OF_BIRTH", "SSN", "VEHICLE_REG", "BANK_ACCOUNT", "CREDIT_CARD", "AADHAAR"])
  },
  // everything, and accept weaker matches: best for prompts sent to third-party models
  strict: { minConfidence: 0.4 },
  // only high-certainty matches, for analytics where false alarms are costly
  precise: { minConfidence: 0.8 }
};
function resolvePreset(name) {
  if (!name) return {};
  const p = presets[name];
  if (!p) throw new Error(`piilite: unknown preset "${name}". Use one of: ${Object.keys(presets).join(", ")}`);
  return p;
}

// src/stream.js
var DEFAULT_HOLD_BACK = 200;
var CONTEXT_KEEP = 80;
var StreamRedactor = class {
  constructor(shield, options = {}) {
    this.shield = shield;
    this.holdBack = options.holdBack ?? DEFAULT_HOLD_BACK;
    this.state = shield.newState();
    this.context = "";
    this.buffer = "";
  }
  get redactionMap() {
    return this.state.map;
  }
  /** Add a chunk. Returns the redacted text that is safe to emit now (may be ""). */
  push(chunk) {
    this.buffer += chunk;
    if (this.buffer.length <= this.holdBack) return "";
    return this.#emit(false);
  }
  /** Flush everything that is left. */
  end() {
    return this.#emit(true);
  }
  #emit(final) {
    const full = this.context + this.buffer;
    const base = this.context.length;
    const found = this.shield.scan(full).filter((d) => d.end > base);
    let cut = full.length;
    if (!final) {
      cut = full.length - this.holdBack;
      const ws = full.lastIndexOf(" ", cut);
      if (ws > base) cut = ws;
      for (const d of found) if (d.start < cut && d.end > cut) cut = d.start;
      if (cut <= base) return "";
    }
    const emitted = found.filter((d) => d.start >= base && d.end <= cut).map((d) => ({ ...d, start: d.start - base, end: d.end - base }));
    const piece = full.slice(base, cut);
    const out = this.shield.apply(piece, emitted, this.state).redacted;
    this.context = full.slice(Math.max(0, cut - CONTEXT_KEEP), cut);
    this.buffer = full.slice(cut);
    return out;
  }
};
async function* redactAsyncIterable(shield, source, options) {
  const r = new StreamRedactor(shield, options);
  for await (const chunk of source) {
    const out = r.push(typeof chunk === "string" ? chunk : String(chunk));
    if (out) yield out;
  }
  const rest = r.end();
  if (rest) yield rest;
}
function createTransformStream(shield, options) {
  const r = new StreamRedactor(shield, options);
  return new TransformStream({
    transform(chunk, controller) {
      const out = r.push(chunk);
      if (out) controller.enqueue(out);
    },
    flush(controller) {
      const rest = r.end();
      if (rest) controller.enqueue(rest);
    }
  });
}

// src/index.js
var finderPatterns = [
  { type: "NAME", find: findNames, priority: 66, severity: "high", region: true },
  { type: "ADDRESS", find: findAddresses, priority: 67, severity: "high", region: true }
];
var builtinPatterns = [...secretPatterns, ...indiaPatterns, ...globalPatterns, ...finderPatterns];
var PII_TYPES = [...new Set(builtinPatterns.map((p) => p.type))];
var DEFAULTS = {
  mode: "placeholder",
  minConfidence: 0.5,
  maskChar: "X",
  keepLast: 4,
  maxInputSize: 5e6
};
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function mask(value, type, opts) {
  const ch = opts.maskChar;
  if (opts.mode === "mask-all") return value.replace(/[\p{L}\p{N}]/gu, ch);
  if (type === "EMAIL" && value.includes("@")) {
    const [user, domain] = value.split("@");
    return user[0] + ch.repeat(Math.max(1, user.length - 1)) + "@" + domain;
  }
  const alnum = value.replace(/[^\p{L}\p{N}]/gu, "").length;
  const numeric = /^[\d\s+().\-\/]+$/.test(value);
  if (numeric || /^(?:PAN|GSTIN|VOTER_ID|PASSPORT_IN|DRIVING_LICENSE|VEHICLE_REG|IFSC|UPI_ID)$/.test(type)) {
    const keep = alnum > opts.keepLast * 2 ? opts.keepLast : Math.floor(alnum / 3);
    let seen = 0;
    return value.replace(/[\p{L}\p{N}]/gu, (c) => ++seen > alnum - keep ? c : ch);
  }
  return value.replace(new RegExp("(\\p{L})(\\p{L}*)", "gu"), (_, first, rest) => first + ch.repeat(rest.length));
}
var Piilite = class {
  /**
   * @param {import("../index.d.ts").PiiliteOptions} [options]
   */
  constructor(options = {}) {
    const preset = resolvePreset(options.preset);
    this.options = { ...DEFAULTS, ...preset, ...options };
    const { types, exclude, customPatterns = [] } = this.options;
    let patterns = [...builtinPatterns, ...customPatterns];
    if (types?.length) patterns = patterns.filter((p) => types.includes(p.type));
    if (exclude?.length) patterns = patterns.filter((p) => !exclude.includes(p.type));
    this.patterns = patterns;
    this.allow = (this.options.allow ?? []).map((a) => a instanceof RegExp ? a : new RegExp(`^${escapeRe(a)}$`, "i"));
  }
  /** Find PII without changing the text. */
  scan(text) {
    if (typeof text !== "string" || !text) return [];
    return findAll(text, this.patterns, this.options).filter((d) => !this.allow.some((re) => re.test(d.value))).map(({ pattern, ...d }) => d);
  }
  /** True when the text contains any PII. */
  hasPII(text) {
    return this.scan(text).length > 0;
  }
  /** Fresh placeholder state; share one across calls to keep numbering consistent. */
  newState() {
    return { counters: {}, seen: /* @__PURE__ */ new Map(), map: {} };
  }
  /** Replace already-found matches in `text`. Used by detect() and the stream API. */
  apply(text, found, state = this.newState()) {
    const opts = this.options;
    let out = "";
    let last = 0;
    const detections = [];
    for (const d of found) {
      const key = d.type + "\0" + d.value.toLowerCase();
      let placeholder = state.seen.get(key);
      if (placeholder === void 0) {
        if (typeof opts.mode === "function") placeholder = opts.mode(d);
        else if (opts.mode === "placeholder") {
          state.counters[d.type] = (state.counters[d.type] ?? 0) + 1;
          placeholder = opts.placeholder ? opts.placeholder(d.type, state.counters[d.type], d.value) : `[${d.type}_${state.counters[d.type]}]`;
        } else if (opts.mode === "remove") placeholder = "";
        else placeholder = mask(d.value, d.type, opts);
        state.seen.set(key, placeholder);
        if (placeholder) state.map[placeholder] = d.value;
      }
      out += text.slice(last, d.start) + placeholder;
      last = d.end;
      detections.push({
        type: d.type,
        value: d.value,
        placeholder,
        position: [d.start, d.end],
        severity: d.severity,
        confidence: d.confidence
      });
    }
    out += text.slice(last);
    return { redacted: out, detections };
  }
  /**
   * Detect and redact PII. Returns the same shape as OpenRedaction's detect(),
   * so `await shield.detect(text)` works for both libraries.
   */
  detect(text, state = this.newState()) {
    const t0 = Date.now();
    const input = typeof text === "string" ? text : "";
    const { redacted, detections } = this.apply(input, this.scan(input), state);
    const byType = {};
    for (const d of detections) byType[d.type] = (byType[d.type] ?? 0) + 1;
    const result = {
      original: input,
      redacted,
      detections,
      redactionMap: state.map,
      stats: { piiCount: detections.length, processingTime: Date.now() - t0, byType }
    };
    this.options.onDetect?.(result);
    return result;
  }
  /** Shortcut that returns only the redacted string. */
  redact(text) {
    return this.detect(text).redacted;
  }
  /**
   * Redact every string inside an object or array (e.g. a chat payload or a
   * tool result). Placeholders are shared across all strings, so the same
   * value always gets the same placeholder. `skipKeys` leaves fields as-is.
   */
  redactObject(value, { skipKeys = [] } = {}) {
    const state = this.newState();
    const skip = new Set(skipKeys);
    const walk = (v) => {
      if (typeof v === "string") return this.detect(v, state).redacted;
      if (Array.isArray(v)) return v.map(walk);
      if (v && typeof v === "object" && !(v instanceof Date)) {
        return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, skip.has(k) ? x : walk(x)]));
      }
      return v;
    };
    return { value: walk(value), redactionMap: state.map };
  }
  /** Put the original values back, e.g. into an LLM answer. */
  restore(text, redactionMap, options) {
    return restore(text, redactionMap, options);
  }
  /** Streaming redactor: push(chunk) → safe text, end() → the rest. */
  createStream(options) {
    return new StreamRedactor(this, options);
  }
  /** Redact an async iterable of text chunks (LLM token streams). */
  redactStream(source, options) {
    return redactAsyncIterable(this, source, options);
  }
  /** Web Streams TransformStream that redacts text passing through. */
  transformStream(options) {
    return createTransformStream(this, options);
  }
  // OpenRedaction compatibility, so its JSON / CSV / XLSX / streaming processors accept piilite
  getPatterns() {
    return this.patterns;
  }
  getCacheStats() {
    return { size: 0, maxSize: 0, enabled: false };
  }
};
function restore(text, redactionMap, { fuzzy = true } = {}) {
  const keys = Object.keys(redactionMap ?? {}).sort((a, b) => b.length - a.length);
  if (!keys.length || typeof text !== "string") return text;
  let out = text.replace(new RegExp(keys.map(escapeRe).join("|"), "g"), (k) => redactionMap[k]);
  if (!fuzzy) return out;
  const canonical = /* @__PURE__ */ new Map();
  for (const k of keys) {
    const m = k.match(/^\[([A-Z][A-Z0-9_]*?)_(\d+)\]$/);
    if (m) canonical.set(`${m[1]}_${m[2]}`, redactionMap[k]);
  }
  if (!canonical.size) return out;
  return out.replace(/\[\s*([A-Za-z][A-Za-z0-9_]*?)[\s_-]+(\d+)\s*\]|\b([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*?)_(\d+)\b/g, (whole, a, b, c, d) => {
    const key = `${(a ?? c).toUpperCase().replace(/[\s-]+/g, "_")}_${b ?? d}`;
    return canonical.get(key) ?? whole;
  });
}
var shared;
var defaultInstance = () => shared ??= new Piilite();
var redact = (text) => defaultInstance().redact(text);
var scan = (text) => defaultInstance().scan(text);
var detect = (text) => defaultInstance().detect(text);
var hasPII = (text) => defaultInstance().hasPII(text);
var index_default = Piilite;
