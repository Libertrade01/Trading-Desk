import test from "node:test";
import assert from "node:assert/strict";
import { calcSessionSummaryStats } from "./session-summary-stats.js";

test("aggregates close-loop-only performance without inventing trade detail", () => {
  const stats = calcSessionSummaryStats([
    { trades: "3", wins: "2", losses: "1", grossPnl: "120", commissionsFees: "6", bestWinner: "90", worstLoss: "-30" },
    { trades: "2", wins: "1", losses: "1", netPnl: "-20", bestWinner: "25", worstLoss: "-45" },
  ]);
  assert.equal(stats.sessions, 2);
  assert.equal(stats.totalTrades, 5);
  assert.equal(stats.winners, 3);
  assert.equal(stats.totalPnl, 94);
  assert.equal(stats.winRate, 60);
  assert.equal(stats.largestWinner, 90);
  assert.equal(stats.largestLoss, -45);
});
test("returns null when no usable summary data exists", () => {
  assert.equal(calcSessionSummaryStats([{ noTradeToday: true }]), null);
});
