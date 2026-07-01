/**
 * rTrader / Rithmic CSV time columns include a Windows TZ abbrev in parentheses,
 * e.g. "Update Time (UTC)", "Update Time (SAPST)". Values are wall clock in that zone.
 * @see https://github.com/microsoft/Recognizers-Text/blob/master/Patterns/English/English-TimeZone.yaml
 */

export const RTRADER_IMPORT_TIMEZONE_OPTIONS = [
  { id: "UTC", label: "UTC" },
  { id: "America/New_York", label: "US Eastern (NYSE)" },
  { id: "America/Chicago", label: "US Central (Chicago)" },
  { id: "America/Lima", label: "Lima / Bogota (SAPST)" },
  { id: "America/Sao_Paulo", label: "São Paulo (ESAST)" },
  { id: "America/Los_Angeles", label: "US Pacific" },
  { id: "Europe/London", label: "London" },
];

const ALLOWED = new Set(RTRADER_IMPORT_TIMEZONE_OPTIONS.map((o) => o.id));

/** Map Rithmic column abbrev → IANA zone. ESAST is E. South America, not US Eastern. */
const ABBREV_TO_IANA = {
  UTC: "UTC",
  GMT: "UTC",
  EST: "America/New_York",
  EDT: "America/New_York",
  ET: "America/New_York",
  CST: "America/Chicago",
  CDT: "America/Chicago",
  CT: "America/Chicago",
  MST: "America/Denver",
  MDT: "America/Denver",
  PST: "America/Los_Angeles",
  PDT: "America/Los_Angeles",
  PT: "America/Los_Angeles",
  SAPST: "America/Lima",
  ESAST: "America/Sao_Paulo",
  ESAT: "America/Sao_Paulo",
  SAEST: "America/Sao_Paulo",
  PSAST: "America/Santiago",
  PDST: "America/Los_Angeles",
  PDTM: "America/Los_Angeles",
  BST: "Europe/London",
};

const TIME_COLUMN_NAMES = [
  "Update Time (UTC)",
  "Update Time (SAPST)",
  "Update Time (ESAST)",
  "Create Time (UTC)",
  "Create Time (SAPST)",
  "Create Time (ESAST)",
  "Update Time (EST)",
  "Update Time (EDT)",
  "Update Time (ET)",
  "Update Time (CST)",
  "Update Time (CDT)",
  "Update Time (PDT)",
  "Update Time (PST)",
  "Create Time (EST)",
  "Create Time (EDT)",
  "Create Time (ET)",
];

export function isValidRtraderImportTimezone(tz) {
  return ALLOWED.has(tz);
}

export function ianaFromRtraderAbbrev(abbrev) {
  if (!abbrev) return null;
  return ABBREV_TO_IANA[String(abbrev).toUpperCase()] || null;
}

/** Extract IANA zone from a column header like "Update Time (UTC)". */
export function ianaFromTimeColumnHeader(header) {
  const m = String(header || "").match(/\(([^)]+)\)\s*$/);
  if (m) {
    const mapped = ianaFromRtraderAbbrev(m[1]);
    if (mapped) return mapped;
  }
  if (/utc/i.test(header)) return "UTC";
  return null;
}

export function resolveRtraderTimeColumn(headers) {
  for (const name of TIME_COLUMN_NAMES) {
    const idx = headers.indexOf(name);
    if (idx >= 0) {
      return {
        idx,
        header: name,
        sourceTimeZone: ianaFromTimeColumnHeader(name) || "UTC",
      };
    }
  }
  const idx = headers.findIndex((h) => /^Update Time/i.test(h) || /^Create Time/i.test(h));
  if (idx < 0) return null;
  const header = headers[idx];
  return {
    idx,
    header,
    sourceTimeZone: ianaFromTimeColumnHeader(header) || "UTC",
  };
}

export const DEFAULT_RTRADER_IMPORT_TIMEZONE = "UTC";
