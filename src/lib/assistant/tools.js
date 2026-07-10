import { tool } from "ai";
import { z } from "zod";
import {
  KEY_PREFIXES,
  listSessionDatesForUser,
  loadAppDataForDate,
  loadTradesForUser,
} from "./data";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format.");

export function createAssistantTools(supabase, userId) {
  return {
    getTrades: tool({
      description:
        "Fetch the user's imported broker trades. Use for P&L, instruments, setups, and trade history questions.",
      inputSchema: z.object({
        from: dateSchema.optional().describe("Start date (inclusive), YYYY-MM-DD."),
        to: dateSchema.optional().describe("End date (inclusive), YYYY-MM-DD."),
        limit: z.number().int().min(1).max(200).optional().describe("Max trades to return."),
      }),
      execute: async ({ from, to, limit }) => {
        const trades = await loadTradesForUser(supabase, userId, { from, to, limit });
        return { count: trades.length, trades };
      },
    }),

    getReadiness: tool({
      description:
        "Fetch pre-market readiness / check-in data for a session date (scores, stand-down flags, dimension breakdown).",
      inputSchema: z.object({
        date: dateSchema.describe("Session date, YYYY-MM-DD."),
      }),
      execute: async ({ date }) => {
        const data = await loadAppDataForDate(
          supabase,
          userId,
          KEY_PREFIXES.readiness,
          date
        );
        return { date, readiness: data };
      },
    }),

    getPlan: tool({
      description: "Fetch the daily session plan for a date (bias, levels, commitments, focus).",
      inputSchema: z.object({
        date: dateSchema.describe("Session date, YYYY-MM-DD."),
      }),
      execute: async ({ date }) => {
        const data = await loadAppDataForDate(supabase, userId, KEY_PREFIXES.plan, date);
        return { date, plan: data };
      },
    }),

    getJournal: tool({
      description:
        "Fetch post-market journal / close-the-loop review for a date (reflections, behavioral flags, checklist).",
      inputSchema: z.object({
        date: dateSchema.describe("Session date, YYYY-MM-DD."),
      }),
      execute: async ({ date }) => {
        const data = await loadAppDataForDate(
          supabase,
          userId,
          KEY_PREFIXES.journal,
          date
        );
        return { date, journal: data };
      },
    }),

    listSessionDates: tool({
      description:
        "List session dates that have readiness, plan, or journal data in a date range.",
      inputSchema: z.object({
        from: dateSchema.optional().describe("Start date (inclusive), YYYY-MM-DD."),
        to: dateSchema.optional().describe("End date (inclusive), YYYY-MM-DD."),
      }),
      execute: async ({ from, to }) => {
        const dates = await listSessionDatesForUser(supabase, userId, { from, to });
        return { count: dates.length, dates };
      },
    }),
  };
}

export const ASSISTANT_SYSTEM_PROMPT = `You are the Libertrade Loop AI Assistant — a trading performance coach with read-only access to this user's own Libertrade data.

Use the provided tools to fetch trades, readiness check-ins, session plans, and post-market journals before answering. Never invent trade or journal data.

Guidelines:
- Answer clearly and concisely in plain language.
- When discussing readiness, reference scores, stand-down decisions, and dimension breakdowns when available.
- When discussing performance, ground answers in actual trades and journal reflections.
- If data is missing for a date, say so and suggest nearby dates via listSessionDates.
- Do not give generic financial advice; focus on the user's logged process, behavior, and performance patterns.
- Dates are US session keys in YYYY-MM-DD format.`;
