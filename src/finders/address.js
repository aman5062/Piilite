// Rule-based Indian address finder. An address starts at a label ("Address:",
// "r/o", "I live in") or at a house marker ("Flat no", "H.No", "Vill."), and
// runs until a PIN code, a line break, or the end of the sentence.

const LABEL = new RegExp(
  [
    // "Permanent address", "my address", or a bare "address" followed by ":" / "is"
    String.raw`(?<!\b(?:e-?mail|ip|mac|web|wallet|billing\s+e-?mail)\s)\b(?:(?:residential|permanent|current|present|correspondence|home|office|shipping|billing|delivery|postal|communication|my|our|his|her|their|your)\s+)(?:address|addr)\b\s*(?:is|:|-|=)?`,
    String.raw`(?<!\b(?:e-?mail|ip|mac|web|wallet)\s)\b(?:address|addr)\b\.?\s*(?::|-|=|\bis\b)`,
    String.raw`\b(?:shipping|delivery|billing|ship\s+to|deliver\s+to|send\s+to|courier\s+to)\s*[:\-]`,
    // "pata" alone also means "know" ("mujhe nahi pata"), so it needs ":" or an owner
    String.raw`\b(?:(?:ghar|office|dukaan|shop)\s+ka\s+pata|(?:mera|hamara|apna|uska)\s+pata)\s*(?:hai|h|:|-)?|\bpata\s*[:\-]`,
    String.raw`(?:(?:घर|ऑफिस|दुकान)\s+का\s+पता|(?:मेरा|हमारा|उसका)\s+पता)\s*(?:है|:|-)?|पता\s*[:\-]`,
    String.raw`\b(?:r\/o|resident\s+of|residing\s+at|lives?\s+(?:in|at)|living\s+(?:in|at)|staying\s+(?:in|at)|stay\s+(?:in|at))`,
    String.raw`\b(?:rehta|rehti|rahta|rahti)\s+(?:hu|hoon|hun|hai)\s+(?=\S)`,
  ].join("|"),
  "gi"
);

const MARKER =
  /\b(?:flat|house|plot|door|shop|room|quarter|qtr|bungalow)\s*(?:no\.?|number|#)?\s*[:\-]?\s*(?=[\w#])|\b(?:h|d)\.?\s?no\.?\s*[:\-]?\s*(?=\w)|\bhno\.?\s*(?=\d)|#\s?\d+[\w\/-]*\s*,|\b(?:vill(?:age)?|gram|grām)\.?\s*[:\-]?\s*(?=[A-Za-z])/gi;

const PIN = /(?<![\w])[1-9]\d{2}\s?\d{3}(?![\w])/g;

// Words that end the address clause
const BREAK = /\s+(?:and|but|aur|lekin|par|phone|mobile|mob|email|e-mail|call|contact|whatsapp|my|mera|meri|i|please|pls|since|for|because)\b/i;

// Abbreviations where a following "." does not end the sentence
const ABBR = /(?:^|[\s,])(?:no|nr|opp|rd|st|h|d|flat|sec|ph|dist|distt|po|ps|p\.o|vill|teh|tq|tal|mg|ext|apt|bldg|blk|near|plot|old|new|jn|ave|marg|chs|soc|[a-z])$/i;

const MAX_LEN = 180;

function clauseEnd(text, from) {
  const limit = Math.min(text.length, from + MAX_LEN);
  let end = limit;
  for (let i = from; i < limit; i++) {
    const ch = text[i];
    if (ch === "\n" || ch === "@" || ch === ";" || ch === "!" || ch === "?" || ch === "|") {
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

export function findAddresses(text) {
  const out = [];
  let m;

  LABEL.lastIndex = 0;
  while ((m = LABEL.exec(text))) {
    const from = m.index + m[0].length;
    const lead = text.slice(from).match(/^[\s:,-]*/)[0].length;
    const a = extend(text, from + lead, from + lead);
    // "I live in Patna" is enough; a bare word after "address" is not
    const words = a.value.split(/[\s,]+/).filter(Boolean);
    if (a.value.length < 3 || words.length < 1) continue;
    out.push({ start: a.start, end: a.end, confidence: words.length >= 2 || /\d/.test(a.value) ? 0.9 : 0.7 });
  }

  MARKER.lastIndex = 0;
  while ((m = MARKER.exec(text))) {
    const a = extend(text, m.index, m.index + m[0].length);
    // a house marker alone ("house no 12") is weak; need a comma-separated tail or a PIN
    const strong = /,/.test(a.value) || /[1-9]\d{2}\s?\d{3}$/.test(a.value);
    if (!strong) continue;
    out.push({ start: a.start, end: a.end, confidence: 0.85 });
  }
  return out;
}
