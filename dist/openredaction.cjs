var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/openredaction.js
var openredaction_exports = {};
__export(openredaction_exports, {
  OPENREDACTION_TYPES: () => OPENREDACTION_TYPES,
  createGlobalShield: () => createGlobalShield,
  detectXlsx: () => detectXlsx,
  openRedactionPatterns: () => openRedactionPatterns,
  openredaction: () => OR,
  redactCsv: () => redactCsv,
  redactDocument: () => redactDocument,
  redactJson: () => redactJson
});
module.exports = __toCommonJS(openredaction_exports);
var OR = __toESM(require("@openredaction/core"), 1);
var import_index = require("./index.cjs");
var OPENREDACTION_TYPES = [
  // identity documents and national IDs outside India
  // (FRENCH_SOCIAL_SECURITY and AUSTRALIAN_MEDICARE are left out: they match Indian loan / AWB numbers)
  "ITIN",
  "SIN_CA",
  "CANADIAN_SIN",
  "NATIONAL_INSURANCE_UK",
  "NHS_NUMBER",
  "CHI_NUMBER",
  "UTR_UK",
  "PASSPORT_MRZ_TD3",
  "PASSPORT_MRZ_TD1",
  "VISA_MRZ",
  "PASSPORT_UK",
  "PASSPORT_US",
  "DRIVING_LICENSE_UK",
  "AUSTRALIAN_TFN",
  "JAPANESE_MY_NUMBER",
  "SOUTH_KOREAN_RRN",
  "UAE_EMIRATES_ID",
  "SAUDI_NATIONAL_ID",
  "ISRAEL_ID",
  "TURKEY_ID",
  "SOUTH_AFRICA_ID",
  "NIGERIA_NIN",
  "NIGERIA_BVN",
  "CHILE_RUT",
  "CZECH_NATIONAL_ID",
  "ROMANIAN_CNP",
  "SPANISH_DNI",
  "ITALIAN_FISCAL_CODE",
  "DUTCH_BSN",
  "POLISH_PESEL",
  "SINGAPORE_NRIC",
  "BRAZILIAN_CPF",
  "MEXICAN_CURP",
  "MEXICAN_RFC",
  "QATAR_ID",
  "KUWAIT_CIVIL_ID",
  "KENYA_NATIONAL_ID",
  "KENYA_KRA_PIN",
  "EGYPT_NATIONAL_ID",
  "GHANA_CARD",
  "INDONESIA_NIK",
  "INDONESIA_NPWP",
  "THAILAND_NATIONAL_ID",
  "MALAYSIA_MYKAD",
  "ARGENTINA_DNI",
  "ARGENTINA_CUIT",
  "COLOMBIA_CEDULA",
  "PERU_DNI",
  "PERU_RUC",
  "VENEZUELA_CEDULA",
  "ECUADOR_CEDULA",
  "URUGUAY_CEDULA",
  "RUSSIAN_SNILS",
  "UKRAINIAN_INN",
  "HUNGARIAN_PERSONAL_ID",
  "BULGARIAN_PERSONAL_NUMBER",
  "SERBIAN_JMBG",
  "NEW_ZEALAND_IRD",
  "KAZAKHSTAN_IIN",
  "GERMAN_TAX_ID",
  "BAHRAIN_CPR",
  "OMAN_CIVIL_ID",
  "JORDAN_NATIONAL_ID",
  "PHILIPPINES_UMID",
  "VIETNAM_CCCD",
  "US_EIN",
  // banking outside India
  "BANK_ACCOUNT_UK",
  "SORT_CODE_UK",
  "UK_SORT_CODE_ACCOUNT",
  "ROUTING_NUMBER_US",
  "BSB_AU",
  "CLABE",
  "CARD_TRACK1_DATA",
  "CARD_TRACK2_DATA",
  "PAYMENT_TOKEN",
  // crypto wallets
  "BITCOIN_ADDRESS",
  "ETHEREUM_ADDRESS",
  "LITECOIN_ADDRESS",
  "MONERO_ADDRESS",
  "RIPPLE_ADDRESS",
  "CARDANO_ADDRESS",
  "SOLANA_ADDRESS",
  "POLKADOT_ADDRESS",
  "COSMOS_ADDRESS",
  "TEZOS_ADDRESS",
  // health
  "MEDICAL_RECORD_NUMBER",
  "HEALTH_PLAN_NUMBER",
  "NPI_NUMBER",
  "DEA_NUMBER",
  "EHIC_NUMBER",
  "BIOMETRIC_ID",
  // devices and vehicles
  "VIN",
  "IMSI_NUMBER",
  // secrets piilite does not have a dedicated pattern for
  "AWS_SECRET_KEY",
  "SSH_PRIVATE_KEY",
  "AZURE_STORAGE_KEY",
  "GCP_SERVICE_ACCOUNT",
  "OAUTH_CLIENT_SECRET",
  "TWILIO_API_KEY",
  "SENDGRID_API_KEY",
  "MAILGUN_API_KEY",
  "HEROKU_API_KEY",
  "DOCKER_AUTH",
  "KUBERNETES_SECRET",
  "FIREBASE_API_KEY",
  "DATABASE_CONNECTION",
  "OAUTH_TOKEN",
  "GENERIC_SECRET",
  // addresses outside India
  "POSTCODE_UK",
  "ADDRESS_PO_BOX"
];
var BRIDGE_PRIORITY = 40;
function openRedactionPatterns({ types = OPENREDACTION_TYPES } = {}) {
  const allow = new Set(types);
  return OR.allPatterns.filter((p) => allow.has(p.type)).map((p) => ({
    ...p,
    priority: BRIDGE_PRIORITY,
    severity: p.severity ?? "high",
    // OpenRedaction validators expect (value, context) and may throw on odd input
    validator: p.validator ? (value, ctx) => {
      try {
        return p.validator(value, ctx);
      } catch {
        return false;
      }
    } : void 0
  }));
}
function createGlobalShield(options = {}) {
  return new import_index.Piilite({
    ...options,
    customPatterns: [...openRedactionPatterns(options), ...options.customPatterns ?? []]
  });
}
var shieldFor = (shield) => shield ?? createGlobalShield();
async function redactDocument(buffer, { shield, ...documentOptions } = {}) {
  const text = await new OR.DocumentProcessor().extractText(buffer, documentOptions);
  return shieldFor(shield).detect(text);
}
async function redactJson(data, { shield, ...jsonOptions } = {}) {
  const processor = new OR.JsonProcessor();
  const value = typeof data === "string" ? processor.parse(data) : data;
  const s = shieldFor(shield);
  const detection = await processor.detect(value, s, jsonOptions);
  return { value: processor.redact(value, detection, jsonOptions), detection };
}
function redactCsv(input, { shield, header = true, delimiter, quote = '"', columns } = {}) {
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
async function detectXlsx(buffer, { shield, ...xlsxOptions } = {}) {
  const processor = new OR.XlsxProcessor();
  if (!processor.isAvailable()) throw new Error("piilite: XLSX support needs the `xlsx` package (npm install xlsx)");
  return processor.detect(buffer, shieldFor(shield), xlsxOptions);
}
