"""Replace render functions in analytics.html for Phase 1 & 2."""
import re
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / "public" / "analytics.html"
text = PATH.read_text(encoding="utf-8")

def replace_function(src, name, new_body):
    pattern = rf"function {name}\([^)]*\) \{{"
    m = re.search(pattern, src)
    if not m:
        raise SystemExit(f"Function {name} not found")
    start = m.start()
    brace = 0
    i = m.end() - 1
    while i < len(src):
        if src[i] == '{':
            brace += 1
        elif src[i] == '}':
            brace -= 1
            if brace == 0:
                end = i + 1
                break
        i += 1
    else:
        raise SystemExit(f"Could not parse {name}")
    return src[:start] + new_body.strip() + src[end:]

RENDER_STATS = r'''
function renderStats(s, trades) {
  const grid = document.getElementById('stats-grid');
  if (!s) { grid.innerHTML = '<div class="no-data">No trades in selected range</div>'; return; }

  const activeAcct = accounts.find(a => a.active);
  const beThresh = activeAcct ? (activeAcct.be_threshold ?? 30) : 30;
  const winners = trades.filter(t => t.net_pnl > beThresh).length;
  const losers  = trades.filter(t => t.net_pnl < -beThresh).length;
  const bes     = s.beCount;
  const total   = s.total;
  const wPct    = total ? (winners / total * 100).toFixed(0) : 0;
  const lPct    = total ? (losers / total * 100).toFixed(0) : 0;
  const bePct   = total ? (bes / total * 100).toFixed(0) : 0;

  const pfVal = s.profitFactor >= 999 ? '∞' : s.profitFactor.toFixed(2);
  const pfCls = s.profitFactor >= 1.5 ? 'pos' : s.profitFactor >= 1 ? 'neu' : 'neg';

  const hero = [
    { label: 'Net P&L', val: `$${s.totalPnl.toFixed(2)}`, cls: s.totalPnl >= 0 ? 'pos' : 'neg' },
    { label: 'Win Rate', val: `${s.winRate.toFixed(1)}%`, cls: s.winRate >= 50 ? 'pos' : 'neg' },
    { label: 'Expectancy', val: `$${s.expectancy.toFixed(2)}`, cls: s.expectancy >= 0 ? 'pos' : 'neg' },
    { label: 'Profit Factor', val: pfVal, cls: pfCls },
  ].map(h => `<div class="an-stat an-stat--hero"><div class="an-stat__label">${h.label}</div><div class="an-stat__value ${h.cls}">${h.val}</div></div>`).join('');

  const secondary = [
    { label: 'Avg P&L', val: `$${s.avgPnl.toFixed(2)}`, cls: s.avgPnl >= 0 ? 'pos' : 'neg' },
    { label: 'WR w/o BE', val: `${s.winRateNoBE.toFixed(1)}%`, cls: s.winRateNoBE >= 50 ? 'pos' : 'neg' },
    { label: 'Avg Win', val: `$${s.avgWin.toFixed(2)}`, cls: 'pos' },
    { label: 'Avg Loss', val: `$${s.avgLoss.toFixed(2)}`, cls: 'neg' },
    { label: 'Biggest Win', val: `$${s.biggestWin.toFixed(2)}`, cls: 'pos' },
    { label: 'Biggest Loss', val: `$${s.biggestLoss.toFixed(2)}`, cls: 'neg' },
    { label: 'Max Consec DD', val: `$${s.maxDD.toFixed(2)}`, cls: 'neg' },
    { label: 'Avg Hold (min)', val: s.avgHold.toFixed(1), cls: 'neu' },
    { label: 'Total Trades', val: s.total, cls: 'neu' },
    { label: 'Trading Days', val: new Set(trades.map(t => t.date)).size, cls: 'neu' },
    ...(s.rCount > 0 ? [
      { label: 'Avg R', val: fmtR(s.avgR), cls: s.avgR >= 0 ? 'pos' : 'neg' },
      { label: 'Expectancy (R)', val: fmtR(s.expectancyR), cls: s.expectancyR >= 0 ? 'pos' : 'neg' },
    ] : []),
  ].map(c => `<div class="stat-card"><div class="label">${c.label}</div><div class="value ${c.cls}">${c.val}</div></div>`).join('');

  grid.innerHTML = `
    <div style="grid-column:1/-1">
      <div class="an-stats-hero">${hero}</div>
      <div class="an-wlbe">
        <div class="an-wlbe__bar">
          <div class="an-wlbe__seg-win" style="width:${wPct}%"></div>
          <div class="an-wlbe__seg-be" style="width:${bePct}%"></div>
          <div class="an-wlbe__seg-loss" style="width:${lPct}%"></div>
        </div>
        <div class="an-wlbe__legend">
          <div><div class="an-wlbe__item-label">Winners</div><div class="an-wlbe__item-val" style="color:var(--green)">${winners} <span style="font-size:11px;opacity:0.7">${wPct}%</span></div></div>
          <div><div class="an-wlbe__item-label">Breakeven</div><div class="an-wlbe__item-val" style="color:var(--text-dim)">${bes} <span style="font-size:11px;color:var(--muted)">${bePct}%</span></div></div>
          <div><div class="an-wlbe__item-label">Losers</div><div class="an-wlbe__item-val" style="color:var(--red)">${losers} <span style="font-size:11px;opacity:0.7">${lPct}%</span></div></div>
        </div>
      </div>
      <details class="an-stats-more">
        <summary class="an-stats-more__toggle">More metrics</summary>
        <div class="stats-grid an-stats-secondary">${secondary}</div>
      </details>
    </div>`;
}
'''

