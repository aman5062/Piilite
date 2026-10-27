// OpenRedaction bridge: piilite's India engine + OpenRedaction's global pattern
// library and document / structured-data processors.
//
//   npm install piilite @openredaction/core
//   import { createGlobalShield, redactDocument } from "piilite/openredaction";
//
// Only an allowlist of OpenRedaction pattern types is used: national IDs of other
// countries, foreign bank formats, crypto wallets, health IDs and secrets. Types
// that misfire on Indian text (names, US ZIPs, licence plates, gamer tags, order
// and booking references ...) or that piilite already covers are left out. The
// list was checked against eval/*.json, see eval/openredaction-noise.js.
import * as OR from "@openredaction/core";
import { Piilite } from "./index.js";

export const OPENREDACTION_TYPES = [
  // identity documents and national IDs outside India
  // (FRENCH_SOCIAL_SECURITY and AUSTRALIAN_MEDICARE are left out: they match Indian loan / AWB numbers)
  "ITIN", "SIN_CA", "CANADIAN_SIN", "NATIONAL_INSURANCE_UK", "NHS_NUMBER", "CHI_NUMBER", "UTR_UK",
  "PASSPORT_MRZ_TD3", "PASSPORT_MRZ_TD1", "VISA_MRZ", "PASSPORT_UK", "PASSPORT_US", "DRIVING_LICENSE_UK",
  "AUSTRALIAN_TFN", "JAPANESE_MY_NUMBER", "SOUTH_KOREAN_RRN", "UAE_EMIRATES_ID",
  "SAUDI_NATIONAL_ID", "ISRAEL_ID", "TURKEY_ID", "SOUTH_AFRICA_ID", "NIGERIA_NIN", "NIGERIA_BVN", "CHILE_RUT",
  "CZECH_NATIONAL_ID", "ROMANIAN_CNP", "SPANISH_DNI", "ITALIAN_FISCAL_CODE",
  "DUTCH_BSN", "POLISH_PESEL", "SINGAPORE_NRIC", "BRAZILIAN_CPF", "MEXICAN_CURP", "MEXICAN_RFC", "QATAR_ID",
  "KUWAIT_CIVIL_ID", "KENYA_NATIONAL_ID", "KENYA_KRA_PIN", "EGYPT_NATIONAL_ID", "GHANA_CARD", "INDONESIA_NIK",
  "INDONESIA_NPWP", "THAILAND_NATIONAL_ID", "MALAYSIA_MYKAD", "ARGENTINA_DNI", "ARGENTINA_CUIT",
  "COLOMBIA_CEDULA", "PERU_DNI", "PERU_RUC", "VENEZUELA_CEDULA", "ECUADOR_CEDULA", "URUGUAY_CEDULA",
  "RUSSIAN_SNILS", "UKRAINIAN_INN", "HUNGARIAN_PERSONAL_ID", "BULGARIAN_PERSONAL_NUMBER", "SERBIAN_JMBG",
  "NEW_ZEALAND_IRD", "KAZAKHSTAN_IIN", "GERMAN_TAX_ID", "BAHRAIN_CPR", "OMAN_CIVIL_ID", "JORDAN_NATIONAL_ID",
  "PHILIPPINES_UMID", "VIETNAM_CCCD", "US_EIN",
  // banking outside India
  "BANK_ACCOUNT_UK", "SORT_CODE_UK", "UK_SORT_CODE_ACCOUNT", "ROUTING_NUMBER_US", "BSB_AU", "CLABE",
  "CARD_TRACK1_DATA", "CARD_TRACK2_DATA", "PAYMENT_TOKEN",
  // crypto wallets
  "BITCOIN_ADDRESS", "ETHEREUM_ADDRESS", "LITECOIN_ADDRESS", "MONERO_ADDRESS", "RIPPLE_ADDRESS",
  "CARDANO_ADDRESS", "SOLANA_ADDRESS", "POLKADOT_ADDRESS", "COSMOS_ADDRESS", "TEZOS_ADDRESS",
  // health
  "MEDICAL_RECORD_NUMBER", "HEALTH_PLAN_NUMBER", "NPI_NUMBER", "DEA_NUMBER", "EHIC_NUMBER", "BIOMETRIC_ID",
  // devices and vehicles
  "VIN", "IMSI_NUMBER",
  // secrets piilite does not have a dedicated pattern for
  "AWS_SECRET_KEY", "SSH_PRIVATE_KEY", "AZURE_STORAGE_KEY", "GCP_SERVICE_ACCOUNT", "OAUTH_CLIENT_SECRET",
  "TWILIO_API_KEY", "SENDGRID_API_KEY", "MAILGUN_API_KEY", "HEROKU_API_KEY", "DOCKER_AUTH", "KUBERNETES_SECRET",
  "FIREBASE_API_KEY", "DATABASE_CONNECTION", "OAUTH_TOKEN", "GENERIC_SECRET",
  // addresses outside India
  "POSTCODE_UK", "ADDRESS_PO_BOX",
];

