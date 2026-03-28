import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

// ── Trader profile context prepended to every agent prompt ──────────────────
const TRADER_PROFILE = `TRADER PROFILE (read this before analysing any data):
- You are writing directly TO the trader, not about them. Use second person throughout: "you", "your", "you're" — never "Mike" or "he/his".
- Mike is a full-time futures trader working toward financial independence
- Asymmetric risk style: takes multiple entries on the same trade idea (sequence trades) — this is intentional strategy, not impulsive overtrading
- Scratch/BE defined as ±0.3R — these are positioning attempts, excluded from win/loss rate calculations
- Win rate is always calculated excluding scratches
- R-factor formula: net_pnl / (stop_loss_points × point_value × quantity)
- Point values per contract: NQ=20, MNQ=2, ES=50, MES=5, GC=10, MGC=1
- Sequences are manually tagged at import via sequence_id — all trades in one sequence = one trade idea
- Multiple entries within a sequence are strategic repositioning, not overtrading — do not misread them as impulsivity
- HIGH ATTEMPT COUNT (4+ trades in one sequence) warrants specific attention — may indicate forcing a setup that was not there
- Risk Manager is the hard daily loss limit — a non-negotiable psychological and financial stop. Always call it "Risk Manager" or "Risk Manager limit", never "DLL". Being near or hitting it is a critical data point.
- The 1.5R target is the minimum for avg win R — below this suggests winners are not being held to their intended target`;

// ── Point values for R calculation ──────────────────────────────────────────
const POINT_VALUES: Record<string, number> = {
  NQ: 20, MNQ: 2, ES: 50, MES: 5, GC: 10, MGC: 1,
};

function calcR(trade: Record<string, unknown>): number | null {
  const pnl = trade.net_pnl as number | null;
  const slp = trade.stop_loss_points as number | null;
  const qty = trade.quantity as number | null;
  const inst = ((trade.instrument as string) || '').toUpperCase();
  const pv = POINT_VALUES[inst] ?? null;
  if (!pnl || !slp || !qty || !pv) return null;
  return pnl / (slp * pv * qty);
}

// ── Week date helpers ────────────────────────────────────────────────────────
function lastFriday(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const daysBack = day === 0 ? 2 : day >= 5 ? day - 5 : day + 2;
  const fri = new Date(now);
  fri.setUTCDate(now.getUTCDate() - daysBack);
  return fri.toISOString().split('T')[0];
}

function weekStart(weekEndingDate: string): string {
  const end = new Date(weekEndingDate + 'T12:00:00Z');
  end.setUTCDate(end.getUTCDate() - 4);
  return end.toISOString().split('T')[0];
}

// ── Claude API call ──────────────────────────────────────────────────────────
async function callClaude(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens = 2000,
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (!data.content?.[0]?.text) throw new Error('Unexpected Claude response: ' + JSON.stringify(data));
  return data.content[0].text as string;
}

// ── Format agent memory for prompts ─────────────────────────────────────────
function formatMemory(mem: Record<string, unknown>[] | null): string {
  if (!mem || mem.length === 0) return 'No prior weeks on record yet.';
  return mem
    .map((m) => `Week ending ${m.week_ending}:\n${m.summary}`)
    .join('\n\n---\n\n');
}

