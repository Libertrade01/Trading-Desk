import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  createAdminClient,
  findUserByEmail,
  readArg,
  selectByUser,
  selectForTradeIds,
} from "./user-data-admin.mjs";

const email = readArg("email");
const output = readArg("out");
if (!email || !output) {
  throw new Error("Usage: node --env-file=.env.local scripts/export-user-data.mjs --email user@example.com --out C:\\secure\\export.json");
}

const admin = createAdminClient();
const user = await findUserByEmail(admin, email);
const [appData, trades, tradingDays, legalAcceptances] = await Promise.all([
  selectByUser(admin, "app_data", user.id),
  selectByUser(admin, "trades", user.id),
  selectByUser(admin, "trading_days", user.id),
  selectByUser(admin, "legal_acceptances", user.id).catch((error) => {
    if (error.message.includes("Could not find the table")) return [];
    throw error;
  }),
]);
const tradeIds = trades.map((trade) => trade.id);
const [tradeNotes, tradeTagLinks] = await Promise.all([
  selectForTradeIds(admin, "trade_notes", tradeIds),
  selectForTradeIds(admin, "trade_tag_links", tradeIds),
]);

const exportData = {
  generatedAt: new Date().toISOString(),
  account: {
    id: user.id,
    email: user.email,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    lastSignInAt: user.last_sign_in_at,
    metadata: user.user_metadata,
  },
  appData,
  trades,
  tradingDays,
  tradeNotes,
  tradeTagLinks,
  legalAcceptances,
};

const outputPath = resolve(output);
await writeFile(outputPath, `${JSON.stringify(exportData, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
console.log(`Export written to ${outputPath}`);
