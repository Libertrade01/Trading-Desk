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

function shortLabelForSetup(name) {
  if (SETUP_SHORT_LABELS[name]) return SETUP_SHORT_LABELS[name];
  const words = String(name).trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 6);
  return words.map((w) => w[0]?.toUpperCase() || "").join("").slice(0, 6) || name.slice(0, 6);
}

/** Compact labels for CSV import preview table cells */
export function buildSetupOptions(playbookNames = VALID_SETUPS) {
  const names = playbookNames?.length ? playbookNames : VALID_SETUPS;
  return [
    { value: "", label: "—" },
    ...names.map((value) => ({ value, label: shortLabelForSetup(value) })),
    { value: SETUP_IMPROVISED, label: SETUP_SHORT_LABELS[SETUP_IMPROVISED] },
    { value: SETUP_INVALID, label: SETUP_SHORT_LABELS[SETUP_INVALID] },
  ];
}

export const SETUP_OPTIONS = buildSetupOptions();
