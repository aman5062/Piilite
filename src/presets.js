// Ready-made type sets. A preset is applied first; your own options override it.

const CONTACT = ["NAME", "ADDRESS", "PINCODE", "PHONE_IN", "PHONE", "EMAIL", "SOCIAL_PROFILE"];
const INDIA_IDS = ["AADHAAR", "AADHAAR_VID", "PAN", "VOTER_ID", "PASSPORT_IN", "DRIVING_LICENSE", "RATION_CARD"];
const FINANCIAL = ["BANK_ACCOUNT", "UPI_ID", "CREDIT_CARD", "CVV", "CARD_EXPIRY", "IBAN", "OTP", "PIN_SECRET"];
const HEALTH = ["ABHA", "ABHA_ADDRESS"];
const EMPLOYMENT = ["UAN", "ESIC"];
const SECRETS = [
  "API_KEY", "PRIVATE_KEY", "JWT", "BEARER_TOKEN", "CONNECTION_STRING", "URL_CREDENTIALS", "PASSWORD", "OTP", "PIN_SECRET",
];
const DEVICE = ["IP_ADDRESS", "MAC_ADDRESS", "IMEI"];

const uniq = (...lists) => [...new Set(lists.flat())];

export const presets = {
  // India's Digital Personal Data Protection Act, 2023: any data about an identifiable person
  dpdp: {
    types: uniq(CONTACT, INDIA_IDS, FINANCIAL, HEALTH, EMPLOYMENT, DEVICE, ["DATE_OF_BIRTH", "VEHICLE_REG", "GSTIN", "SSN"]),
  },
  // identity verification flows
  kyc: {
    types: uniq(INDIA_IDS, ["NAME", "ADDRESS", "PINCODE", "DATE_OF_BIRTH", "PHONE_IN", "EMAIL"]),
  },
  // payments, lending, banking support
  fintech: {
    types: uniq(FINANCIAL, ["PAN", "AADHAAR", "AADHAAR_VID", "GSTIN", "IFSC", "SWIFT_BIC", "PASSWORD", "NAME", "PHONE_IN", "EMAIL"]),
  },
  // card data only (PCI DSS)
  pci: { types: ["CREDIT_CARD", "CVV", "CARD_EXPIRY", "PIN_SECRET"] },
  // hospitals, telemedicine, insurance
  healthcare: {
    types: uniq(HEALTH, CONTACT, ["AADHAAR", "DATE_OF_BIRTH", "PASSPORT_IN"]),
  },
  // payroll, hiring, resumes
  hr: {
    types: uniq(EMPLOYMENT, CONTACT, ["AADHAAR", "PAN", "BANK_ACCOUNT", "IFSC", "PASSPORT_IN", "DATE_OF_BIRTH", "DRIVING_LICENSE"]),
  },
  // credentials only, e.g. for logs and code
  secrets: { types: SECRETS },
  // EU GDPR personal data
  gdpr: {
    types: uniq(CONTACT, INDIA_IDS, FINANCIAL, HEALTH, DEVICE, ["DATE_OF_BIRTH", "IBAN", "SWIFT_BIC", "SSN"]),
  },
  // US HIPAA identifiers that apply to text
  hipaa: {
    types: uniq(CONTACT, HEALTH, DEVICE, ["DATE_OF_BIRTH", "SSN", "VEHICLE_REG", "BANK_ACCOUNT", "CREDIT_CARD", "AADHAAR"]),
  },
  // everything, and accept weaker matches: best for prompts sent to third-party models
  strict: { minConfidence: 0.4 },
  // only high-certainty matches, for analytics where false alarms are costly
  precise: { minConfidence: 0.8 },
};

export function resolvePreset(name) {
  if (!name) return {};
  const p = presets[name];
  if (!p) throw new Error(`piilite: unknown preset "${name}". Use one of: ${Object.keys(presets).join(", ")}`);
  return p;
}