RENDER_PLAYBOOK = r'''
function renderPlaybookAdherence(trades) {
  var el = document.getElementById('playbook-adherence-section');
  if (!el) return;
  var s = summarizeSetupAdherence(trades);
  if (!s.total) {
    el.innerHTML = '<div class="no-data" style="font-size:11px;line-height:1.6">Import trades and tag every setup to track playbook adherence.</div>';
    return;
  }

  var statusColor = !s.processPass ? 'var(--red)' : (s.purePlaybook ? 'var(--green)' : 'var(--amber)');
  var statusText = !s.processPass
    ? (s.invalid + ' invalid — process failed')
    : (s.purePlaybook ? '100% playbook setups' : s.improvised + ' improvised · process pass');

  var rows = [
    ['Playbook', s.playbook, 'var(--green)'],
    ['Improvised', s.improvised, 'var(--amber)'],
    ['Invalid', s.invalid, 'var(--red)'],
    ['Untagged', s.untagged, 'var(--muted)'],
  ].filter(function(r) { return r[1] > 0; }).map(function(r) {
    return '<div class="an-playbook-row"><span style="font-family:var(--font-mono);font-size:11px;color:var(--text)">' + r[0] + '</span><span class="an-stat__value an-stat__value--sm" style="color:' + r[2] + '">' + r[1] + '</span></div>';
  }).join('');

  el.innerHTML =
    '<div class="an-playbook-hero">' +
      '<div class="an-stat an-stat--hero"><div class="an-stat__value" style="color:' + statusColor + '">' + s.playbookRate + '%</div><div class="an-stat__label">Playbook</div></div>' +
      '<div class="an-playbook-status" style="color:' + statusColor + '">' + statusText + '</div>' +
    '</div>' +
    (rows ? '<details class="an-stats-more"><summary class="an-stats-more__toggle">Breakdown</summary><div class="an-playbook-rows">' + rows + '</div></details>' : '');
}
'''

BUILD_DAILY = r'''
function buildDailyPnlRows(dates, byDate, template, showDelete) {
  return dates.map(d => {
    const { pnl, count, seqIds, soloCount } = byDate[d];
    const seq = (seqIds ? seqIds.size : 0) + (soloCount || 0);
    const pnlCol = pnl > 0 ? 'var(--green)' : pnl < 0 ? 'var(--red)' : 'var(--muted)';
    const pnlStr = (pnl >= 0 ? '+' : '') + '$' + pnl.toFixed(2);
    const dayNames = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
    const dateObj = new Date(d + 'T12:00:00');
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dateLabel = dayNames[dateObj.getDay()] + ' ' + dateObj.getDate() + ' ' + monthNames[dateObj.getMonth()];
    const deleteBtn = showDelete
      ? '<button class="day-delete-btn an-table__cell--right" onclick="event.stopPropagation();openDeleteDayModal(\'' + d + '\')" title="Delete all trades for ' + d + '">Delete</button>'
      : '';
    return '<div class="an-table__row" style="grid-template-columns:' + template + '">' +
      '<span class="an-table__cell">' + dateLabel + '</span>' +
      '<span class="an-table__cell an-table__cell--center">' + count + '</span>' +
      '<span class="an-table__cell an-table__cell--center">' + seq + '</span>' +
      '<span class="an-table__cell an-table__cell--right" style="font-size:11px;font-weight:500;color:' + pnlCol + '">' + pnlStr + '</span>' +
      (showDelete ? deleteBtn : '') +
    '</div>';
  }).join('');
}

function anTableHead(template, headers, aligns) {
  return '<div class="an-table__head" style="grid-template-columns:' + template + '">' +
    headers.map(function(h, i) {
      var align = aligns[i] === 'right' ? ' an-table__cell--right' : aligns[i] === 'center' ? ' an-table__cell--center' : '';
      return '<span class="an-table__th' + align + '">' + h + '</span>';
    }).join('') +
  '</div>';
}
'''

