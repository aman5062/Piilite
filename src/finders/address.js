import { CITY_OR_STATE } from "../data/places.js";
import { FIRST_NAMES } from "../data/names.js";

// Rule-based Indian address finder. An address starts at a label ("Address:",
// "r/o", "I live in") or at a house marker ("Flat no", "H.No", "Vill."), and
// runs until a PIN code, a line break, or the end of the sentence.

const LABEL = new RegExp(
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
    String.raw`\b(?:rehta|rehti|rahta|rahti)\s+(?:hu|hoon|hun|hai)\s+(?=\S)`,
  ].join("|"),
  "gi"
);

const MARKER =
  /\b(?:flat|house|plot|door|shop|quarter|qtr|bungalow)\s*(?:no\.?|number|#)?\s*[:\-]?\s*(?=[\w#])|\b(?:h|d)\.?\s?no\.?\s*[:\-]?\s*(?=\w)|\bhno\.?\s*(?=\d)|#\s?\d+[\w\/-]*\s*,|\b(?:vill(?:age)?|gram|grām)\.?\s*[:\-]?\s*(?=[A-Za-z])/gi;

// Landmarks and localities: "near Hanuman Mandir, Sector 15, Noida". These are only
// trusted when the clause also has a comma and ends in a PIN code or names a city.
const LANDMARK =
  /\b(?:near|nr\.?|opp\.?|opposite|behind|beside|next\s+to|in\s+front\s+of)\s+(?=[A-Za-z])|\b(?:sector|sec|phase|block|ward|gali|street|lane|khasra|survey|cross)\s*(?:no\.?|number)?\s*[-:]?\s*\d+[A-Za-z]?\b|\b\d+(?:st|nd|rd|th)\s+(?:cross|main|floor|block|stage|phase|sector)\b/gi;
const HAS_PLACE = new RegExp(`\\b(?:${CITY_OR_STATE})\\b`, "i");

const PIN_AFTER_PLACE = new RegExp(`\\b(?:${CITY_OR_STATE})[\\s,.-]{1,3}[1-9]\\d{2}\\s?\\d{3}(?![\\w])`, "gi");

const PIN = /(?<![\w])[1-9]\d{2}\s?\d{3}(?![\w])/g;

// Words that end the address clause
const BREAK = /\s+(?:and|but|aur|lekin|par|phone|mobile|mob|email|e-mail|call|contact|whatsapp|my|mera|meri|i|please|pls|since|for|because|is|are|was|were|will|has|have|had|hai|tha|thi)\b/i;

// Words that make a comma-separated segment look like part of an address
const ADDRESS_WORD =
  /\b(?:road|rd|street|st|lane|marg|path|nagar|colony|sector|sec|phase|block|cross|main|layout|hills?|salai|lines|chowk|bazar|bazaar|market|vihar|enclave|apartments?|apts?|society|soc|tower|floor|wing|near|opp|behind|post|p\.?o|dist|distt|district|village|vill|tehsil|taluk|taluka|mandal|ward|gali|mohalla|puram|pet|palya|halli|wadi|pada|ganj|bagh|garden|park|extension|extn|stage|town|city|nagri|basti|estate|complex|residency|heights|plaza|bhawan|bhavan|kunj|niwas|sadan|kutir|tola|mohalla)\b/i;
const NAME_LINK = /\b(?:s\/o|d\/o|w\/o|c\/o|son of|daughter of|wife of|husband of|name|mr|mrs|ms|shri|smt|dr)\b/i;

// Abbreviations where a following "." does not end the sentence
const ABBR = /(?:^|[\s,])(?:no|nr|opp|rd|st|h|d|flat|sec|ph|dist|distt|po|ps|p\.o|vill|teh|tq|tal|mg|ext|apt|bldg|blk|near|plot|old|new|jn|ave|marg|chs|soc|[a-z])$/i;

const MAX_LEN = 180;

// A company's own address ("Example Technologies Pvt Ltd, Sector 62, Noida") is not personal
// data, but "Engineer at Acme Technologies, 45 Civil Lines, Jaipur" may be a home. So every
// address is masked by default; `keepCompanyAddresses: true` leaves the company-looking ones.
const COMPANY = String.raw`(?:pvt\.?\s*ltd|private\s+limited|ltd|limited|llp|inc|corp|corporation|technologies|solutions|infotech|industries|enterprises|software|systems|consultancy)\.?`;
const COMPANY_BEFORE = new RegExp(`\\b${COMPANY}\\s*[,\\-–:]?\\s*$`, "i");
const COMPANY_FIRST = new RegExp(`^[^,\\n]*\\b${COMPANY}\\s*(?:,|$)`, "i");

function isBusiness(text, start, end) {
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  const before = text.slice(Math.max(lineStart, start - 80), start);
  if (/\b(?:near|nr|opp|opposite|behind|beside)\s+[^,]*$/i.test(before)) return false;
  return COMPANY_BEFORE.test(before) || COMPANY_FIRST.test(text.slice(start, end));
}

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
  // stop before a phone number written inside the clause
  const phone = text.slice(from, end).match(/(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)/);
  if (phone && phone.index > 0) end = from + phone.index;
  return end;
}

