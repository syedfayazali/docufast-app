// Display names for categories. The stored category names stay as they are in the database;
// only what the customer reads is neutral (we are a private document-help service).
const MAP = { "Government Documents": "Other Documents", Passport: "Passport & ID", Deeds: "Property Documents" };
export const catLabel = (c) => MAP[c] || c;

/** Old orders (before official fees were separated) collected the government fee in the total. Show it only for those. */
export const govFeeCollected = (a) =>
  Number(a?.government_fee) > 0 &&
  Math.round(Number(a?.total || 0)) === Math.round(Number(a?.government_fee || 0) + Number(a?.service_charge || 0) + Number(a?.other_charges || 0));
