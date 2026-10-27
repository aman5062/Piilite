// Checksum and structure validators. All take the raw matched value.

export const digitsOf = (s) => s.replace(/\D/g, "");

// Verhoeff checksum (used by Aadhaar and Aadhaar VID)
const V_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const V_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];
const V_INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

export function verhoeff(num) {
  const d = digitsOf(num);
  if (!d) return false;
  let c = 0;
  for (let i = 0; i < d.length; i++) {
    c = V_D[c][V_P[i % 8][+d[d.length - 1 - i]]];
  }
  return c === 0;
}

// Compute the Verhoeff check digit for a number (used by tests and fixtures)
export function verhoeffDigit(num) {
  const d = digitsOf(num);
  let c = 0;
  for (let i = 0; i < d.length; i++) {
    c = V_D[c][V_P[(i + 1) % 8][+d[d.length - 1 - i]]];
  }
  return V_INV[c];
}

export function luhn(num) {
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

// Reject runs like 0000000000 or 1234567890 that are almost never real
export function isJunkNumber(d) {
  if (/^(\d)\1+$/.test(d)) return true;
  return "01234567890".includes(d) || "09876543210".includes(d);
}

// Card network prefixes, including RuPay (60, 65, 81, 82, 508, 353, 356)
const CARD_PREFIX = /^(?:4|5[1-5]|2[2-7]|3[47]|3[0689]|35|6|81|82|508)/;
export function creditCard(value) {
  const d = digitsOf(value);
  return d.length >= 13 && d.length <= 19 && CARD_PREFIX.test(d) && luhn(d) && !isJunkNumber(d);
}

export function aadhaar(value) {
  const d = digitsOf(value);
  return d.length === 12 && /^[2-9]/.test(d) && !isJunkNumber(d) && verhoeff(d);
}

export function aadhaarVid(value) {
  const d = digitsOf(value);
  return d.length === 16 && !isJunkNumber(d) && verhoeff(d);
}

// 4th character of a PAN is the holder type
const PAN_HOLDER = "PCHFATBLJGE";
export function pan(value) {
  const v = value.toUpperCase();
  return /^[A-Z]{3}[A-Z][A-Z]\d{4}[A-Z]$/.test(v) && PAN_HOLDER.includes(v[3]) && !/^0000/.test(v.slice(5, 9));
}

const GST_STATES = new Set([
  ...Array.from({ length: 38 }, (_, i) => String(i + 1).padStart(2, "0")),
  "97",
  "99",
]);
const B36 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export function gstinChecksum(value) {
  const v = value.toUpperCase();
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const prod = B36.indexOf(v[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(prod / 36) + (prod % 36);
  }
  return B36[(36 - (sum % 36)) % 36];
}
export function gstin(value) {
  const v = value.toUpperCase();
  return (
    v.length === 15 &&
    GST_STATES.has(v.slice(0, 2)) &&
    pan(v.slice(2, 12)) &&
    v[14] === gstinChecksum(v)
  );
}

export function iban(value) {
  const v = value.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(v)) return false;
  const re = (v.slice(4) + v.slice(0, 4)).replace(/[A-Z]/g, (c) => c.charCodeAt(0) - 55);
  let rem = 0;
  for (const ch of re) rem = (rem * 10 + +ch) % 97;
  return rem === 1;
}

export function indianMobile(value) {
  let d = digitsOf(value);
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 13 && d.startsWith("091")) d = d.slice(3);
  else if (d.length === 14 && d.startsWith("0091")) d = d.slice(4);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d.length === 10 && /^[6-9]/.test(d) && !isJunkNumber(d);
}

export function indianLandline(value) {
  let d = digitsOf(value);
  if (d.startsWith("91") && d.length === 12) d = d.slice(2);
  else if (d.startsWith("0") && d.length === 11) d = d.slice(1);
  else return false;
  return d.length === 10 && /^[1-5]/.test(d) && !isJunkNumber(d);
}

export function ipv4(value) {
  const parts = value.split(".");
  return parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p) && +p <= 255 && !(p.length > 1 && p[0] === "0"));
}

export function validDate(day, month, year) {
  const d = +day;
  const m = +month;
  let y = +year;
  if (String(year).length === 2) y += y > 30 ? 1900 : 2000;
  if (m < 1 || m > 12 || d < 1 || y < 1900 || y > 2100) return false;
  return d <= new Date(y, m, 0).getDate();
}
