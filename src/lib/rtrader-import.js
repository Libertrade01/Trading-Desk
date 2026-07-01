import { supabase } from "./supabase";
import { getCurrentUserId } from "./user-storage";
import { withUserTradesQuery } from "./trades-query";
import { loadTraderSettings, getImportAccount } from "./trader-settings";
import { parseNaiveInTimezone, sessionDateFromNaive } from "./trade-time";
import { resolveRtraderTimeColumn } from "./rtrader-timezone";

const DEFAULT_IMPORT_ACCOUNT = {
  name: "Default Account",
  account_type: "eval",
  commissions: { MNQ: "0.50", NQ: "1.75", MES: "0.50", ES: "1.75", GC: "2.30", MGC: "0.80" },
};

function parseCSVLine(line) {
  const result = [];
  let cur = "";
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') inQ = !inQ;
    else if (ch === "," && !inQ) {
      result.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  result.push(cur.trim());
  return result;
}

export function parseRTraderCSV(text) {
  const lines = text.split("\n");
  let completedStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("Completed Orders")) {
      completedStart = i + 1;
      break;
    }
  }
  if (completedStart < 0) throw new Error("Could not find Completed Orders section");

  const headers = parseCSVLine(lines[completedStart]);
  const idxStatus = headers.indexOf("Status");
  const idxSide = headers.indexOf("Buy/Sell");
  const idxQty = headers.indexOf("Qty To Fill");
  const idxSymbol = headers.indexOf("Symbol");
  const idxPrice = headers.indexOf("Avg Fill Price");
  const timeCol = resolveRtraderTimeColumn(headers);
  if (!timeCol) throw new Error("Could not find Update Time or Create Time column in Completed Orders");
  const { idx: idxTime, header: timeColumnHeader, sourceTimeZone } = timeCol;

  const orders = [];
  for (let i = completedStart + 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = parseCSVLine(lines[i]);
    if (cols[idxStatus] !== "Filled") continue;
    const price = parseFloat(cols[idxPrice]);
    if (!price) continue;
    orders.push({
      time: cols[idxTime],
      side: cols[idxSide],
      qty: parseInt(cols[idxQty], 10),
      price,
      symbol: cols[idxSymbol].replace(/[A-Z]\d$/, "").trim(),
    });
  }

  orders.sort((a, b) => a.time.localeCompare(b.time));
  return { orders, sourceTimeZone, timeColumnHeader };
}

export function fifoReconstructTrades(orders) {
  const rawTrades = [];
  let position = 0;
  let entryQueue = [];

  for (const o of orders) {
    const { side, qty, price, time, symbol } = o;

    if (position === 0) {
      position = side === "B" ? qty : -qty;
      entryQueue = [{ qty, price, time, side, symbol }];
    } else if ((position > 0 && side === "B") || (position < 0 && side === "S")) {
      position += side === "B" ? qty : -qty;
      entryQueue.push({ qty, price, time, side, symbol });
    } else {
      let remaining = qty;
      while (remaining > 0 && entryQueue.length > 0) {
        const entry = entryQueue[0];
        const matched = Math.min(entry.qty, remaining);
        const rawPnl =
          entry.side === "B"
            ? (price - entry.price) * matched * 2
            : (entry.price - price) * matched * 2;

        rawTrades.push({
          entry_time: entry.time,
          exit_time: time,
          direction: entry.side === "B" ? "LONG" : "SHORT",
          symbol: entry.symbol,
          qty: matched,
          entry_price: entry.price,
          exit_price: price,
          raw_pnl: Math.round(rawPnl * 100) / 100,
        });

        entry.qty -= matched;
        remaining -= matched;
        if (entry.qty === 0) entryQueue.shift();
      }
      position += side === "B" ? qty : -qty;
    }
  }

  const groups = {};
  const groupOrder = [];
  for (const t of rawTrades) {
    const key = `${t.entry_time}|${t.symbol}|${t.direction}`;
    if (!groups[key]) {
      groupOrder.push(key);
      groups[key] = {
        ...t,
        _exits: [{ qty: t.qty, price: t.exit_price, time: t.exit_time, pnl: t.raw_pnl }],
      };
    } else {
      const g = groups[key];
      g._exits.push({ qty: t.qty, price: t.exit_price, time: t.exit_time, pnl: t.raw_pnl });
      g.qty += t.qty;
      g.raw_pnl = Math.round((g.raw_pnl + t.raw_pnl) * 100) / 100;
      g.exit_time = t.exit_time;
      const totalQty = g._exits.reduce((s, e) => s + e.qty, 0);
      g.exit_price = Math.round((g._exits.reduce((s, e) => s + e.price * e.qty, 0) / totalQty) * 100) / 100;
    }
  }

  return {
    trades: groupOrder.map((key) => {
      const { _exits, ...trade } = groups[key];
      return trade;
    }),
    openPosition: position,
  };
}

