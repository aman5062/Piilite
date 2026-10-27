// Text helpers. normalize() never changes string length, so match offsets on the
// normalized copy are valid offsets into the original text.

// Zero digits of Indic scripts (Devanagari, Bengali, Gurmukhi, Gujarati, Odia,
// Tamil, Telugu, Kannada, Malayalam) plus fullwidth digits
const DIGIT_ZEROS = [0x0966, 0x09e6, 0x0a66, 0x0ae6, 0x0b66, 0x0be6, 0x0c66, 0x0ce6, 0x0d66, 0xff10];

export function normalize(text) {
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
    // zero-width space / BOM / nbsp / thin spaces become plain spaces
    if (code === 0x200b || code === 0xfeff || code === 0x00a0 || (code >= 0x2000 && code <= 0x200a)) ch = " ";
    // fullwidth @ and dashes
    else if (code === 0xff20) ch = "@";
    else if (code === 0x2010 || code === 0x2011 || code === 0x2012 || code === 0x2013 || code === 0x2014) ch = "-";
    out += ch;
  }
  return out;
}

// Lowercased text around a span, used for keyword context checks
export function contextAround(text, start, end, before = 40, after = 20) {
  return (text.slice(Math.max(0, start - before), start) + " \u0000 " + text.slice(end, end + after)).toLowerCase();
}

export function contextBefore(text, start, before = 40) {
  return text.slice(Math.max(0, start - before), start).toLowerCase();
}

// Build a keyword regex that also works next to non-latin characters
export function keywords(list) {
  return new RegExp(`(?:^|[^a-z0-9])(?:${list.join("|")})(?![a-z0-9])`, "i");
}
