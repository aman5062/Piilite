import { FIRST_NAMES, SURNAMES, AMBIGUOUS_SURNAMES, AMBIGUOUS_FIRST, NOT_NAME } from "../data/names.js";

// Words that end a name captured after a trigger ("my name is Rahul Sharma and ...")
const STOP = new Set(`
is hai hu hoon hun hoo h and aur from se ka ki ke the a an i am my me here ji sir madam working studying live
living rehta rehti rahta rahti i'm im age aged years yrs contact phone mobile email call at in on with for to of
by kya kaise but or so please pls plz thanks thank hello hi hey good morning evening bhai sahab saab urf alias
also too only just main mein hum we you he she they it this that was were will can not no yes ok okay mera meri
mere naam name number no. s/o d/o w/o c/o son daughter wife husband father mother,
`.trim().split(/\s+/));

// Strong triggers: whatever name-like words follow are taken
const STRONG = new RegExp(
  [
    String.raw`\bmy\s+(?:full\s+|good\s+|first\s+|last\s+)?name\s*(?:is|'s|:|-|=)?`,
    String.raw`\b(?:mera|meri|apna|hamara)\s+(?:naam|name)(?:\s+(?:hai|h))?`,
    String.raw`\b(?:naam|name)\s+(?:hai|h)\b`,
    String.raw`(?<!\b(?:file|user|host|domain|brand|company|product|variable|column|field|display|screen|app|project|class|function|table|database|db|business|shop|store|team|group|channel|code|bank|model|device|server|branch|course|package|key)\s)` +
      String.raw`\b(?:(?:full|first|last|middle|sur|given|candidate'?s?|applicant'?s?|customer'?s?|patient'?s?|student'?s?|employee'?s?|account\s+holder'?s?|holder'?s?|father'?s?|mother'?s?|husband'?s?|wife'?s?|spouse'?s?|guardian'?s?|nominee'?s?|parent'?s?|contact)\s*)?name\s*(?::|-|=|\bis\b)`,
    String.raw`\b(?:naam|nam)\s*[:\-=]`,
    String.raw`\b(?:s\/o|d\/o|w\/o|c\/o|son\s+of|daughter\s+of|wife\s+of|husband\s+of|father\s+name|mother\s+name)\s*[:\-]?`,
  ].join("|"),
  "gi"
);

// Weak triggers: following words must look like a name
const WEAK = /\b(?:i\s+am|i'm|im|this\s+is|myself|call\s+me|it'?s|main|mai|me|hum|regards|thanks|thank\s+you|sincerely|cheers)\s*[,:\-]?\s*/gi;

// Honorifics: the honorific stays visible, the name after it is redacted
const HONORIFIC = /\b(?:mr|mrs|ms|miss|mister|dr|shri|sri|shree|smt|shrimati|kumari|km|kum|prof|er|adv|late|sh|sushri|janab|sardar|captain|capt|col|maj|gen|lt|justice)\.?\s+/gi;

const DEVANAGARI = /(?:मेरा\s+नाम|मेरी\s+नाम|नाम)\s*[:\-]?\s*((?:[ऀ-ॿ]+\s*){1,4})/gu;
const DEV_STOP = /\s*(?:है|हूँ|हूं|और|का|की|के)(?:\s|$).*$/su;

const HONOR_WORDS = new Set("mr mrs ms miss dr shri sri shree smt kumari km late sh sushri prof er adv janab sardar".split(" "));

const WORD = /[A-Za-z][A-Za-z'.]*(?![A-Za-z'.\/])/y;

function readWords(text, pos, max = 4) {
  const words = [];
  let i = pos;
  while (words.length < max) {
    while (i < text.length && (text[i] === " " || text[i] === "\t")) i++;
    WORD.lastIndex = i;
    const m = WORD.exec(text);
    if (!m) break;
    const raw = m[0].replace(/\.+$/, (dots) => (m[0].length <= 2 ? dots : ""));
    words.push({ text: raw, start: i, end: i + raw.length, lower: raw.toLowerCase().replace(/\.$/, "") });
    i = i + m[0].length;
    // a name never continues across sentence punctuation or line breaks
    if (/^[,;!?\n]/.test(text.slice(i, i + 1)) || /^\.\s/.test(text.slice(i - 1, i + 1)) && raw.length > 2) break;
  }
  return words;
}

