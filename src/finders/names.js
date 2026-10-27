import { FIRST_NAMES, SURNAMES, AMBIGUOUS_SURNAMES, AMBIGUOUS_FIRST, NOT_NAME } from "../data/names.js";
import { PLACE_LIST } from "../data/places.js";

const PLACES = new Set(PLACE_LIST);

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
    String.raw`(?:(?<![a-z])[a-z]{1,20}_|\b)(?:full_?|first_?|last_?|customer_?|cust_?|user_?|contact_?|display_?)?name"?\s*[:=]\s*"?(?=[A-Za-z])`,
    String.raw`\b(?:s\/o|d\/o|w\/o|c\/o|son\s+of|daughter\s+of|wife\s+of|husband\s+of|father\s+name|mother\s+name)\s*[:\-]?`,
  ].join("|"),
  "gi"
);

// Medium triggers: capitalised words that follow are taken even if unknown
const MEDIUM = new RegExp(
  [
    String.raw`\bmyself\s*[,:\-]?\s*`,
    String.raw`\b(?:candidate|applicant|customer|client|patient|student|employee|member|holder|beneficiary|nominee|guardian|sender|receiver|recipient|payee|payer|tenant|landlord|owner|borrower|co-?applicant|insured|policyholder|passenger|guest|attn|attention|prepared\s+by|submitted\s+by|approved\s+by|signed\s+by|signed|contact\s+person|spoke\s+to|spoke\s+with|talked\s+to|met\s+with|referred\s+by|assigned\s+to)\s*(?::|-)\s*`,
    String.raw`\b(?:spoke\s+to|spoke\s+with|talked\s+to|met\s+with|referred\s+by|assigned\s+to|forwarded\s+to|reported\s+by|raised\s+by|on\s+behalf\s+of)\s+(?=[A-Z])`,
    String.raw`\b(?:caller|owner|driver|rider|agent|cc|bcc|attendee|speaker|host|interviewer|interviewee|reviewer|author|by)\s*(?::|-)?\s+(?=[A-Z])`,
    String.raw`\b(?:dear|hi|hello|hey|congratulations|congrats|welcome|thanks|thank\s+you|kudos|happy\s+birthday)\s*,?\s+(?=[A-Z])`,
    String.raw`\b(?:the\s+)?undersigned\s*,?\s*(?=[A-Z])`,
    String.raw`\b(?:interview|meeting|call|chat|session|appointment|demo|discussion)\s+(?:is\s+)?(?:scheduled\s+|fixed\s+|booked\s+)?with\s+(?=[A-Z])`,
    String.raw`\b(?:bro|bhai|bhaiya|didi|yaar|sir|madam|ma'am|ji)\s+(?=[A-Z][a-z]+\s+(?:se|ko|ka|ki|ke|ne|bhi|aur)\b)`,
  ].join("|"),
  "gi"
);

const POST =
  /\b([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+){1,2})(?=\s+(?:joined|joins|said|says|wrote|writes|replied|asked|told|called|emailed|messaged|resigned|left|will\s+join|has\s+joined|is\s+joining|has\s+resigned|reported|confirmed|approved|signed)\b)/g;
