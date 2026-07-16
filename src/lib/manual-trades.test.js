import test from "node:test";
import assert from "node:assert/strict";
import { manualTradeFromDb, validateManualTrades } from "./manual-trades.js";

const validTrade = {
  clientId: "one",
  instrument: "nq",
  direction: "long",
  quantity: "2",
  entryTime: "2026-07-15T14:00:00.000Z",
  exitTime: "2026-07-15T14:20:00.000Z",
  entryPrice: "22000",
  stopPrice: "21990",
  exitPrice: "22020",
  grossPnl: "80",
  commission: "4",
  setup: "VWAP",
};

test("validates and derives a full manual trade", () => {
  const [trade] = validateManualTrades([validTrade]);
  assert.equal(trade.instrument, "NQ");
  assert.equal(trade.quantity, 2);
  assert.equal(trade.stopLossPoints, 10);
  assert.equal(trade.netPnl, 76);
});
test("requires a playbook classification", () => {
  assert.throws(
    () => validateManualTrades([{ ...validTrade, setup: "" }]),
    /choose a setup/i,
  );
});

test("rejects a stop on the wrong side of entry", () => {
  assert.throws(
    () => validateManualTrades([{ ...validTrade, stopPrice: "22010" }]),
    /below entry/i,
  );
  assert.throws(
    () => validateManualTrades([{ ...validTrade, direction: "short", stopPrice: "21990" }]),
    /above entry/i,
  );
});

test("reconstructs the initial stop price from stored stop distance", () => {
  const trade = manualTradeFromDb({
    id: "row",
    broker_trade_id: "manual:abc",
    direction: "short",
    entry_price: 100,
    stop_loss_points: 3,
    exit_price: 94,
    quantity: 1,
    gross_pnl: 6,
    commission: 1,
  });
  assert.equal(trade.clientId, "abc");
  assert.equal(trade.stopPrice, 103);
});
