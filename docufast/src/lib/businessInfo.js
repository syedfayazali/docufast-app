/**
 * ONE place for the business details shown on the Terms, Privacy, Refund and
 * Contact pages and in the site footer.
 *
 * ⚠️  Replace every value that starts with "[" before going live.
 *     Payment gateways and customers check that these are real and complete.
 */
export const businessInfo = {
  brandName: "DocuFast India",

  // Legal name of the person/firm that owns the business (as on your PAN / registration)
  legalName: "DOCUFAST INDIA",

  // Full postal address of your office
  address: "SRYNO86 BK REDDY COLONY,MAHABUBNAGAR,TELANGANA,INDIA-509001",

  phone: "8374968022",
  whatsapp: "8374968022",
  email: "DOCUFAST.INDIA@GMAIL.COM",

  // Optional: leave as "" if you don't have one yet (the line is hidden when empty)
  gstin: "",
  registrationNo: "UDYAM-TS-05-0067577",

  // Grievance / complaint contact (Indian consumer & data-protection rules ask for one)
  grievanceOfficer: "SYED FAYAZ ALI",

  supportHours: "Mon–Sat, 10:00 AM – 9:00 PM IST",

  // Jurisdiction for disputes (city/state whose courts will hear them)
  jurisdiction: "TELANGANA",

  // Refund policy numbers (edit to match what you really do)
  refundWorkingDays: 7, // days to return money to the original payment method
  lastUpdated: "17 October 2026",
};

export const isPlaceholder = (v) => typeof v === "string" && v.trim().startsWith("[");