// ── Main handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS });

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Determine week_ending
  let weekEnding: string;
  try {
    const body = await req.json();
    weekEnding = body.week_ending || lastFriday();
  } catch {
    weekEnding = lastFriday();
  }
  const start = weekStart(weekEnding);

  // ── Fetch all data in parallel ─────────────────────────────────────────────
  const [
    { data: trades },
    { data: tradingDays },
    { data: journal },
    { data: ruleNotes },
    { data: agent1Mem },
    { data: agent2Mem },
    { data: managerMem },
  ] = await Promise.all([
    supabase.from('trades').select('*').gte('date', start).lte('date', weekEnding).order('entry_time'),
    supabase.from('trading_days').select('*').gte('date', start).lte('date', weekEnding).order('date'),
    supabase.from('intraday_journal').select('*').gte('trading_day', start).lte('trading_day', weekEnding).order('et_time'),
    supabase.from('rule_compliance').select('date, rule, result, notes').gte('date', start).lte('date', weekEnding).not('notes', 'is', null),
    supabase.from('agent_memory').select('week_ending, summary').eq('agent_name', 'agent1').order('week_ending', { ascending: false }).limit(8),
    supabase.from('agent_memory').select('week_ending, summary').eq('agent_name', 'agent2').order('week_ending', { ascending: false }).limit(8),
    supabase.from('agent_memory').select('week_ending, summary, key_findings').eq('agent_name', 'manager').order('week_ending', { ascending: false }).limit(4),
  ]);

  // ── Enrich trades with R values and group by sequence ──────────────────────
  const tradesWithR = (trades || []).map((t: Record<string, unknown>) => ({ ...t, r_value: calcR(t) }));

  const seqMap = new Map<string, typeof tradesWithR>();
  tradesWithR.forEach((t) => {
    const key = t.sequence_id != null ? String(t.sequence_id) : `solo_${t.id}`;
    if (!seqMap.has(key)) seqMap.set(key, []);
    seqMap.get(key)!.push(t);
  });

  const sequences = Array.from(seqMap.entries()).map(([seqId, ts]) => ({
    sequence_id: seqId,
    date: ts[0].date,
    setup: ts[0].setup || '—',
    trade_count: ts.length,
    net_r: Math.round(ts.reduce((s, t) => s + (t.r_value ?? 0), 0) * 100) / 100,
    net_pnl: Math.round(ts.reduce((s, t) => s + ((t.net_pnl as number) || 0), 0) * 100) / 100,
    post_exit: ts.find((t) => t.post_exit_outcome)?.post_exit_outcome || null,
    high_attempt: ts.length >= 4,
  })).sort((a, b) => (a.date as string).localeCompare(b.date as string));

  // ── Pre-compute key metrics (passed directly to manager — no guessing) ──────
  const computedNetPnl = Math.round((trades || []).reduce((s, t: Record<string, unknown>) => s + ((t.net_pnl as number) || 0), 0) * 100) / 100;

  const SCRATCH_THRESHOLD = 0.3;
  const nonScratches = tradesWithR.filter((t) => t.r_value != null && Math.abs(t.r_value as number) > SCRATCH_THRESHOLD);
  const winners = nonScratches.filter((t) => (t.r_value as number) > 0);
  const computedWinRate = nonScratches.length > 0 ? Math.round((winners.length / nonScratches.length) * 100) : null;

  // ── Rule compliance summary from trading_days ──────────────────────────────
  const RULE_COLS = ['rules_trend', 'rules_market_cond', 'rules_top_bottom', 'rules_plays', 'rules_execution', 'rules_focus', 'rules_consol', 'rules_dll', 'rules_cooloff'];
  const RULE_LABELS: Record<string, string> = {
    rules_trend: 'Trend', rules_market_cond: 'Market Conditions', rules_top_bottom: 'No Top/Bottom Picking',
    rules_plays: 'Playbook Only', rules_execution: 'Execution', rules_focus: 'Focus',
    rules_consol: 'Consolidation', rules_dll: 'Risk Manager Respected', rules_cooloff: 'Cool-Off',
  };

  const ruleByDay = (tradingDays || []).map((d: Record<string, unknown>) => {
    const broke = RULE_COLS.filter((k) => d[k] === 'Broke' || d[k] === 'broke').map((k) => RULE_LABELS[k]);
    return `${d.date}: ${broke.length ? 'BROKE [' + broke.join(', ') + ']' : 'Clean'}`;
  }).join('\n');

  const totalRuleSlots = (tradingDays || []).length * RULE_COLS.length;
  const brokenCount = (tradingDays || []).reduce((sum, d: Record<string, unknown>) =>
    sum + RULE_COLS.filter((k) => d[k] === 'Broke' || d[k] === 'broke').length, 0);
  const computedDisciplinePct = totalRuleSlots > 0 ? Math.round(((totalRuleSlots - brokenCount) / totalRuleSlots) * 100) : null;

  const brokenNotes = (ruleNotes || [])
    .map((r: Record<string, unknown>) => `${r.date} — ${r.rule}: ${r.notes}`)
    .join('\n') || 'None';

  // ── Missed plays from trading_days ─────────────────────────────────────────
  const missedPlays = (tradingDays || []).flatMap((d: Record<string, unknown>) =>
    ['bull1', 'bull2', 'bear1', 'bear2'].flatMap((p) => {
      const result = d[`${p}_result`] as string;
      if (result !== 'Played Out' && result !== 'Partially') return [];
      if (d[`${p}_traded`] === 'Yes') return [];
      return [`${d.date} | ${p.toUpperCase()} (${result}) | "${d[`${p}_description`] || '?'}" | reason not taken: "${d[`${p}_why_not`] || 'none given'}"`];
    })
  );

  // ── Journal text ───────────────────────────────────────────────────────────
  const journalText = (journal || []).map((j: Record<string, unknown>) => {
    const emotions = Array.isArray(j.emotions) ? j.emotions.join(', ') : j.emotions || 'none';
    return `[${j.trading_day} ${j.et_time || ''} ${j.session_phase || ''}]\nEmotions: ${emotions}\nNotes: ${j.dictated_text || '—'}\nLesson: ${j.lesson_text || '—'}`;
  }).join('\n\n');

  // ── Trade text for Agent 2 ─────────────────────────────────────────────────
  const tradesText = tradesWithR.map((t) =>
    `${t.date} | ${t.instrument || '—'} | ${t.direction || '—'} | Setup: ${t.setup || '—'} | Seq: ${t.sequence_id ?? '—'} | Time: ${String(t.entry_time || '').slice(11, 16)} | PnL: $${Number(t.net_pnl || 0).toFixed(2)} | R: ${t.r_value != null ? Number(t.r_value).toFixed(2) : '—'} | Mgmt: ${t.management || '—'} | Post-exit: ${t.post_exit_outcome || '—'}`
  ).join('\n');

  const seqText = sequences.map((s) =>
    `Seq ${s.sequence_id} | ${s.date} | ${s.setup} | ${s.trade_count} trade${s.trade_count !== 1 ? 's' : ''} | Net R: ${s.net_r} | Net PnL: $${s.net_pnl} | Post-exit: ${s.post_exit || '—'}${s.high_attempt ? ' | ⚠ HIGH ATTEMPT COUNT' : ''}`
  ).join('\n');

  const readinessText = (tradingDays || []).map((d: Record<string, unknown>) =>
    `${d.date} | Sleep: ${d.whoop_sleep ?? '—'}% | Recovery: ${d.whoop_recovery ?? '—'}% | Gate: ${d.gate || '—'} | Session: ${d.session_character || '—'} | Net PnL: $${Number(d.net_pnl || 0).toFixed(2)}`
  ).join('\n');

  // ── AGENT 1: Psychology & Behaviour ───────────────────────────────────────
  const agent1System = `You are a performance psychologist specialising in trading psychology. You analyse a futures trader's journal, emotions, missed plays, and broken-rule patterns each week.

${TRADER_PROFILE}

Write your analysis in clear prose with these four section headings exactly as shown:

PSYCHOLOGY & EMOTIONS
Analyse emotion trends across the week. Which emotions appeared most? When did they appear (pre-session, intra-session, post-session)? Cross-reference emotion timing with trade outcomes where journal timestamps allow. What does the pattern suggest about this trader's emotional triggers?

MISSED PLAYS
Analyse every missed play. How many playable setups were skipped? What reasons were given? Is there a pattern — always missing a direction, always skipping pre-market, always second-guessing? What does the opportunity cost look like if you estimate roughly what was left on the table?

PSYCHOLOGY & DISCIPLINE
Cross-reference broken rules with journal emotions. On days when rules were broken, what was the emotional state recorded? Are specific emotions reliably preceding specific rule breaks? Are the same rules being broken for the same psychological reasons?

LESSONS & REFLECTIONS
Categorise lesson themes from journal entries. Group similar lessons together. Flag any theme that has appeared in prior weeks (check memory). Are lessons being acted on in subsequent sessions, or are they being repeated without resolution?`;

  const agent1User = `WEEK: ${start} to ${weekEnding}

JOURNAL ENTRIES (${journal?.length || 0} entries):
${journalText || 'No journal entries this week.'}

MISSED PLAYS (${missedPlays.length}):
${missedPlays.join('\n') || 'None recorded.'}

RULE COMPLIANCE WITH BROKEN RULE NOTES:
${brokenNotes}

PRIOR WEEKS (for pattern detection):
${formatMemory(agent1Mem)}`;

  // ── AGENT 2: Performance & Numbers ────────────────────────────────────────
  const agent2System = `You are a performance analyst specialising in trading metrics. You analyse a futures trader's trade data, sequences, discipline compliance, and readiness each week.

${TRADER_PROFILE}

Write your analysis in clear prose with these four section headings exactly as shown:

PERFORMANCE
Lead with R-factor data if available: Avg R, Avg Win R, Avg Loss R, Expectancy R. Flag whether Avg Win R is above or below the 1.5R minimum target and explain what that means. Then cover P&L, win rate (ex-scratches), profit factor. Note top 3 winners as % of gross wins. Is the edge consistent across the week or driven by one or two trades? Compare to prior weeks where memory is available.

EDGE QUALITY
Analyse at sequence level first. How many sequences? How many profitable? Net R per sequence? Any HIGH ATTEMPT COUNT sequences — what happened? Then cross-reference post_exit_outcome: if a trade is tagged ran_1r/2r/3r it means there was more on the table — was this a hold quality problem or was the management correct given market conditions? Only reference setup breakdown as supporting context after sequence analysis.

MENTAL & READINESS
Readiness data by day: sleep, recovery, gate. Make explicit connections — on low-readiness days, what happened to discipline and P&L? On high-readiness days, did performance reflect it? What is the pattern?

DISCIPLINE (numbers)
Rule compliance day by day. Compliance percentage for the week. Which rules broke most frequently? Calculate the implied P&L cost of discipline failures where possible using R data. Flag any days with high trade count + broken rules + negative P&L — these are spiral days.`;

  const agent2User = `WEEK: ${start} to ${weekEnding}

TRADES (${tradesWithR.length} total):
${tradesText || 'No trades this week.'}

SEQUENCE SUMMARY (${sequences.length} sequences):
${seqText || 'No sequences.'}

READINESS & SESSION CHARACTER BY DAY:
${readinessText || 'No readiness data.'}

RULE COMPLIANCE BY DAY:
${ruleByDay || 'No compliance data.'}

PRIOR WEEKS (for rolling analysis):
${formatMemory(agent2Mem)}`;

  // ── Run Agent 1 and Agent 2 in parallel ───────────────────────────────────
  const [agent1Output, agent2Output] = await Promise.all([
    callClaude(apiKey, agent1System, agent1User, 2000),
    callClaude(apiKey, agent2System, agent2User, 2000),
  ]);

  // ── MANAGER AGENT ──────────────────────────────────────────────────────────
  const managerSystem = `You are a senior trading coach who synthesises weekly analysis from two specialist agents, tracks patterns across weeks, checks resolution of prior focus items, and delivers clear direct coaching.

${TRADER_PROFILE}

You must respond with valid JSON only — no markdown, no explanation outside the JSON. Use this exact structure:

{
  "week_in_one_line": "One sentence addressed directly to the trader (use 'you/your', never 'Mike') capturing the defining character of this week",
  "focus_next_week": [
    "Priority 1 — specific, measurable, tied to this week's data",
    "Priority 2 — specific, measurable, tied to this week's data"
  ],
  "resolution_check": [
    { "item": "exact text of prior focus item", "resolved": true, "evidence": "brief reason why resolved or not" }
  ],
  "pattern_flags": [
    { "pattern": "description of the recurring issue", "weeks_recurring": 3, "severity": "ESCALATING" }
  ],
  "risk_flag": { "level": "GREEN", "reason": "one sentence" },
  "key_findings": {
    "net_pnl": 0,
    "avg_r": null,
    "win_rate_ex_scratches": null,
    "discipline_pct": null,
    "week_verdict": "improving | declining | mixed | insufficient_data",
    "verdict_context": "one concrete sentence comparing this week to prior weeks e.g. 'lowest win rate in 4 weeks' or 'best discipline week this month'",
    "unresolved_lesson_themes": []
  },
  "trajectory_note": "One sentence on the medium-term trend (2-4 weeks), addressed directly to the trader"
}

Rules:
- week_in_one_line: use 'you/your', never 'Mike'. One defining sentence.
- focus_next_week: max 3 items. Carry over any unresolved prior focus items. Remove resolved ones. New items must be specific and measurable.
- resolution_check: for each focus item in PRIOR FOCUS ITEMS, assess whether this week's data shows the trader acted on it. Be direct. If no prior focus items exist, return [].
- pattern_flags: scan agent memory for issues recurring 2+ consecutive weeks. Severity: WARNING=2 weeks, ESCALATING=3 weeks, CRITICAL=4+ weeks. Only flag genuine recurring patterns.
- risk_flag: RED if Risk Manager limit breached on 2+ days AND trade count >50 AND discipline_pct <60%; AMBER if any two of those; GREEN otherwise.
- key_findings.net_pnl: MUST use exact number from VERIFIED COMPUTED STATS
- key_findings.win_rate_ex_scratches: MUST use exact number from VERIFIED COMPUTED STATS
- key_findings.discipline_pct: MUST use exact number from VERIFIED COMPUTED STATS
- key_findings.avg_r: calculate from Agent 2 output (number or null)
- key_findings.verdict_context: a concrete comparison e.g. "Worst discipline in 4 weeks", "Best win rate this month" — not just a direction word
- key_findings.unresolved_lesson_themes: lesson themes from Agent 1 that are recurring and unresolved`;

  const priorFocus = (managerMem || []).length > 0
    ? `PRIOR MANAGER SUMMARIES (use for resolution checking and pattern detection):\n${(managerMem as Record<string, unknown>[]).slice(0, 4).map((m) => {
        const kf = m.key_findings as Record<string, unknown> | null;
        const focusItems = Array.isArray(kf?.focus_next_week) ? (kf!.focus_next_week as string[]) : [];
        const flags = Array.isArray(kf?.pattern_flags) ? (kf!.pattern_flags as Record<string, unknown>[]) : [];
        return `Week ending ${m.week_ending}:\n  Summary: ${m.summary}${focusItems.length ? '\n  Focus items set: ' + focusItems.map((f, i) => `\n    ${i + 1}. ${f}`).join('') : ''}${flags.length ? '\n  Pattern flags: ' + flags.map((f) => `${f.pattern} (${f.severity})`).join(', ') : ''}`;
      }).join('\n\n')}\n\n`
    : '';

  const managerUser = `WEEK ENDING: ${weekEnding}

VERIFIED COMPUTED STATS (use these exact values in key_findings — do not override with estimates):
- net_pnl: ${computedNetPnl}
- win_rate_ex_scratches: ${computedWinRate ?? 'null'}
- discipline_pct: ${computedDisciplinePct ?? 'null'}

${priorFocus}AGENT 1 OUTPUT (Psychology & Behaviour):
${agent1Output}

AGENT 2 OUTPUT (Performance & Numbers):
${agent2Output}`;

  const managerRaw = await callClaude(apiKey, managerSystem, managerUser, 1500);

  // Parse manager JSON
  let managerOutput: Record<string, unknown>;
  try {
    const match = managerRaw.match(/\{[\s\S]*\}/);
    managerOutput = match ? JSON.parse(match[0]) : {};
  } catch {
    managerOutput = { week_in_one_line: '', focus_next_week: [], key_findings: {}, trajectory_note: '', raw: managerRaw };
  }

  // ── Save reports and memory to Supabase (delete first to prevent duplicates) ─
  const now = new Date().toISOString();
  const kf = (managerOutput.key_findings as Record<string, unknown>) || {};

  // Delete existing rows for this week before inserting fresh ones
  await Promise.all([
    supabase.from('agent_reports').delete().eq('week_ending', weekEnding),
    supabase.from('agent_memory').delete().eq('week_ending', weekEnding),
  ]);

  await Promise.all([
    supabase.from('agent_reports').insert({ report_type: 'agent1', week_ending: weekEnding, generated_at: now, content: { output: agent1Output } }),
    supabase.from('agent_reports').insert({ report_type: 'agent2', week_ending: weekEnding, generated_at: now, content: { output: agent2Output } }),
    supabase.from('agent_reports').insert({ report_type: 'manager', week_ending: weekEnding, generated_at: now, content: managerOutput }),
    supabase.from('agent_memory').insert({
      agent_name: 'agent1', week_ending: weekEnding,
      summary: agent1Output.slice(0, 1200),
      key_findings: {},
      created_at: now,
    }),
    supabase.from('agent_memory').insert({
      agent_name: 'agent2', week_ending: weekEnding,
      summary: agent2Output.slice(0, 1200),
      key_findings: kf,
      created_at: now,
    }),
    supabase.from('agent_memory').insert({
      agent_name: 'manager', week_ending: weekEnding,
      summary: [
        managerOutput.week_in_one_line || '',
        'Focus: ' + ((managerOutput.focus_next_week as string[]) || []).join(' | '),
        managerOutput.risk_flag ? `Risk: ${(managerOutput.risk_flag as Record<string, unknown>).level}` : '',
      ].filter(Boolean).join('\n'),
      key_findings: {
        ...kf,
        focus_next_week: managerOutput.focus_next_week || [],
        pattern_flags: managerOutput.pattern_flags || [],
        risk_flag: managerOutput.risk_flag || null,
      },
      created_at: now,
    }),
  ]);

  return new Response(JSON.stringify({
    success: true,
    week_ending: weekEnding,
    week_in_one_line: managerOutput.week_in_one_line,
    focus_next_week: managerOutput.focus_next_week,
  }), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
