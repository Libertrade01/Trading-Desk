import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterTradesForPlaybookAdherence,
  PLAYBOOK_TRACKING_START_KEY,
} from "./analytics-playbook-filter.js";

describe("analytics-playbook-filter", () => {
  it("exports stable app_data key for playbook tracking", () => {
    assert.equal(PLAYBOOK_TRACKING_START_KEY, "analytics-playbook-tracking-start");
  });

  it("filterTradesForPlaybookAdherence keeps trades on or after tracking start", () => {
    const trades = [
      { id: 1, date: "2026-06-01" },
      { id: 2, date: "2026-06-15" },
      { id: 3, date: "2026-06-20" },
    ];
    const filtered = filterTradesForPlaybookAdherence(trades, "2026-06-15");
    assert.deepEqual(filtered.map((t) => t.id), [2, 3]);
  });

  it("filterTradesForPlaybookAdherence returns empty when tracking start missing", () => {
    assert.deepEqual(filterTradesForPlaybookAdherence([{ date: "2026-06-01" }], null), []);
    assert.deepEqual(filterTradesForPlaybookAdherence([{ date: "2026-06-01" }], ""), []);
  });
});