function getPointValue(symbol) {
  const map = { NQ: 20, MNQ: 2, ES: 50, MES: 5, GC: 100, MGC: 10 };
  return map[symbol] || 2;
}

export function applyPointValues(trades) {
  return trades.map((t) => {
    const pv = getPointValue(t.symbol);
    const corrected = pv !== 2 ? (t.raw_pnl / 2) * pv : t.raw_pnl;
    return { ...t, raw_pnl: Math.round(corrected * 100) / 100 };
  });
}

export function applyCommissions(trades, commissions) {
  return trades.map((t) => {
    const rate = parseFloat(commissions[t.symbol]) || 0;
    const comm = Math.round(t.qty * rate * 2 * 100) / 100;
    const net = Math.round((t.raw_pnl - comm) * 100) / 100;
    return { ...t, commission: comm, net_pnl: net };
  });
}

export function getMissingCommissionSymbols(trades, commissions = {}) {
  return [...new Set(trades.map((t) => t.symbol).filter((s) => !commissions[s]))];
}

export async function loadImportAccount() {
  try {
    const settings = await loadTraderSettings();
    return getImportAccount(settings) || DEFAULT_IMPORT_ACCOUNT;
  } catch {
    return DEFAULT_IMPORT_ACCOUNT;
  }
}

/** @deprecated Use loadImportAccount — sync fallback for legacy callers */
export function getActiveAccount() {
  return DEFAULT_IMPORT_ACCOUNT;
}

export function normalizeTradeTimestamps(trades, sourceTimeZone = "UTC") {
  return trades.map((t) => {
    const entryInstant = parseNaiveInTimezone(t.entry_time, sourceTimeZone);
    const exitInstant = parseNaiveInTimezone(t.exit_time, sourceTimeZone);
    return {
      ...t,
      entry_time: entryInstant ? entryInstant.toISOString() : t.entry_time,
      exit_time: exitInstant ? exitInstant.toISOString() : t.exit_time,
      date: sessionDateFromNaive(t.entry_time, sourceTimeZone),
    };
  });
}

