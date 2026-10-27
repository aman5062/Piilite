import * as v from "../validators.js";
import { keywords } from "../text.js";
import { CITY_OR_STATE } from "../data/places.js";

// Vehicle / driving licence state and UT codes
export const STATE_CODES =
  "AN|AP|AR|AS|BR|CG|CH|DD|DL|DN|GA|GJ|HP|HR|JH|JK|KA|KL|LA|LD|MH|ML|MN|MP|MZ|NL|OD|OR|PB|PY|RJ|SK|TN|TR|TS|UK|UA|UP|WB";
const STATE_SET = new Set(STATE_CODES.split("|"));

// Common UPI handles (the part after @)
const UPI_HANDLES = [
  "ok(?:axis|hdfcbank|icici|sbi)", "ybl", "ibl", "axl", "paytm", "pt(?:hdfc|sbi|yes|axis)", "upi", "apl", "yapl", "rapl",
  "axisbank", "axisb", "icici", "sbi", "hdfcbank", "kotak", "kmbl", "wa(?:icici|hdfcbank|axis|sbi)", "jupiteraxis",
  "fbl", "ikwik", "freecharge", "airtel", "jio", "idfcbank", "idfcfirst", "indus", "federal", "pnb", "barodampay",
  "cnrb", "boi", "unionbank", "uboi", "kbl", "rbl", "yesbank", "yesbankltd", "dbs", "hsbc", "sc", "citi", "citigold",
  "abfspay", "slice", "naviaxis", "superyes", "goaxb", "tapicici", "timecosmos", "postbank", "ippb", "mahb", "indianbank",
  "iob", "ucobank", "centralbank", "equitas", "aubank", "dlb", "kvb", "tmb", "csbpay", "jkb", "obc", "allbank",
  "andb", "vijb", "denabank", "syndicate", "corporation", "hdfcbankjd", "amazonpay", "apay", "okbizaxis", "pockets",
  "mobikwik", "ezeepay", "fam", "omni", "pingpay", "jarunion", "shriramhdfcbank", "yescred", "niyoicici", "cmsidfc",
].join("|");

// Reference numbers that look like IDs: UPI UTR / RRN, orders, invoices, SKUs
const REFERENCE = keywords([
  "utr", "rrn", "upi ref", "ref", "ref no", "reference", "txn", "transaction", "txn id", "order", "order id",
  "invoice", "inv", "receipt", "ticket", "awb", "tracking", "pnr", "booking", "sku", "item", "product",
  "model", "part", "serial", "batch", "lot", "imei", "folio", "policy", "claim", "loan", "emi", "cust id",
]);

// Bank names count as account context: "my SBI 50100234567890"
const BANKS = [
  "sbi", "state bank", "hdfc", "icici", "axis", "kotak", "pnb", "punjab national", "bob", "bank of baroda",
  "canara", "union bank", "boi", "bank of india", "idbi", "idfc", "indusind", "yes bank", "federal",
  "indian bank", "iob", "uco", "central bank", "bandhan", "au bank", "rbl", "south indian bank", "karnataka bank",
  "kvb", "city union", "dbs", "hsbc", "citi", "standard chartered", "paytm payments", "airtel payments",
  "india post", "ippb", "cooperative bank", "gramin bank",
];

const MONTHS = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";

const noState = (value) => {
  const code = value.slice(0, 2).toUpperCase();
  return STATE_SET.has(code) ? code : null;
};

// lowercase plates like "up 12 ..." are often just English words with numbers;
// only accept a lowercase state code when the plate is written without spaces
const plateCase = (value) => {
  const code = value.slice(0, 2);
  return code === code.toUpperCase() || !/\s/.test(value);
};