const isCap = (w) => /^[A-Z]/.test(w.text);
const isInitial = (w) => /^[A-Za-z]\.?$/.test(w.text) && isCap(w);
const known = (w) => FIRST_NAMES.has(w.lower) || SURNAMES.has(w.lower);

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

export function findNames(text) {
  const out = [];
  let m;

  STRONG.lastIndex = 0;
  while ((m = STRONG.exec(text))) {
    const read = readWords(text, m.index + m[0].length, 5);
    while (read.length && HONOR_WORDS.has(read[0].lower)) read.shift();
    const words = takeWhile(read, (w) => w.text.length > 1 || isInitial(w));
    const s = span(words, 0.95);
    if (s) out.push(s);
  }

  WEAK.lastIndex = 0;
  while ((m = WEAK.exec(text))) {
    const words = readWords(text, m.index + m[0].length);
    if (!words.length) continue;
    const first = words[0];
    // the first word must be a name we know, or a capitalised word followed by a known surname
    const looksLikeName =
      (FIRST_NAMES.has(first.lower) && (isCap(first) || !NOT_NAME.has(first.lower))) ||
      (isCap(first) && !NOT_NAME.has(first.lower) && words[1] && SURNAMES.has(words[1].lower) && isCap(words[1]));
    if (!looksLikeName) continue;
    const taken = takeWhile(words, (w, i) => i === 0 || known(w) || (isCap(w) && !NOT_NAME.has(w.lower)) || isInitial(w));
    const s = span(taken, 0.9);
    if (s) out.push(s);
  }

  HONORIFIC.lastIndex = 0;
  while ((m = HONORIFIC.exec(text))) {
    const taken = takeWhile(readWords(text, m.index + m[0].length), (w) => isCap(w) || known(w));
    const s = span(taken, 0.9);
    if (s) out.push(s);
  }

  DEVANAGARI.lastIndex = 0;
  while ((m = DEVANAGARI.exec(text))) {
    const name = m[1].replace(DEV_STOP, "").trim();
    if (!name) continue;
    const start = m.index + m[0].indexOf(m[1]);
    out.push({ start, end: start + name.length, confidence: 0.9 });
  }

  out.push(...dictionaryNames(text));
  return out;
}

// "Rahul Sharma", "rahul kumar sharma", "Priya" without any trigger
function dictionaryNames(text) {
  const out = [];
  const re = /[A-Za-z][A-Za-z']*/g;
  const words = [];
  let m;
  while ((m = re.exec(text))) {
    words.push({ text: m[0], start: m.index, end: m.index + m[0].length, lower: m[0].toLowerCase() });
  }
  const adjacent = (a, b) => /^[ \t]+$/.test(text.slice(a.end, b.start)) || /^[ \t]*[A-Z]\.[ \t]*$/.test(text.slice(a.end, b.start));

  const caseMatch = (a, b) => isCap(a) === isCap(b);
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const isFirst = FIRST_NAMES.has(w.lower);
    if (!isFirst && !(isCap(w) && !NOT_NAME.has(w.lower))) continue;

    // grow a run of known name words: "Mohd Imran Qureshi", "rahul kumar sharma"
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

    let confidence = 0;
    if (run.length > 1 && hasFirst && (hasSurname || run.length > 2)) confidence = 0.9;
    else if (run.length > 1 && hasFirst && isCap(w)) confidence = 0.8;
    else if (run.length > 1 && strongSurname && isCap(w)) confidence = 0.85;
    else if (run.length === 1 && isFirst && isCap(w)) {
      // known first name + unknown capitalised word: "Rahul Xyzwala"
      const nx = words[i + 1];
      if (nx && adjacent(w, nx) && isCap(nx) && !NOT_NAME.has(nx.lower) && !FIRST_NAMES.has(nx.lower)) {
        end = i + 1;
        confidence = 0.75;
      } else if (!AMBIGUOUS_FIRST.has(w.lower)) confidence = 0.65;
    }
    if (!confidence) continue;

    out.push({ start: w.start, end: words[end].end, confidence });
    i = end;
  }
  return out;
}
