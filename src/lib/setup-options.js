export const VALID_SETUPS = [
  "Peak and Fail (PAF)",
  "Break and Retest (BAR)",
  "LVN continuation",
  "VWAP in trend",
];

export const SETUP_IMPROVISED = "Improvised";
export const SETUP_INVALID = "Invalid / Not a Setup";

const SETUP_SHORT_LABELS = {
  "Peak and Fail (PAF)": "PAF",
  "Break and Retest (BAR)": "BAR",
  "LVN continuation": "LVN",
  "VWAP in trend": "VWAP",
  [SETUP_IMPROVISED]: "Improv.",
  [SETUP_INVALID]: "Invalid",
};

/** Compact labels for CSV import preview table cells */
export const SETUP_OPTIONS = [
  { value: "", label: "—" },
  ...VALID_SETUPS.map((value) => ({ value, label: SETUP_SHORT_LABELS[value] })),
  { value: SETUP_IMPROVISED, label: SETUP_SHORT_LABELS[SETUP_IMPROVISED] },
  { value: SETUP_INVALID, label: SETUP_SHORT_LABELS[SETUP_INVALID] },
];