export const indiaPatterns = [
  // ---------------------------------------------------------------- secrets typed in chat
  {
    type: "OTP",
    regex: /(?:\botp\b|one[\s-]?time[\s-]?pass(?:word|code)|verification code|auth(?:entication)? code|login code|\bओटीपी)[^0-9\n]{0,24}?(\d{4,8})(?!\d)/gid,
    group: 1,
    priority: 98,
    severity: "critical",
    confidence: 0.95,
    placeholder: "[OTP_{n}]",
  },
  {
    type: "PIN_SECRET",
    regex: /(?:\b(?:upi|atm|debit card|credit card|card|net ?banking)\s*pin|\bm-?pin|\bt-?pin)\b[^0-9\n]{0,16}?(\d{4,6})(?!\d)/gid,
    group: 1,
    priority: 98,
    severity: "critical",
    confidence: 0.95,
  },

  // ---------------------------------------------------------------- UIDAI
  {
    // 16 digit Virtual ID, only with context because it is the same length as a card
    type: "AADHAAR_VID",
    regex: /(?<![\w])\d{4}([\s-]?)\d{4}\1\d{4}\1\d{4}(?![\w])/g,
    validator: v.aadhaarVid,
    context: keywords(["vid", "virtual id", "virtual-id", "aadhaar vid", "aadhar vid"]),
    requireContext: true,
    lenient: true,
    priority: 97,
    severity: "critical",
  },
  {
    type: "AADHAAR",
    regex: /(?<![\w])[2-9]\d{3}([\s-]?)\d{4}\1\d{4}(?![\w-])/g,
    validator: v.aadhaar,
    context: keywords(["aadhaar", "aadhar", "adhaar", "adhar", "aadhaar card", "uid", "uidai", "आधार", "আধার", "ஆதார்", "ఆధార్", "ಆಧಾರ್", "ആധാർ", "આધાર", "ਆਧਾਰ"]),
    negativeContext: REFERENCE,
    lenient: true,
    priority: 93,
    severity: "critical",
    confidence: 0.85,
  },

  // ---------------------------------------------------------------- employment / health IDs (context only)
  {
    type: "UAN",
    regex: /(?<![\w])\d{12}(?![\w])/g,
    context: keywords(["uan", "universal account number", "epf", "pf no", "pf number", "provident fund"]),
    requireContext: true,
    contextOnly: "before",
    priority: 96,
    severity: "high",
  },
  {
    type: "ESIC",
    regex: /(?<![\w])(?:\d{17}|\d{10})(?![\w])/g,
    context: keywords(["esic", "esi no", "esi number", "insurance number", "ip number"]),
    requireContext: true,
    contextOnly: "before",
    priority: 96,
    severity: "high",
  },
  {
    type: "ABHA",
    regex: /(?<![\w-])\d{2}-\d{4}-\d{4}-\d{4}(?![\w-])/g,
    context: keywords(["abha", "health id", "ndhm", "abdm", "ayushman"]),
    priority: 96,
    severity: "high",
  },
  {
    type: "ABHA",
    regex: /(?<![\w])\d{14}(?![\w])/g,
    context: keywords(["abha", "health id", "ndhm", "abdm", "ayushman"]),
    requireContext: true,
    priority: 96,
    severity: "high",
  },
  {
    type: "ABHA_ADDRESS",
    regex: /(?<![\w.\-])[a-z0-9][\w.]{2,31}@(?:abdm|sbx|ndhm)(?![\w@]|\.\w)/gi,
    priority: 95,
    severity: "high",
  },

  // ---------------------------------------------------------------- tax
  {
    type: "GSTIN",
    regex: /(?<![A-Za-z0-9])\d{2}[A-Za-z]{5}\d{4}[A-Za-z][1-9A-Za-z][Zz][0-9A-Za-z](?![A-Za-z0-9])/g,
    validator: v.gstin,
    context: keywords(["gst", "gstin", "gst no", "gst number"]),
    lenient: true,
    priority: 95,
    severity: "medium",
  },
  {
    type: "PAN",
    regex: /(?<![A-Za-z0-9])[A-Za-z]{5}\d{4}[A-Za-z](?![A-Za-z0-9])/g,
    validator: v.pan,
    context: keywords(["pan", "pan card", "pan no", "pan number", "permanent account", "पैन"]),
    negativeContext: REFERENCE,
    lenient: true,
    priority: 90,
    severity: "critical",
    confidence: 0.85,
  },
  {
    type: "TAN",
    regex: /(?<![A-Za-z0-9])[A-Za-z]{4}\d{5}[A-Za-z](?![A-Za-z0-9])/g,
    context: keywords(["tan", "tan no", "tan number", "tax deduction"]),
    requireContext: true,
    priority: 89,
    severity: "medium",
  },
  {
    type: "CIN",
    regex: /(?<![A-Za-z0-9])[LUlu]\d{5}[A-Za-z]{2}\d{4}[A-Za-z]{3}\d{6}(?![A-Za-z0-9])/g,
    validator: (val) => STATE_SET.has(val.slice(6, 8).toUpperCase()),
    priority: 88,
    severity: "low",
  },

  // ---------------------------------------------------------------- banking
  {
    type: "UPI_ID",
    regex: new RegExp(`(?<![\\w.\\-])[\\w.\\-]{2,256}@(?:${UPI_HANDLES})(?![\\w@]|\\.\\w)`, "gi"),
    priority: 91,
    severity: "high",
    confidence: 0.9,
  },
  {
    // any handle, but only when the text talks about UPI
    type: "UPI_ID",
    regex: /(?<![\w.\-])[\w.\-]{2,256}@[a-z]{2,20}(?![\w@]|\.\w)/gi,
    context: keywords(["upi", "vpa", "gpay", "google pay", "phonepe", "phone pe", "paytm", "bhim", "pay to", "send to", "upi id"]),
    requireContext: true,
    priority: 90,
    severity: "high",
  },
  {
    type: "BANK_ACCOUNT",
    regex: /(?<![\w])\d(?:[\s-]?\d){8,17}(?![\w])/g,
    validator: (val) => !v.isJunkNumber(v.digitsOf(val)),
    context: keywords([
      "a/c", "a/c no", "ac no", "acc", "acc no", "acct", "account", "account no", "account number",
      "bank", "khata", "khata number", "saving", "savings", "current account", "बैंक", "खाता", ...BANKS,
    ]),
    requireContext: true,
    contextOnly: "before",
    contextWindow: 30,
    priority: 92,
    severity: "critical",
  },
  {
    type: "IFSC",
    regex: /(?<![A-Za-z0-9])[A-Za-z]{4}0[A-Za-z0-9]{6}(?![A-Za-z0-9])/g,
    validator: (val, ctx) => val === val.toUpperCase() || /ifsc/i.test(ctx),
    context: keywords(["ifsc", "ifsc code", "branch"]),
    priority: 70,
    severity: "medium",
  },

  // ---------------------------------------------------------------- phones
  {
    type: "PHONE_IN",
    regex: /(?<![\w+])(?:(?:\+|00)\s?91[\s.-]*|91[\s.-]+|91(?=[6-9]\d{9}(?!\d))|0)?[6-9](?:[\s.-]?\d){9}(?![\w])/g,
    validator: v.indianMobile,
    context: keywords(["phone", "mobile", "mob", "cell", "call", "contact", "whatsapp", "number", "no", "ph", "tel", "फ़ोन", "मोबाइल"]),
    negativeContext: REFERENCE,
    priority: 80,
    severity: "high",
    confidence: 0.85,
  },
  {
    type: "PHONE_IN",
    // landline: 0 + STD code (2-4 digits) + local number, 10 digits after the 0
    regex: /(?<![\w+])(?:\+91[\s-]?|0)[1-5]\d{1,3}[\s-]?\d{6,8}(?![\w])/g,
    validator: v.indianLandline,
    priority: 79,
    severity: "high",
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
    severity: "high",
  },

  // ---------------------------------------------------------------- government IDs
  {
    type: "VOTER_ID",
    regex: /(?<![A-Za-z0-9])[A-Za-z]{3}\d{7}(?![A-Za-z0-9])/g,
    validator: (val, ctx) => val === val.toUpperCase() || /voter|epic|election/i.test(ctx),
    negativeContext: REFERENCE,
    context: keywords(["voter", "voter id", "epic", "election card", "election id", "matdata", "मतदाता"]),
    priority: 85,
    severity: "high",
    confidence: 0.7,
  },
  {
    type: "PASSPORT_IN",
    regex: /(?<![A-Za-z0-9])[A-PR-WYa-pr-wy][1-9]\d\s?\d{4}[1-9](?![A-Za-z0-9])/g,
    context: keywords(["passport", "passport no", "passport number", "पासपोर्ट"]),
    requireContext: true,
    priority: 87,
    severity: "critical",
  },
  {
    type: "DRIVING_LICENSE",
    regex: new RegExp(`(?<![A-Za-z0-9])(?:${STATE_CODES})[\\s-]?\\d{2}[\\s-]?(?:19|20)\\d{2}[\\s-]?\\d{7}(?!\\d)`, "gi"),
    validator: (val) => noState(val) !== null,
    context: keywords(["dl", "d.l", "driving", "licence", "license"]),
    priority: 88,
    severity: "high",
  },
  {
    // older / irregular licence numbers, only right after a licence label
    type: "DRIVING_LICENSE",
    regex: /(?:\bdl\b|\bd\.l\.|driving\s+licen[cs]e|\blicen[cs]e)\s*(?:no\.?|number|#)?\s*[:\-]?\s*([A-Za-z]{2}[\s-]?\d{1,2}[\sA-Za-z0-9\/-]{5,16}\d)(?![\w])/gid,
    group: 1,
    validator: (val) => noState(val) !== null,
    priority: 87,
    severity: "high",
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
    severity: "medium",
  },
  {
    // Bharat series: 22 BH 1234 AA
    type: "VEHICLE_REG",
    regex: /(?<![A-Za-z0-9])\d{2}[\s-]?BH[\s-]?\d{4}[\s-]?[A-Z]{1,2}(?![A-Za-z0-9])/gi,
    priority: 71,
    severity: "medium",
  },
  {
    type: "RATION_CARD",
    regex: /(?:ration\s*card|राशन\s*कार्ड)\s*(?:no\.?|number|#)?\s*[:\-]?\s*([A-Za-z0-9\/-]{8,20})(?![\w])/gid,
    group: 1,
    validator: (val) => /\d{4}/.test(val),
    priority: 86,
    severity: "high",
  },

  // ---------------------------------------------------------------- dates of birth
  {
    type: "DATE_OF_BIRTH",
    regex: new RegExp(
      `(?:\\bdob\\b|\\bd\\.o\\.b\\.?|date\\s+of\\s+birth|birth\\s*date|\\bborn(?:\\s+on)?|janm(?:\\s*tithi|\\s*din)?|जन्म(?:\\s*तिथि)?)` +
        `[^0-9A-Za-z\\n]{0,12}?(?:is\\s+|hai\\s+)?` +
        `(\\d{1,2}[\\/.\\-]\\d{1,2}[\\/.\\-](?:19|20)?\\d{2}|(?:19|20)\\d{2}-\\d{2}-\\d{2}|\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTHS})[a-z]*,?\\s+(?:19|20)\\d{2}|(?:${MONTHS})[a-z]*\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+(?:19|20)\\d{2})(?!\\d)`,
      "gid"
    ),
    group: 1,
    validator: (val) => {
      const m = val.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
      if (m) return v.validDate(m[1], m[2], m[3]) || v.validDate(m[2], m[1], m[3]);
      const iso = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (iso) return v.validDate(iso[3], iso[2], iso[1]);
      return true;
    },
    priority: 75,
    severity: "high",
  },

  // ---------------------------------------------------------------- PIN codes
  {
    type: "PINCODE",
    regex: /(?<![\w])[1-9]\d{2}\s?\d{3}(?![\w])/g,
    context: keywords(["pin", "pincode", "pin code", "postal code", "postal", "zip", "zipcode", "पिन", "पिनकोड"]),
    requireContext: true,
    contextOnly: "before",
    contextWindow: 20,
    priority: 50,
    severity: "medium",
  },
  {
    // "Mumbai 400053", "Patna - 800001", "Delhi-110001"
    type: "PINCODE",
    regex: new RegExp(`(?<=\\b(?:${CITY_OR_STATE})[\\s,.-]{1,3})[1-9]\\d{2}\\s?\\d{3}(?![\\w])(?!\\s+(?:area|areas|region|zone|belt|circle|division))`, "gi"),
    priority: 50,
    severity: "medium",
  },
];
