import test from "node:test";
import assert from "node:assert/strict";
import { isTradovateCSV, parseTradovateCSV } from "./tradovate-import.js";

const SAMPLE = `symbol,_priceFormat,_priceFormatType,_tickSize,buyFillId,sellFillId,qty,buyPrice,sellPrice,pnl,boughtTimestamp,soldTimestamp,duration
MESM6,-2,0,0.25,14474968024,14474968049,1,7366.75,7366.50,$(1.25),05/07/2026 13:58:54,05/07/2026 13:58:56,1sec`;

test("detects and parses the supplied Tradovate format", () => {
  assert.equal(isTradovateCSV(SAMPLE), true);
  const [trade] = parseTradovateCSV(SAMPLE);
  assert.deepEqual(trade, {
    entry_time: "2026-05-07 13:58:54",
    exit_time: "2026-05-07 13:58:56",
    direction: "LONG",
    symbol: "MES",
    qty: 1,
    entry_price: 7366.75,
    exit_price: 7366.5,
    raw_pnl: -1.25,
    platform: "Tradovate",
    broker_trade_id: "14474968024_14474968049",
  });
});

test("infers a short when the sell fill happens first", () => {
  const shortSample = SAMPLE.replace(
    "7366.75,7366.50,$(1.25),05/07/2026 13:58:54,05/07/2026 13:58:56",
    "7366.50,7366.75,$1.25,05/07/2026 13:58:56,05/07/2026 13:58:54",
  );
  const [trade] = parseTradovateCSV(shortSample);
  assert.equal(trade.direction, "SHORT");
  assert.equal(trade.entry_price, 7366.75);
  assert.equal(trade.exit_price, 7366.5);
});