// the very next cell must be a phone number, an email or a number
const CSV_ROW = /^[ \t"]*([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+){1,3})[ \t"]*[,;|\t][ \t"]*(?=\+?\d[\d \t-]{7,}|[\w.+-]+@[\w-]+\.)/gm;

// Weak triggers: following words must look like a name
const WEAK = /\b(?:i\s+am|i'm|im|this\s+is|call\s+me|it'?s|main|mai|me|hum|regards|thanks|thank\s+you|sincerely|cheers)\s*[,:\-]?\s*/gi;

// Honorifics: the honorific stays visible, the name after it is redacted
const HONORIFIC = /\b(?:mr|mrs|ms|miss|mister|dr|shri|sri|shree|smt|shrimati|kumari|km|kum|prof|er|adv|late|sh|sushri|janab|sardar|captain|capt|col|maj|gen|lt|justice)\.?\s+/gi;

// "my name is" in Indian scripts: [phrase, bare label, letters of the script, words that end the name]
const SCRIPTS = [
  ["मेरा\\s+नाम|मेरी\\s+नाम|माझे\\s+नाव|माझं\\s+नाव", "नाम|नाव", "\\u0900-\\u097F", "है|हूँ|हूं|हैं|और|का|की|के|आहे|आणि"],
  ["আমার\\s+নাম", "নাম", "\\u0980-\\u09FF", "এবং|আমি|হল|হলো"],
  ["ਮੇਰਾ\\s+ਨਾਮ|ਮੇਰਾ\\s+ਨਾਂ", "ਨਾਮ|ਨਾਂ", "\\u0A00-\\u0A7F", "ਹੈ|ਅਤੇ"],
  ["મારું\\s+નામ|મારુ\\s+નામ", "નામ", "\\u0A80-\\u0AFF", "છે|અને"],
  ["ମୋର\\s+ନାମ|ମୋ\\s+ନାମ", "ନାମ", "\\u0B00-\\u0B7F", "ଏବଂ|ଅଟେ"],
  ["என்\\s+பெயர்|எனது\\s+பெயர்", "பெயர்", "\\u0B80-\\u0BFF", "மற்றும்"],
  ["నా\\s+పేరు", "పేరు", "\\u0C00-\\u0C7F", "మరియు"],
  ["ನನ್ನ\\s+ಹೆಸರು", "ಹೆಸರು", "\\u0C80-\\u0CFF", "ಮತ್ತು"],
  ["എന്റെ\\s+പേര്|എന്റെ\\s+പേര്", "പേര്", "\\u0D00-\\u0D7F", "ആണ്|ഉം"],
].map(([phrase, label, range, stop]) => ({
  re: new RegExp(`(?:${phrase}|(?:${label})\\s*[:\\-])\\s*[:\\-]?\\s*((?:[${range}]+[ \\t]*){1,4})`, "gu"),
  stop: new RegExp(`(?:^|\\s)(?:${stop})(?:\\s|$).*$`, "su"),
}));

const HONOR_WORDS = new Set("mr mrs ms miss dr shri sri shree smt kumari km late sh sushri prof er adv janab sardar".split(" "));

const WORD = /[A-Za-z][A-Za-z'.]*(?![A-Za-z'.\/])/y;

function readWords(text, pos, max = 4) {
  const words = [];
  let i = pos;
  while (words.length < max) {
    while (i < text.length && (text[i] === " " || text[i] === "\t" || text[i] === '"' || text[i] === "'")) i++;
    WORD.lastIndex = i;
    const m = WORD.exec(text);
    if (!m) break;
    const raw = m[0].replace(/\.+$/, (dots) => (m[0].length <= 2 ? dots : ""));
    const label = /^[ \t]*:/.test(text.slice(i + m[0].length, i + m[0].length + 3));
    words.push({ text: raw, start: i, end: i + raw.length, lower: raw.toLowerCase().replace(/\.$/, ""), label });
    i = i + m[0].length;
    // a name never continues across sentence punctuation or line breaks
    if (/^[,;!?\n]/.test(text.slice(i, i + 1)) || /^\.\s/.test(text.slice(i - 1, i + 1)) && raw.length > 2) break;
  }
  return words;
}

const isCap = (w) => /^[A-Z]/.test(w.text);
const isInitial = (w) => /^[A-Za-z]\.?$/.test(w.text) && isCap(w);
const known = (w) => FIRST_NAMES.has(w.lower) || SURNAMES.has(w.lower);

