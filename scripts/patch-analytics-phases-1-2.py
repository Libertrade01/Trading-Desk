"""Apply Phase 1 & 2 analytics dashboard cleanup to public/analytics.html."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "public" / "analytics.html"
text = PATH.read_text(encoding="utf-8")

CSS_INSERT = """
  /* ── Analytics stat system (Phase 1) ── */
  .an-stat { display: flex; flex-direction: column; align-items: flex-start; }
  .an-stat__label {
    font-family: var(--font-poster);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 6px;
  }
  .an-stat__value {
    font-family: 'Syne', var(--font-display);
    font-size: clamp(28px, 4vw, 36px);
    font-weight: 800;
    letter-spacing: -0.04em;
    line-height: 1;
    color: var(--text);
  }
  .an-stat__value--sm {
    font-size: clamp(22px, 3vw, 28px);
    font-weight: 700;
  }
  .an-stat__value.pos, .an-stat__value.positive { color: var(--green); }
  .an-stat__value.neg, .an-stat__value.negative { color: var(--red); }
  .an-stat__value.neu, .an-stat__value.neutral { color: var(--text); }
  .an-stat__sub {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--muted);
    margin-top: 4px;
  }
  .an-stats-hero {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 28px 36px;
    margin-bottom: 18px;
    padding-bottom: 18px;
    border-bottom: 1px solid var(--border);
  }
  .an-wlbe { margin-bottom: 16px; }
  .an-wlbe__bar {
    display: flex;
    height: 6px;
    border-radius: 3px;
    overflow: hidden;
    gap: 2px;
    margin-bottom: 12px;
  }
  .an-wlbe__seg-win { background: var(--green); border-radius: 3px 0 0 3px; transition: width 0.6s; }
  .an-wlbe__seg-be { background: var(--muted); }
  .an-wlbe__seg-loss { background: var(--red); border-radius: 0 3px 3px 0; transition: width 0.6s; }
  .an-wlbe__legend {
    display: flex;
    flex-wrap: wrap;
    gap: 16px 24px;
  }
  .an-wlbe__item-label {
    font-family: var(--font-mono);
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
    margin-bottom: 2px;
  }
  .an-wlbe__item-val {
    font-family: var(--font-num);
    font-size: 20px;
    font-weight: 300;
    line-height: 1;
  }
  .an-stats-more { margin-top: 4px; }
  .an-stats-more__toggle {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
    cursor: pointer;
    list-style: none;
    padding: 8px 0;
  }
  .an-stats-more__toggle::-webkit-details-marker { display: none; }
  .an-stats-more[open] .an-stats-more__toggle { color: var(--text); }
  .an-stats-secondary {
    margin-top: 12px;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  }
  .an-playbook-hero {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 12px;
  }
  .an-playbook-status {
    font-family: var(--font-mono);
    font-size: 11px;
    line-height: 1.5;
    text-align: right;
    max-width: 280px;
  }
  .an-playbook-rows { margin-top: 8px; }
  .an-playbook-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px solid var(--border);
  }
  .an-playbook-row:last-child { border-bottom: none; }
  .an-session-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  @media (max-width: 900px) {
    .an-session-grid { grid-template-columns: 1fr; }
  }
  .an-session-card { padding: 16px 18px; }
  .an-subsection-title { margin-bottom: 12px; }
  .an-chart-legend {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 10px;
  }
  .an-chart-legend-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-family: var(--font-mono);
    font-size: 9px;
    color: var(--muted);
  }
  /* ── Analytics tables (Phase 2) ── */
  .an-table { width: 100%; }
  .an-table__head,
  .an-table__row {
    display: grid;
    gap: 8px;
    align-items: center;
    padding: 7px 6px;
  }
  .an-table__head {
    padding: 0 6px 8px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 4px;
  }
  .an-table__row {
    border-bottom: 1px solid var(--border);
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--muted);
  }
  .an-table__row--clickable { cursor: pointer; transition: background 0.12s; }
  .an-table__row--clickable:hover { background: var(--surface2); }
  .an-table__cell { min-width: 0; }
  .an-table__cell--right { text-align: right; }
  .an-table__cell--center { text-align: center; }
  .an-table__th {
    font-family: var(--font-mono);
    font-size: 8px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .analytics-desk-notice--compact { padding: 10px 14px; margin-bottom: 0; }
  .analytics-desk-notice__dismiss {
    background: none;
    border: none;
    color: var(--muted);
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    padding: 0 4px;
  }
  .analytics-desk-notice__dismiss:hover { color: var(--text); }
"""

anchor_css = "  .stat-card .sub {\n    font-family: var(--font-mono);\n    font-size: 10px;\n    color: var(--muted);\n    margin-top: 4px;\n  }\n"
if anchor_css not in text:
    raise SystemExit("CSS anchor not found")
text = text.replace(anchor_css, anchor_css + CSS_INSERT, 1)

text = text.replace(
    "  .stat-card:hover {\n    transform: translateY(-2px);\n    box-shadow: 0 8px 24px rgba(0,0,0,0.3);\n    border-color: var(--border2);\n  }\n",
    "  .stat-card--clickable { cursor: pointer; transition: background 0.12s, border-color 0.12s; }\n  .stat-card--clickable:hover { background: var(--dim); border-color: var(--border2); }\n",
    1,
)

# Session analytics block in render()
old_session = """  // ── Section: Session Analytics (merged)
  html.push(`<div class="card">
  <div class="card-title">Session Analytics</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="font-family:var(--font-mono);font-size:9px;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted)">Performance by Time · NY</div>
        <div style="display:flex;align-items:center;gap:12px">
          <div style="display:flex;align-items:center;gap:5px;font-family:var(--font-mono);font-size:9px;color:var(--muted)">
            <div style="width:10px;height:8px;border-radius:1px;background:rgba(37,145,134,0.35);border-top:1px solid rgba(37,145,134,0.7)"></div>P&L
          </div>
          <div style="display:flex;align-items:center;gap:5px;font-family:var(--font-mono);font-size:9px;color:var(--muted)">
            <svg width="18" height="10"><line x1="0" y1="5" x2="18" y2="5" stroke="rgba(180,185,200,0.25)" stroke-width="1" stroke-dasharray="3,4"/><circle cx="9" cy="5" r="3.5" fill="rgba(37,145,134,0.9)" stroke="#12131a" stroke-width="1.5"/></svg>WR
          </div>
        </div>
      </div>
      <div class="chart-wrap" style="height:160px">
        <canvas id="chart-baskets"></canvas>
      </div>
    </div>
    <div>
      <div style="font-family:var(--font-mono);font-size:9px;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Performance by Day</div>
      <div class="chart-wrap" style="height:160px">
        <canvas id="chart-dow"></canvas>
      </div>
    </div>
  </div>
  <div style="height:1px;background:var(--border);margin-bottom:20px"></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
    <div>
      <div style="font-family:var(--font-mono);font-size:9px;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">P&L by Trade # in Session</div>
      <div class="chart-wrap" style="height:160px">
        <canvas id="chart-seq"></canvas>
      </div>
    </div>
    <div>
      <div style="font-family:var(--font-mono);font-size:9px;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Post-Loss Recovery</div>
      <div id="recovery-section"></div>
    </div>
  </div>
</div>`);"""

new_session = """  // ── Section: Session Analytics (2×2 cards)
  html.push(`<div class="an-session-grid">
    <div class="card an-session-card">
      <div class="card-title an-subsection-title">Performance by Time · NY</div>
      <div class="an-chart-legend">
        <div class="an-chart-legend-item"><div style="width:10px;height:8px;border-radius:1px;background:rgba(37,145,134,0.35);border-top:1px solid rgba(37,145,134,0.7)"></div>P&L</div>
        <div class="an-chart-legend-item"><svg width="18" height="10"><line x1="0" y1="5" x2="18" y2="5" stroke="rgba(180,185,200,0.25)" stroke-width="1" stroke-dasharray="3,4"/><circle cx="9" cy="5" r="3.5" fill="rgba(37,145,134,0.9)" stroke="#12131a" stroke-width="1.5"/></svg>WR</div>
      </div>
      <div class="chart-wrap" style="height:160px"><canvas id="chart-baskets"></canvas></div>
    </div>
    <div class="card an-session-card">
      <div class="card-title an-subsection-title">Performance by Day</div>
      <div class="chart-wrap" style="height:160px"><canvas id="chart-dow"></canvas></div>
    </div>
    <div class="card an-session-card">
      <div class="card-title an-subsection-title">P&L by Trade # in Session</div>
      <div class="chart-wrap" style="height:160px"><canvas id="chart-seq"></canvas></div>
    </div>
    <div class="card an-session-card">
      <div class="card-title an-subsection-title">Post-Loss Recovery</div>
      <div id="recovery-section"></div>
    </div>
  </div>`);"""

if old_session not in text:
    raise SystemExit("Session block not found")
text = text.replace(old_session, new_session, 1)

old_notice = """  html.push(`<div class="analytics-desk-notice">
    <span class="hybrid-eyebrow">Workflow</span>
    <p>Import trades in <a class="inline-link" href="/postmarket" onclick="return navigateToDesk('/postmarket')">Post-Market review</a> — tag every setup there. Analytics reads your trade history; accounts &amp; commissions live in <a class="inline-link" href="/settings" onclick="return navigateToDesk('/settings')">Settings</a>.</p>
    <a class="desk-nav-link" href="/postmarket" onclick="return navigateToDesk('/postmarket')">Go to Post-Market</a>
  </div>`);"""

new_notice = """  if (!localStorage.getItem('analytics-workflow-notice-dismissed')) {
    html.push(`<div class="analytics-desk-notice analytics-desk-notice--compact" id="analytics-workflow-notice">
      <span class="hybrid-eyebrow">Workflow</span>
      <p>Import in <a class="inline-link" href="/postmarket" onclick="return navigateToDesk('/postmarket')">Post-Market</a> · tag every setup · accounts in <a class="inline-link" href="/settings" onclick="return navigateToDesk('/settings')">Settings</a>.</p>
      <button type="button" class="analytics-desk-notice__dismiss" onclick="dismissWorkflowNotice()" title="Dismiss">✕</button>
    </div>`);
  }"""

if old_notice not in text:
    raise SystemExit("Notice block not found")
text = text.replace(old_notice, new_notice, 1)

# Insert dismissWorkflowNotice before render()
dismiss_fn = """
function dismissWorkflowNotice() {
  localStorage.setItem('analytics-workflow-notice-dismissed', '1');
  const el = document.getElementById('analytics-workflow-notice');
  if (el) el.remove();
}

"""
text = text.replace("function render() {", dismiss_fn + "function render() {", 1)

PATH.write_text(text, encoding="utf-8")
print("Patched layout blocks OK — run function replacements separately")