RENDER_DAILY = r'''
function renderDailyCal(trades) {
  const byDate = {};
  trades.forEach(t => {
    if (!byDate[t.date]) byDate[t.date] = { pnl: 0, count: 0, seqIds: new Set(), soloCount: 0 };
    byDate[t.date].pnl += t.net_pnl || 0;
    byDate[t.date].count++;
    if (t.sequence_id != null) byDate[t.date].seqIds.add(t.sequence_id);
    else byDate[t.date].soloCount++;
  });

  const allSorted = Object.keys(byDate).sort().reverse();
  _dailyPnlData = { byDate, allSorted };

  const sorted = allSorted.slice(0, 8);
  const el = document.getElementById('daily-cal');
  if (!sorted.length) { el.innerHTML = '<div class="no-data">No data</div>'; return; }

  const template = '1fr 40px 40px 72px';
  el.innerHTML = '<div class="an-table">' +
    anTableHead(template, ['Date', 'Trd', 'Seq', 'P&L'], ['left', 'center', 'center', 'right']) +
    buildDailyPnlRows(sorted, byDate, template, false) +
  '</div>';
}

function openDailyPnlPanel() {
  document.getElementById('daily-pnl-panel-overlay').classList.add('open');
  document.getElementById('daily-pnl-panel').classList.add('open');

  const body = document.getElementById('daily-pnl-panel-body');
  if (!_dailyPnlData || !_dailyPnlData.allSorted.length) {
    body.innerHTML = '<div class="no-data">No data</div>';
    return;
  }
  const { byDate, allSorted } = _dailyPnlData;
  const template = '1fr 40px 40px 85px 64px';
  body.innerHTML = '<div class="an-table">' +
    anTableHead(template, ['Date', 'Trd', 'Seq', 'P&L', ''], ['left', 'center', 'center', 'right', 'right']) +
    buildDailyPnlRows(allSorted, byDate, template, true) +
  '</div>';
}
'''

RENDER_RECENT = r'''
function renderRecentTrades(trades) {
  var el = document.getElementById('recent-trades-list');
  if (!el) return;
  var recent = trades.slice().sort(function(a,b){ return (b.entry_time||'').localeCompare(a.entry_time||''); }).slice(0, 8);
  if (!recent.length) { el.innerHTML = '<div class="no-data">No trades yet</div>'; return; }

  var template = '90px 1fr 60px 40px 80px';
  var html = '<div class="an-table">' +
    anTableHead(template, ['Time', 'Symbol', 'Dir', 'Qty', 'Net P&L'], ['left', 'left', 'center', 'center', 'right']);

  recent.forEach(function(t) {
    var pnl = t.net_pnl || 0;
    var pnlCol = pnl > 0 ? 'var(--green)' : pnl < 0 ? 'var(--red)' : 'var(--muted)';
    var pnlStr = (pnl >= 0 ? '+' : '') + '$' + pnl.toFixed(2);
    var dirCol = t.direction === 'long' ? 'var(--teal)' : '#c26060';
    var dateStr = toNYTimeStr(t.entry_time).substring(5);
    html += '<div class="an-table__row an-table__row--clickable recent-trade-row" data-id="' + t.id + '" style="grid-template-columns:' + template + '">';
    html += '<span class="an-table__cell">' + dateStr + '</span>';
    html += '<span class="an-table__cell" style="color:#6a7080">' + (t.instrument||'--') + '</span>';
    html += '<span class="an-table__cell an-table__cell--center" style="color:' + dirCol + '">' + (t.direction||'').toUpperCase() + '</span>';
    html += '<span class="an-table__cell an-table__cell--center">' + (t.quantity||'') + '</span>';
    html += '<span class="an-table__cell an-table__cell--right" style="font-weight:500;color:' + pnlCol + '">' + pnlStr + '</span>';
    html += '</div>';
  });
  html += '</div>';
  el.innerHTML = html;

  el.querySelectorAll('.recent-trade-row').forEach(function(row) {
    row.addEventListener('click', function(){ openTradePanelToTrade(this.dataset.id); });
  });
}
'''

