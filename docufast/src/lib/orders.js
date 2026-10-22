// Helpers for admin Orders (customer address, form details, payment text).
export function addressLines(app) {
  const f = app?.form_data || {};
  return [f.address, f.city, f.district, f.state, f.pin && `PIN ${f.pin}`].map((x) => String(x || "").trim()).filter(Boolean);
}

const LABELS = {
  fullName: "Full name", parentName: "Parent / guardian", dob: "Date of birth", gender: "Gender",
  mobile: "Mobile", email: "Email",
};

/** Application form answers (excluding address, internal keys and documents). */
export function formRows(app) {
  const f = app?.form_data || {};
  const skip = new Set(["address", "city", "district", "state", "pin", "_doc_paths", "website"]);
  return Object.entries(f)
    .filter(([k, v]) => !skip.has(k) && !k.startsWith("_") && v !== "" && v != null && typeof v !== "object")
    .map(([k, v]) => [LABELS[k] || k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()), String(v)]);
}

export const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
export const when = (d) => (d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }) : "—");
export const methodLabel = (p) => (p?.payment_method === "cashfree" ? "Online (Cashfree)" : p?.payment_method === "upi_manual" ? "Manual UPI" : p?.payment_method || "—");