function takeWhile(words, ok, { labelled = false } = {}) {
  const out = [];
  for (const w of words) {
    if (w.label) break;
    // after an explicit "Name:" label any capitalised word counts; elsewhere common words end the name
    if (STOP.has(w.lower) || (NOT_NAME.has(w.lower) && !known(w) && !(labelled && isCap(w)))) break;
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
    const words = takeWhile(read, (w) => w.text.length > 1 || isInitial(w), { labelled: true });
    const s = span(words, 0.95);
    if (s) out.push(s);
  }

  MEDIUM.lastIndex = 0;
  while ((m = MEDIUM.exec(text))) {
    const words = readWords(text, m.index + m[0].length);
    while (words.length && HONOR_WORDS.has(words[0].lower)) words.shift();
    if (!words.length || !isCap(words[0])) continue;
    const taken = takeWhile(words, (w) => (isCap(w) && !NOT_NAME.has(w.lower)) || isInitial(w) || known(w));
    if (taken.length && PLACE_AFTER.has(taken[taken.length - 1].lower)) continue;
    if (taken.length && PLACES.has(taken.map((w) => w.lower).join(" "))) continue;
    const s = span(taken, 0.85);
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
    // "MS Excel", "DR Congo": capitalised short forms without a dot are not titles
    if (/^(?:MS|MR|DR|SH|ER|KM)\s/.test(m[0])) continue;
    const taken = takeWhile(readWords(text, m.index + m[0].length), (w) => isCap(w) || known(w));
    const s = span(taken, 0.9);
    if (s) out.push(s);
  }

  for (const { re, stop } of SCRIPTS) {
    re.lastIndex = 0;
    while ((m = re.exec(text))) {
      const name = m[1].replace(stop, "").replace(/[\s\u0964\u0965]+$/u, "").trim();
      if (!name) continue;
      const start = m.index + m[0].lastIndexOf(m[1]);
      out.push({ start, end: start + name.length, confidence: 0.9 });
    }
  }

  // "Nirav Thummar joined the team", "Gargi Ranadive said ..."
  POST.lastIndex = 0;
  while ((m = POST.exec(text))) {
    const first = m[1].split(/\s+/)[0].toLowerCase();
    if (NOT_NAME.has(first) || PLACES.has(m[1].toLowerCase())) continue;
    out.push({ start: m.index, end: m.index + m[1].length, confidence: 0.75 });
  }

  // résumé header: the first line is 2-4 name words and contact details follow soon after
  const header = text.match(/^[ \t]*((?:[A-Z][a-z]+|[A-Z]{2,})(?:[ \t]+(?:[A-Z][a-z]+|[A-Z]{2,}|[A-Z]\.)){1,3})[ \t]*(?:\n|[|•·]|$)/);
  if (header && /@|\+?\d[\d\s-]{9,}|linkedin|github/i.test(text.slice(0, 400))) {
    const words = header[1].split(/\s+/).map((w) => w.toLowerCase());
    if (!words.some((w) => NOT_NAME.has(w) || PLACE_AFTER.has(w) || PLACES.has(w))) {
      const start = header.index + header[0].indexOf(header[1]);
      out.push({ start, end: start + header[1].length, confidence: 0.85 });
    }
  }

  // CSV / export rows: "Nirav Thummar,9123456780,nirav@x.in"
  CSV_ROW.lastIndex = 0;
  while ((m = CSV_ROW.exec(text))) {
    const start = m.index + m[0].indexOf(m[1]);
    if (NOT_NAME.has(m[1].split(/\s+/)[0].toLowerCase())) continue;
    out.push({ start, end: start + m[1].length, confidence: 0.8 });
  }

  out.push(...dictionaryNames(text));
  return out;
}

// Words that turn a name into a place or institution: "Gandhi Nagar", "Nehru Place"
const PLACE_AFTER = new Set(`
nagar road rd marg chowk place colony vihar enclave park street st market bazar bazaar ganj puram pur layout
circle station hospital college school university institute stadium airport bridge setu bhawan bhavan sadan
hall maidan ground garden gardens gate temple mandir masjid church nagri basti chauraha tower towers complex
vidyalaya vidyapeeth vidyapith vidyapeetham academy convent mahavidyalaya vishwavidyalaya gurukul polytechnic
iti pvt ltd limited technologies solutions services industries enterprises infotech labs
society apartments residency memorial trust foundation award awards scheme yojana express mall cinema
`.trim().split(/\s+/));

// Endings that are typical of Indian surnames: Joglekar, Daruwala, Vekariya, Lalwani
const SURNAME_ENDING = /^[A-Z][a-z]{2,}(?:kar|ekar|wala|walla|wale|wani|vani|ani|iya|ariya|ariya|ji|appa|amma|esan|ayya|aiah|anna)$/;
const looksLikeSurname = (w) => SURNAME_ENDING.test(w.text) && !NOT_NAME.has(w.lower);

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

    // leading initials: "K. Ramesh", "A.K. Sharma", "R Madhavan"
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
    }
    else if (run.length > 1 && hasFirst && (hasSurname || run.length > 2)) confidence = 0.9;
    else if (run.length > 1 && hasFirst && isCap(w)) confidence = 0.8;
    else if (run.length > 1 && strongSurname && isCap(w)) confidence = 0.85;
    else if (run.length === 1 && isFirst && isCap(w)) {
      // known first name + unknown capitalised word: "Rahul Xyzwala"
      const nx = words[i + 1];
      if (nx && adjacent(w, nx) && isCap(nx) && !NOT_NAME.has(nx.lower) && !FIRST_NAMES.has(nx.lower)) {
        end = i + 1;
        confidence = 0.75;
        const third = words[i + 2];
        if (third && adjacent(nx, third) && isCap(third) && (SURNAMES.has(third.lower) || looksLikeSurname(third))) {
          end = i + 2;
          confidence = 0.85;
        }
      } else if (!AMBIGUOUS_FIRST.has(w.lower)) confidence = 0.65;
    }
    if (!confidence) continue;
    if (run.some((x, k) => k > 0 && PLACE_AFTER.has(x.lower)) || (end > i && PLACE_AFTER.has(words[end].lower))) continue;
    const after = words[end + 1];
    if (after && adjacent(words[end], after) && PLACE_AFTER.has(after.lower)) continue;

    out.push({ start, end: words[end].end, confidence });
    i = end;
  }
  return out;
}