function extend(text, start, from) {
  let end = clauseEnd(text, from);
  // end exactly at a PIN code when one is inside the clause
  PIN.lastIndex = from;
  let pin;
  let lastPin = null;
  while ((pin = PIN.exec(text)) && pin.index < end) lastPin = pin;
  if (lastPin) end = lastPin.index + lastPin[0].length;
  const value = text.slice(start, end).replace(/[\s,.\-:]+$/, "");
  return { start, end: start + value.length, value };
}

export function findAddresses(text, opts) {
  const found = [];
  let m;

  LABEL.lastIndex = 0;
  while ((m = LABEL.exec(text))) {
    const from = m.index + m[0].length;
    const lead = text.slice(from).match(/^[\s:,-]*/)[0].length;
    const a = extend(text, from + lead, from + lead);
    // "I live in Patna" is enough; a bare word after "address" is not
    const words = a.value.split(/[\s,]+/).filter(Boolean);
    if (a.value.length < 3 || words.length < 1) continue;
    found.push({ start: a.start, end: a.end, confidence: words.length >= 2 || /\d/.test(a.value) ? 0.9 : 0.7 });
  }

  MARKER.lastIndex = 0;
  while ((m = MARKER.exec(text))) {
    const a = extend(text, m.index, m.index + m[0].length);
    // a house marker alone ("house no 12") is weak; need a comma tail that names a place or a PIN
    const tail = a.value.slice(m[0].length);
    const strong = /,/.test(a.value) && (/[1-9]\d{2}\s?\d{3}$/.test(a.value) || HAS_PLACE.test(tail) || ADDRESS_WORD.test(tail));
    if (!strong) continue;
    found.push({ start: a.start, end: a.end, confidence: 0.85 });
  }

  // no label at all: "S/O Ram Lal, 45, Civil Lines, Jaipur 302001". Start at a PIN
  // code that follows a city, then walk back over address-like segments.
  PIN_AFTER_PLACE.lastIndex = 0;
  while ((m = PIN_AFTER_PLACE.exec(text))) {
    const end = m.index + m[0].length;
    if (found.some((a) => a.end === end)) continue;
    const lineStart = Math.max(text.lastIndexOf("\n", m.index) + 1, end - MAX_LEN);
    const head = text.slice(lineStart, end);
    const parts = head.split(/(?<=,)/);
    let take = 1;
    for (let k = parts.length - 2; k >= 0 && take < 7; k--) {
      const seg = parts[k].replace(/,$/, "").trim();
      if (!seg || NAME_LINK.test(seg) || /[.!?:;]\s/.test(seg) || seg.split(/\s+/).length > 5) break;
      // a person's name ("Mohd Imran") or words before the address ("mera pata hai 21") end the walk
      const firstWord = seg.split(/\s+/)[0].toLowerCase();
      if (FIRST_NAMES.has(firstWord) || (/^[a-z]/.test(seg) && !ADDRESS_WORD.test(seg))) break;
      if (!(/\d/.test(seg) || ADDRESS_WORD.test(seg) || HAS_PLACE.test(seg) || /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}$/.test(seg))) break;
      take++;
    }
    if (take < 3) continue;
    const startOffset = parts.slice(0, parts.length - take).join("").length;
    let start = lineStart + startOffset;
    while (start < end && /[\s,]/.test(text[start])) start++;
    found.push({ start, end, confidence: 0.8 });
  }

  LANDMARK.lastIndex = 0;
  while ((m = LANDMARK.exec(text))) {
    const a = extend(text, m.index, m.index + m[0].length);
    const endsInPin = /[1-9]\d{2}\s?\d{3}$/.test(a.value);
    if (!/,/.test(a.value) || !(endsInPin || HAS_PLACE.test(a.value))) continue;
    found.push({ start: a.start, end: a.end, confidence: 0.75 });
  }
  return opts?.keepCompanyAddresses ? found.filter((a) => !isBusiness(text, a.start, a.end)) : found;
}