export function processRTraderCSV(text, account = null) {
  const { orders, sourceTimeZone, timeColumnHeader } = parseRTraderCSV(text);
  let { trades, openPosition } = fifoReconstructTrades(orders);
  trades = applyPointValues(trades);
  const acct = account || getActiveAccount();
  trades = applyCommissions(trades, acct?.commissions || {});
  return { trades, openPosition, account: acct, sourceTimeZone, timeColumnHeader };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

export function tradesForDate(trades, dateKey) {
  return trades.filter((t) => (t.date || t.entry_time.substring(0, 10)) === dateKey);
}

/** Build performance fields from reconstructed/imported trades */
export function computePerformanceFromTrades(trades) {
  if (!trades.length) {
    return {
      trades: "",
      wins: "",
      losses: "",
      grossPnl: "",
      bestWinner: "",
      worstLoss: "",
      commissionsFees: "",
      netPnl: 0,
    };
  }

  const wins = trades.filter((t) => t.net_pnl > 0);
  const losses = trades.filter((t) => t.net_pnl < 0);
  const gross = trades.reduce((s, t) => s + t.raw_pnl, 0);
  const comm = trades.reduce((s, t) => s + (t.commission || 0), 0);
  const net = trades.reduce((s, t) => s + t.net_pnl, 0);

  return {
    trades: String(trades.length),
    wins: String(wins.length),
    losses: String(losses.length),
    grossPnl: String(round2(gross)),
    bestWinner: wins.length ? String(round2(Math.max(...wins.map((t) => t.net_pnl)))) : "",
    worstLoss: losses.length ? String(round2(Math.min(...losses.map((t) => t.net_pnl)))) : "",
    commissionsFees: String(round2(comm)),
    netPnl: round2(net),
  };
}

export function computePerformanceFromDbTrades(rows) {
  const trades = rows.map((t) => ({
    raw_pnl: t.gross_pnl || 0,
    net_pnl: t.net_pnl || 0,
    commission: t.commission || 0,
  }));
  return computePerformanceFromTrades(trades);
}

/** DB trades override saved CSV/manual performance when the day was imported. */
export function performanceFromDbOrImport(savedReview, dbTrades) {
  const hadImport = !!(savedReview?.lastImportAt || savedReview?.lastImportFile);
  if (dbTrades?.length) {
    return computePerformanceFromDbTrades(dbTrades);
  }
  if (hadImport) {
    return computePerformanceFromDbTrades([]);
  }
  return null;
}

export async function fetchTradesForDate(dateKey) {
  const userId = await getCurrentUserId();
  const { data, error } = await withUserTradesQuery(
    supabase
      .from("trades")
      .select("gross_pnl, net_pnl, commission, date, setup")
      .eq("date", dateKey),
    userId
  );
  if (error) {
    console.error("fetchTradesForDate:", error);
    return [];
  }
  return data || [];
}

/** One query for many session days — used by home/history list loads. */
export async function fetchTradesGroupedByDate(dateKeys) {
  if (!dateKeys?.length) return new Map();
  const userId = await getCurrentUserId();
  const min = dateKeys.reduce((a, b) => (a < b ? a : b));
  const max = dateKeys.reduce((a, b) => (a > b ? a : b));
  const allowed = new Set(dateKeys);

  const { data, error } = await withUserTradesQuery(
    supabase
      .from("trades")
      .select("gross_pnl, net_pnl, commission, date, setup")
      .gte("date", min)
      .lte("date", max),
    userId
  );
  if (error) {
    console.error("fetchTradesGroupedByDate:", error);
    return new Map();
  }

  const byDate = new Map();
  for (const row of data || []) {
    const day = String(row.date).slice(0, 10);
    if (!allowed.has(day)) continue;
    if (!byDate.has(day)) byDate.set(day, []);
    byDate.get(day).push(row);
  }
  return byDate;
}

/** Server-side import: delete-then-insert for rTrader rows scoped to user. */
export async function executeTradesImport(
  supabaseClient,
  userId,
  trades,
  account,
  accountTypeOverride
) {
  const accountName = account?.name || "Default";
  const acctType = accountTypeOverride || account?.account_type || "eval";

  const rows = trades.map((t) => {
    const entryInstant =
      t.entry_time.includes("T") && (t.entry_time.endsWith("Z") || t.entry_time.includes("+"))
        ? new Date(t.entry_time)
        : parseNaiveInTimezone(t.entry_time, "UTC");
    const exitInstant =
      t.exit_time.includes("T") && (t.exit_time.endsWith("Z") || t.exit_time.includes("+"))
        ? new Date(t.exit_time)
        : parseNaiveInTimezone(t.exit_time, "UTC");
    const entryUTC = entryInstant.toISOString();
    const exitUTC = exitInstant.toISOString();
    return {
      user_id: userId,
      broker_trade_id: `${entryUTC}_${t.symbol}_${t.direction}_${t.qty}`,
      entry_time: entryUTC,
      exit_time: exitUTC,
      date: t.date || sessionDateFromNaive(t.entry_time, "UTC"),
      instrument: t.symbol,
      direction: t.direction === "LONG" ? "long" : "short",
      quantity: t.qty,
      entry_price: t.entry_price,
      exit_price: t.exit_price,
      gross_pnl: t.raw_pnl,
      commission: t.commission,
      net_pnl: t.net_pnl,
      platform: "rTrader",
      account_name: accountName,
      account_type: acctType,
      stop_loss_points: t.stop_loss_points != null ? t.stop_loss_points : null,
      setup: t.setup || null,
      management: t.management || null,
      sequence_id: t.sequence_id || null,
      post_exit_outcome: t.post_exit_outcome || null,
    };
  });

  const dates = [...new Set(rows.map((r) => r.date))];

  for (const date of dates) {
    const { error: delError } = await withUserTradesQuery(
      supabaseClient
        .from("trades")
        .delete()
        .eq("date", date)
        .eq("platform", "rTrader")
        .eq("account_name", accountName),
      userId
    );
    if (delError) throw new Error(delError.message);
  }

  const { error } = await supabaseClient.from("trades").insert(rows);
  if (error) throw new Error(error.message);
  return rows.length;
}

export async function importTradesToSupabase(trades, account, accountTypeOverride) {
  const res = await fetch("/api/trades/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trades, account, accountTypeOverride }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Import failed");
  }
  const data = await res.json();
  return data.count;
}