// Below every piilite pattern, so Indian matches always win an overlap
const BRIDGE_PRIORITY = 40;

/** OpenRedaction patterns from the allowlist, ready for `customPatterns`. */
export function openRedactionPatterns({ types = OPENREDACTION_TYPES } = {}) {
  const allow = new Set(types);
  return OR.allPatterns
    .filter((p) => allow.has(p.type))
    .map((p) => ({
      ...p,
      priority: BRIDGE_PRIORITY,
      severity: p.severity ?? "high",
      // OpenRedaction validators expect (value, context) and may throw on odd input
      validator: p.validator
        ? (value, ctx) => {
            try {
              return p.validator(value, ctx);
            } catch {
              return false;
            }
          }
        : undefined,
    }));
}

/** A Piilite instance with OpenRedaction's global patterns added. */
export function createGlobalShield(options = {}) {
  return new Piilite({
    ...options,
    customPatterns: [...openRedactionPatterns(options), ...(options.customPatterns ?? [])],
  });
}

const shieldFor = (shield) => shield ?? createGlobalShield();

/**
 * Extract text from a PDF, DOCX, image (OCR) or text buffer with OpenRedaction's
 * DocumentProcessor, then redact it with piilite.
 * Needs the optional peers OpenRedaction asks for: pdf-parse, mammoth, tesseract.js.
 */
export async function redactDocument(buffer, { shield, ...documentOptions } = {}) {
  const text = await new OR.DocumentProcessor().extractText(buffer, documentOptions);
  return shieldFor(shield).detect(text);
}

/** Redact a JSON value (object, array, or JSON string) using OpenRedaction's JsonProcessor. */
export async function redactJson(data, { shield, ...jsonOptions } = {}) {
  const processor = new OR.JsonProcessor();
  const value = typeof data === "string" ? processor.parse(data) : data;
  const s = shieldFor(shield);
  const detection = await processor.detect(value, s, jsonOptions);
  return { value: processor.redact(value, detection, jsonOptions), detection };
}

/**
 * Redact CSV text cell by cell. Uses OpenRedaction's CSV parser and writer, but
 * not its CsvProcessor.redact(): in 1.1.5 that maps detections to the wrong row
 * when the file has a header. Placeholders are shared across the whole file.
 */
export function redactCsv(input, { shield, header = true, delimiter, quote = '"', columns } = {}) {
  const processor = new OR.CsvProcessor();
  const text = typeof input === "string" ? input : input.toString("utf-8");
  const rows = processor.parse(text, { delimiter, quote });
  const sep = delimiter ?? processor.detectDelimiter(text);
  const s = shieldFor(shield);
  const state = s.newState();
  const names = header && rows.length ? rows[0].values : [];
  let piiCount = 0;
  const out = rows.map((row, i) => {
    if (header && i === 0) return processor.formatRow(row.values, sep, quote);
    const values = row.values.map((v, col) => {
      if (columns && !columns.includes(names[col] ?? col)) return v;
      const r = s.detect(v, state);
      piiCount += r.detections.length;
      return r.redacted;
    });
    return processor.formatRow(values, sep, quote);
  });
  return { csv: out.join("\n"), redactionMap: state.map, piiCount };
}

/** Find PII in an XLSX workbook using OpenRedaction's XlsxProcessor (needs the `xlsx` peer). */
export async function detectXlsx(buffer, { shield, ...xlsxOptions } = {}) {
  const processor = new OR.XlsxProcessor();
  if (!processor.isAvailable()) throw new Error("piilite: XLSX support needs the `xlsx` package (npm install xlsx)");
  return processor.detect(buffer, shieldFor(shield), xlsxOptions);
}

export { OR as openredaction };