RENDER_RECOVERY = r'''
function renderRecovery(trades) {
  const el = document.getElementById('recovery-section');
  if (trades.length < 2) { el.innerHTML = '<div class="no-data">Need more trades</div>'; return; }

  const sorted = [...trades].sort((a,b) => new Date(a.entry_time) - new Date(b.entry_time));
  const byDay = {};
  sorted.forEach(t => {
    if (!byDay[t.date]) byDay[t.date] = [];
    byDay[t.date].push(t);
  });

  const afterLoss = [], afterWin = [];
  Object.values(byDay).forEach(dt => {
    for (let i = 0; i < dt.length - 1; i++) {
      const curr = dt[i].net_pnl || 0;
      const next = dt[i+1].net_pnl || 0;
      if (curr < 0) afterLoss.push(next);
      else if (curr > 0) afterWin.push(next);
    }
  });

  const avgAfterLoss = afterLoss.length ? afterLoss.reduce((s,v)=>s+v,0)/afterLoss.length : null;
  const avgAfterWin  = afterWin.length  ? afterWin.reduce((s,v)=>s+v,0)/afterWin.length   : null;

  function fmt(v) {
    if (v == null) return '—';
    return (v >= 0 ? '+' : '') + '$' + Math.abs(v).toFixed(0);
  }

  el.innerHTML = `
    <div class="an-stat" style="margin-bottom:14px">
      <div class="an-stat__label">After Loss</div>
      <div class="an-stat__value an-stat__value--sm ${avgAfterLoss != null ? (avgAfterLoss >= 0 ? 'pos' : 'neg') : 'neutral'}">${fmt(avgAfterLoss)}</div>
      <div class="an-stat__sub">${afterLoss.length} instances</div>
    </div>
    <div style="height:1px;background:var(--border);margin:14px 0"></div>
    <div class="an-stat">
      <div class="an-stat__label">After Win</div>
      <div class="an-stat__value an-stat__value--sm ${avgAfterWin != null ? (avgAfterWin >= 0 ? 'pos' : 'neg') : 'neutral'}">${fmt(avgAfterWin)}</div>
      <div class="an-stat__sub">${afterWin.length} instances</div>
    </div>
    ${avgAfterLoss != null && avgAfterLoss < -20
      ? '<p class="an-stat__sub" style="margin-top:14px;line-height:1.6">Revenge trading tendency detected.</p>'
      : avgAfterLoss != null && avgAfterLoss > 0
      ? '<p class="an-stat__sub" style="margin-top:14px;line-height:1.6;color:var(--green)">Positive recovery pattern.</p>'
      : ''}`;
}
'''

text = replace_function(text, 'renderStats', RENDER_STATS)
text = replace_function(text, 'renderPlaybookAdherence', RENDER_PLAYBOOK)
text = replace_function(text, 'renderRecovery', RENDER_RECOVERY)
text = replace_function(text, 'renderRecentTrades', RENDER_RECENT)

# buildDailyPnlRows through openDailyPnlPanel - replace as block
start_marker = "function buildDailyPnlRows"
end_marker = "function closeDailyPnlPanel()"
start = text.find(start_marker)
end = text.find(end_marker)
if start < 0 or end < 0:
    raise SystemExit("daily pnl block not found")
text = text[:start] + BUILD_DAILY.strip() + "\n\n" + RENDER_DAILY.strip() + "\n\n" + text[end:]

# renderDailyCal call - remove days arg
text = text.replace("['renderDailyCal',     () => renderDailyCal(trades, days)],", "['renderDailyCal',     () => renderDailyCal(trades)],")

# Remove byGate if present
text = re.sub(r"\nfunction byGate\(trades\) \{.*?\n\}\n", "\n", text, count=1, flags=re.S)

PATH.write_text(text, encoding="utf-8")
print("Function replacements OK")
