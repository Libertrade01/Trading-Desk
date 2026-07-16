import {
  accountCommissionsEnabled,
  applyCommissions,
  getActiveAccount,
  processRTraderCSV,
} from "./rtrader-import";
import { isTradovateCSV, parseTradovateCSV } from "./tradovate-import";

export function processBrokerCSV(text, account = null, broker = "rtrader") {
  const tradovateFile = isTradovateCSV(text);
  if (broker === "tradovate" && !tradovateFile) {
    throw new Error("This does not look like a Tradovate trade export. Choose R Trader or upload the Tradovate CSV again.");
  }
  if (broker === "rtrader" && tradovateFile) {
    throw new Error("This is a Tradovate CSV. Choose Tradovate from the broker dropdown, then upload it again.");
  }
  if (broker === "tradovate") {
    const acct = account || getActiveAccount();
    const trades = applyCommissions(
      parseTradovateCSV(text),
      acct?.commissions || {},
      accountCommissionsEnabled(acct),
    );
    return {
      trades,
      openPosition: 0,
      account: acct,
      sourceTimeZone: "America/Chicago",
      timeColumnHeader: "Tradovate export time",
      brokerName: "Tradovate",
    };
  }
  return { ...processRTraderCSV(text, account), brokerName: "R Trader" };
}
