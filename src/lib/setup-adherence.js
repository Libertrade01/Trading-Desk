import { VALID_SETUPS, SETUP_IMPROVISED, SETUP_INVALID } from "./setup-options";

const SETUP_SHORT = {
  "Peak and Fail (PAF)": "PAF",
  "Break and Retest (BAR)": "BAR",
  "LVN continuation": "LVN",
  "VWAP in trend": "VWAP",
  [SETUP_IMPROVISED]: "Improvised",
  [SETUP_INVALID]: "Invalid",
  Untagged: "Untagged",
};

export function setupTagColor(setupName) {
  if (VALID_SETUPS.includes(setupName)) return "var(--green)";
  if (setupName === SETUP_IMPROVISED) return "var(--amber)";
  if (setupName === SETUP_INVALID) return "var(--red)";
  return "var(--muted)";
}

/** Per-setup trade counts for playbook breakdown (playbook-scoped trades only). */
export function summarizeSetupByTag(trades) {
  const counts = {};
  for (const t of trades || []) {
    const raw = t.setup != null ? String(t.setup).trim() : "";
    const key = raw || "Untagged";
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      label: SETUP_SHORT[name] || name,
      count,
      color: setupTagColor(name === "Untagged" ? "" : name),
    }));
}

export function countUntaggedTrades(trades) {
  return (trades || []).filter((t) => !t.setup || !String(t.setup).trim()).length;
}

export const SETUP_CATEGORY = {
  PLAYBOOK: "playbook",
  IMPROVISED: "improvised",
  INVALID: "invalid",
  UNTAGGED: "untagged",
};

/** Unknown / legacy tags count as invalid — fresh playbook-only tracking from here. */
export function categorizeSetup(value) {
  if (value == null || String(value).trim() === "") return SETUP_CATEGORY.UNTAGGED;
  if (VALID_SETUPS.includes(value)) return SETUP_CATEGORY.PLAYBOOK;
  if (value === SETUP_IMPROVISED) return SETUP_CATEGORY.IMPROVISED;
  if (value === SETUP_INVALID) return SETUP_CATEGORY.INVALID;
  return SETUP_CATEGORY.INVALID;
}

export function summarizeSetupAdherence(trades) {
  const summary = {
    total: 0,
    playbook: 0,
    improvised: 0,
    invalid: 0,
    untagged: 0,
    playbookRate: null,
    /** No invalid or untagged trades (improvised allowed). */
    processPass: false,
    /** Every trade is a playbook setup. */
    purePlaybook: false,
  };

  if (!trades?.length) return summary;

  for (const t of trades) {
    const cat = categorizeSetup(t.setup);
    summary.total += 1;
    summary[cat] += 1;
  }

  summary.playbookRate = Math.round((summary.playbook / summary.total) * 100);
  summary.processPass = summary.invalid === 0 && summary.untagged === 0;
  summary.purePlaybook =
    summary.processPass && summary.improvised === 0 && summary.playbook === summary.total;

  return summary;
}

export function validateImportSetupTags(trades) {
  const summary = summarizeSetupAdherence(trades);
  if (summary.untagged > 0) {
    return {
      ok: false,
      summary,
      message: `${summary.untagged} trade${summary.untagged === 1 ? "" : "s"} still need a setup tag. Tag every trade — use Improvised or Invalid if it was not a playbook setup.`,
    };
  }
  return { ok: true, summary };
}

export function formatPlaybookBreakdown(summary) {
  if (!summary?.total) return "";
  const parts = [];
  if (summary.playbook) parts.push(`${summary.playbook} playbook`);
  if (summary.improvised) parts.push(`${summary.improvised} improvised`);
  if (summary.invalid) parts.push(`${summary.invalid} invalid`);
  if (summary.untagged) parts.push(`${summary.untagged} untagged`);
  return parts.join(" · ");
}

export function playbookAdherenceLabel(summary) {
  if (!summary?.total) return null;
  if (summary.untagged > 0) return { tone: "red", text: "Untagged trades — tag before importing" };
  if (summary.invalid > 0) {
    return {
      tone: "red",
      text: `${summary.invalid} invalid — process adherence failed`,
    };
  }
  if (summary.improvised > 0) {
    return {
      tone: "amber",
      text: `${summary.playbook}/${summary.total} playbook · ${summary.improvised} improvised`,
    };
  }
  return {
    tone: "green",
    text: `${summary.playbook}/${summary.total} playbook · 100%`,
  };
}
