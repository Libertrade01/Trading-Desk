const MAX_MANUAL_TRADES = 100;

function finiteNumber(value) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function requiredPositive(value, label, index) {
  const number = finiteNumber(value);
  if (number == null || number <= 0) {
    throw new Error(`Trade ${index + 1}: ${label} must be greater than zero.`);
  }
  return number;
}

function requiredMoney(value, label, index) {
  const number = finiteNumber(value);
  if (number == null) {
    throw new Error(`Trade ${index + 1}: enter ${label}.`);
  }
  return number;
}

function cleanText(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export function createManualTrade(overrides = {}) {
  return {
    clientId: overrides.clientId || crypto.randomUUID(),
    instrument: "",
    direction: "long",
    quantity: "1",
    entryTime: "",
    exitTime: "",
    entryPrice: "",
    stopPrice: "",
    exitPrice: "",
    grossPnl: "",
    commission: "0",
    setup: "",
    ...overrides,
  };
}

export function validateManualTrades(trades) {
  if (!Array.isArray(trades) || trades.length === 0) {
    throw new Error("Add at least one trade before saving.");
  }
  if (trades.length > MAX_MANUAL_TRADES) {
    throw new Error(`A maximum of ${MAX_MANUAL_TRADES} manual trades can be saved at once.`);
  }

  return trades.map((trade, index) => {
    const instrument = cleanText(trade.instrument, 24).toUpperCase();
    if (!instrument) throw new Error(`Trade ${index + 1}: enter an instrument.`);

    const direction = String(trade.direction).toLowerCase();
    if (!['long', 'short'].includes(direction)) {
      throw new Error(`Trade ${index + 1}: choose long or short.`);
    }

    const entryTime = new Date(trade.entryTime);
    const exitTime = new Date(trade.exitTime);
    if (Number.isNaN(entryTime.getTime())) {
      throw new Error(`Trade ${index + 1}: enter a valid entry time.`);
    }
    if (Number.isNaN(exitTime.getTime())) {
      throw new Error(`Trade ${index + 1}: enter a valid exit time.`);
    }
    if (exitTime < entryTime) {
      throw new Error(`Trade ${index + 1}: exit time cannot be before entry time.`);
    }

    const entryPrice = requiredPositive(trade.entryPrice, "entry price", index);
    const stopPrice = requiredPositive(trade.stopPrice, "initial stop price", index);
    const exitPrice = requiredPositive(trade.exitPrice, "exit price", index);
    if (direction === "long" && stopPrice >= entryPrice) {
      throw new Error(`Trade ${index + 1}: a long trade's initial stop must be below entry.`);
    }
    if (direction === "short" && stopPrice <= entryPrice) {
      throw new Error(`Trade ${index + 1}: a short trade's initial stop must be above entry.`);
    }
    const quantity = requiredPositive(trade.quantity, "quantity", index);
    const grossPnl = requiredMoney(trade.grossPnl, "gross P&L", index);
    const commission = finiteNumber(trade.commission ?? 0);
    if (commission == null || commission < 0) {
      throw new Error(`Trade ${index + 1}: commission cannot be negative.`);
    }
    const setup = cleanText(trade.setup, 100);
    if (!setup) {
      throw new Error(`Trade ${index + 1}: choose a setup, Improvised, or Invalid.`);
    }

    return {
      clientId: cleanText(trade.clientId, 80) || `trade-${index + 1}`,
      instrument,
      direction,
      quantity,
      entryTime: entryTime.toISOString(),
      exitTime: exitTime.toISOString(),
      entryPrice,
      stopPrice,
      exitPrice,
      stopLossPoints: Math.abs(entryPrice - stopPrice),
      grossPnl,
      commission,
      netPnl: Math.round((grossPnl - commission) * 100) / 100,
      setup,
    };
  });
}

export function manualTradeFromDb(row) {
  const direction = row.direction === "short" ? "short" : "long";
  const entryPrice = Number(row.entry_price);
  const stopDistance = Number(row.stop_loss_points);
  const stopPrice = Number.isFinite(entryPrice) && Number.isFinite(stopDistance)
    ? direction === "long"
      ? entryPrice - stopDistance
      : entryPrice + stopDistance
    : "";
  const clientId = String(row.broker_trade_id || "").replace(/^manual:/, "") || row.id;

  return createManualTrade({
    clientId,
    instrument: row.instrument || "",
    direction,
    quantity: row.quantity ?? "1",
    entryTime: row.entry_time || "",
    exitTime: row.exit_time || "",
    entryPrice: row.entry_price ?? "",
    stopPrice,
    exitPrice: row.exit_price ?? "",
    grossPnl: row.gross_pnl ?? "",
    commission: row.commission ?? "0",
    setup: row.setup || "",
  });
}
