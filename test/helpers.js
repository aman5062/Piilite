import { Piilite, verhoeffDigit, gstinChecksum, luhn } from "../src/index.js";

export const shield = new Piilite();

export const types = (text, s = shield) => s.scan(text).map((d) => d.type);

export const values = (text, type, s = shield) =>
  s
    .scan(text)
    .filter((d) => !type || d.type === type)
    .map((d) => d.value);

// Valid fixtures built from checksums, so tests never rely on real people's data
export const makeAadhaar = (first11) => first11 + verhoeffDigit(first11);
export const makeGstin = (first14) => first14 + gstinChecksum(first14);
export const makeVid = (first15) => first15 + verhoeffDigit(first15);

export const makeCard = (first15) => {
  for (let d = 0; d < 10; d++) if (luhn(first15 + d)) return first15 + d;
};
