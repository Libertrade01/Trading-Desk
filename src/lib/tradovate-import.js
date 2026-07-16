const REQUIRED_HEADERS = ["symbol", "qty", "buyPrice", "sellPrice", "pnl", "boughtTimestamp", "soldTimestamp"];

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (char === "," && !quoted) {
      result.push(current.trim());
      current = "";
    } else current += char;
  }
  result.push(current.trim());
  return result;
}

function normalizeSymbol(value) {
  return String(value || "").trim().toUpperCase().replace(/[FGHJKMNQUVXZ]\d{1,2}$/, "");
}

function normalizeTradovateTimestamp(value) {
  const match = String(value || "").trim().match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!match) return null;
  const [, month, day, year, hour, minute, second = "00"] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")} ${hour.padStart(2, "0")}:${minute}:${second}`;
}

function parseMoney(value) {
  const input = String(value || "").trim();
  if (!input) return null;
  const negative = /^\$?\(.*\)$/.test(input.replace(/,/g, ""));
  const parsed = Number(input.replace(/[$,()]/g, ""));
  if (!Number.isFinite(parsed)) return null;
  return negative ? -Math.abs(parsed) : parsed;
}

export function isTradovateCSV(text) {
  const firstLine = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0];
  const headers = parseCSVLine(firstLine);
  return REQUIRED_HEADERS.every((header) => headers.includes(header));
}

export function parseTradovateCSV(text) {
  const lines = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("The Tradovate CSV does not contain any completed trades");

  const headers = parseCSVLine(lines[0]);
  const indexes = Object.fromEntries(headers.map((header, index) => [header, index]));
  const missing = REQUIRED_HEADERS.filter((header) => indexes[header] == null);
  if (missing.length) throw new Error(`Missing Tradovate columns: ${missing.join(", ")}`);

  const trades = [];
  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const columns = parseCSVLine(lines[lineIndex]);
    const boughtTimestamp = normalizeTradovateTimestamp(columns[indexes.boughtTimestamp]);
    const soldTimestamp = normalizeTradovateTimestamp(columns[indexes.soldTimestamp]);
    const buyPrice = Number(columns[indexes.buyPrice]);
    const sellPrice = Number(columns[indexes.sellPrice]);
    const qty = Number(columns[indexes.qty]);
    const rawPnl = parseMoney(columns[indexes.pnl]);

    if (!boughtTimestamp || !soldTimestamp || !Number.isFinite(buyPrice) || !Number.isFinite(sellPrice)) {
      throw new Error(`Tradovate row ${lineIndex + 1} has an invalid timestamp or fill price`);
    }
    if (!Number.isFinite(qty) || qty <= 0 || rawPnl == null) {
      throw new Error(`Tradovate row ${lineIndex + 1} has an invalid quantity or P&L`);
    }

    const isLong = boughtTimestamp <= soldTimestamp;
    trades.push({
      entry_time: isLong ? boughtTimestamp : soldTimestamp,
      exit_time: isLong ? soldTimestamp : boughtTimestamp,
      direction: isLong ? "LONG" : "SHORT",
      symbol: normalizeSymbol(columns[indexes.symbol]),
      qty,
      entry_price: isLong ? buyPrice : sellPrice,
      exit_price: isLong ? sellPrice : buyPrice,
      raw_pnl: rawPnl,
      platform: "Tradovate",
      broker_trade_id: [columns[indexes.buyFillId], columns[indexes.sellFillId]].filter(Boolean).join("_") || null,
    });
  }
  return trades.sort((a, b) => a.entry_time.localeCompare(b.entry_time));
}
