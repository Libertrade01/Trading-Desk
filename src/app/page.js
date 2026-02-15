"use client";
import { useState, useEffect, useCallback } from "react";
import { storage } from "../lib/supabase";

// ═══════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════

function Card({ children, style }) {
  return <div style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)", borderRadius: 22, padding: 28, border: "1px solid rgba(255,255,255,0.06)", ...style }}>{children}</div>;
}

function SectionLabel({ text, color }) {
  return <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 2.5, color: color || "rgba(255,255,255,0.25)", fontWeight: 600, marginBottom: 18, textTransform: "uppercase" }}>{text}</div>;
}

function BackButton({ onClick }) {
  return <button onClick={onClick} style={{ padding: "10px 16px", borderRadius: 12, background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>← Back</button>;
}

function InputField({ label, value, onChange, type, options, placeholder, rows }) {
  const baseStyle = { width: "100%", padding: "14px 16px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", fontSize: 16, fontFamily: "inherit", background: "rgba(255,255,255,0.04)", color: "#fff", boxSizing: "border-box", outline: "none" };
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 8, letterSpacing: 0.3 }}>{label}</label>
      {type === "select" ? (
        <select value={value || ""} onChange={(e) => onChange(e.target.value)} style={{ ...baseStyle, appearance: "none" }}>
          <option value="" style={{ background: "#1a1a2e" }}>Select...</option>
          {options.map(o => <option key={o} value={o} style={{ background: "#1a1a2e" }}>{o}</option>)}
        </select>
      ) : type === "textarea" ? (
        <textarea value={value || ""} onChange={(e) => onChange(e.target.value)} rows={rows || 3} placeholder={placeholder} style={{ ...baseStyle, resize: "vertical" }} />
      ) : (
        <input type="text" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={baseStyle} />
      )}
    </div>
  );
}

function SaveButton({ saved, onClick, label }) {
  return <button onClick={onClick} style={{ width: "100%", padding: 18, background: saved ? "rgba(16,185,129,0.15)" : "linear-gradient(135deg, #E94560, #C62A47)", color: saved ? "#10B981" : "#fff", border: saved ? "1px solid rgba(16,185,129,0.3)" : "none", borderRadius: 16, fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.3s", letterSpacing: 0.5, boxShadow: saved ? "none" : "0 4px 20px rgba(233,69,96,0.3)" }}>{saved ? "✓ Saved" : label}</button>;
}

// ═══════════════════════════════════════════════════════════
// DATA & CONSTANTS
// ═══════════════════════════════════════════════════════════

const SCHEMAS = {
  abandonment: { name: "Abandonment", subtitle: "Grab It Before It's Gone", color: "#E94560", gradient: "linear-gradient(135deg, #E94560 0%, #C62A47 100%)", bg: "rgba(233,69,96,0.06)", icon: "⚡", trigger: "Unrealised profit on an open position. A winner that starts to pull back.", belief: "Good things get taken away. The $500K crypto loss encoded this at a survival level.", body: "Chest tightness, urgency, restless hands hovering over close button.", interrupts: ["This is not the crypto trade. I have a stop loss. My system is managing risk.", "Grabbing profit early is my fear talking, not my system.", "Every time I cut a winner early, I make the abandonment story come true.", "Let the market do the heavy lifting. I am capable of receiving this."], reset: "Hands off keyboard. Three slow breaths. Feel your feet on the floor. You are safe." },
  defectiveness: { name: "Defectiveness", subtitle: "I Have to Prove Myself", color: "#4361EE", gradient: "linear-gradient(135deg, #4361EE 0%, #3A0CA3 100%)", bg: "rgba(67,97,238,0.06)", icon: "🛡", trigger: "A loss, multiple losses, hitting DLL. Feeling like you made a mistake.", belief: "Losses confirm I'm not adequate. This fires in relationships too — when unappreciated.", body: "Heat in face/chest, jaw tightening, compulsive drive to re-enter immediately.", interrupts: ["A loss is a cost of business, not evidence of who I am.", "The DLL exists to protect me. Respecting it IS the professional move.", "Revenge trading has never once made me feel better.", "Walking away right now is the strongest thing I can do."], reset: "Stand up. Walk away for 5 minutes. Splash cold water on your face." },
  standards: { name: "Unrelenting Standards", subtitle: "It Has to Be Perfect", color: "#F48C06", gradient: "linear-gradient(135deg, #F48C06 0%, #DC6C02 100%)", bg: "rgba(244,140,6,0.06)", icon: "△", trigger: "A solid A+ setup that isn't at the exact top or bottom.", belief: "Anything less than perfect isn't good enough. This extends beyond trading.", body: "Dissatisfaction after profitable trades, inability to step away from charts.", interrupts: ["A+ is the standard. Not perfect. A+ builds accounts.", "Picking tops & bottoms is picking a fight I'm likely to lose.", "A good entry with proper management beats a perfect entry I never took.", "Conserve mental capital. Perform better. Be selective."], reset: "Close the 1-minute chart. Zoom out. Look at the higher timeframe trend." },
};

const CHECKIN_QUESTIONS = [
  { q: "Anxiety about losing money today?", schema: "ABANDON" }, { q: "Need to 'prove' something today?", schema: "DEFECT" },
  { q: "Fixated on making today 'perfect'?", schema: "STANDARD" }, { q: "Something personal activating me?", schema: "ALL" },
  { q: "Trading to recover yesterday?", schema: "DEFECT" },
];

const POST_SESSION_FIELDS = [
  { key: "preScores", label: "Pre-session schema scores" }, { key: "gateColor", label: "Decision gate colour", type: "select", options: ["GREEN", "AMBER", "RED"] },
  { key: "activations", label: "Times activated" }, { key: "dominantSchema", label: "Schema that fired most", type: "select", options: ["Abandonment", "Defectiveness", "Standards", "None"] },
  { key: "cascadePattern", label: "Most common cascade pattern" }, { key: "dllUrges", label: "DLL unlock urges today", type: "select", options: ["0", "1", "2", "3+"] },
  { key: "dllOutcome", label: "DLL outcome", type: "select", options: ["No urges", "Used breaker — stayed locked", "Unlocked", "N/A"] },
  { key: "usedInterrupts", label: "Used pattern interrupts?", type: "select", options: ["Yes", "No", "Partially"] },
  { key: "interruptsWorked", label: "Did they work?", type: "select", options: ["Yes", "No", "Partially", "N/A"] },
  { key: "deviated", label: "Deviated from CSTE?", type: "select", options: ["Yes", "No"] }, { key: "deviationSchema", label: "If deviated, which schema?" },
  { key: "bestMoment", label: "Best moment" }, { key: "worstMoment", label: "Worst moment" }, { key: "reflection", label: "Key insight", type: "textarea" },
];

const WEEKLY_QUESTIONS = ["Which schema was most active this week?", "Most common cascade pattern this week?", "How many DLL urges? Did the circuit breaker help?", "On my worst day, what was my pre-session emotional state?", "Sessions where I was activated but followed plan? (These are wins)", "P&L on GREEN vs AMBER vs RED days?", "Patterns activating me outside of trading?", "One thing I'll change next week?"];

const DLL_STEPS = [
  { title: "STOP", subtitle: "Do not touch the DLL yet.", prompt: "What just happened that made me want to unlock?", key: "whatHappened", type: "text" },
  { title: "FEEL", subtitle: "Name what's happening inside you.", prompt: "What am I feeling right now?", key: "feeling", type: "select", options: ["Anger at a loss", "Need to prove myself", "Frustration — I know I'm better than this", "Desperation to recover", "Numbness — I've stopped caring", "Other"] },
  { title: "IDENTIFY", subtitle: "Which schema is driving this?", prompt: "This urge is being driven by:", key: "schema", type: "select", options: ["Defectiveness — I need to prove I'm not a failure", "Abandonment — I need to get back what was taken", "Standards — I can't accept ending the day like this"] },
  { title: "REMEMBER", subtitle: "These are your own words.", prompt: null, key: "remember", type: "affirmations" },
  { title: "DECIDE", subtitle: "Make a conscious choice.", prompt: "Having read all of this, I choose to:", key: "decision", type: "select", options: ["Keep DLL locked — walk away and protect my dreams", "Keep DLL locked — I'll come back tomorrow stronger", "Unlock DLL — I acknowledge I am breaking my own rules"] },
];

const DLL_AFFIRMATIONS = ["Disrespecting and unlocking DLL means I am intentionally breaking my own dreams.", "The DLL exists to protect me from this exact moment.", "Revenge trading has never once made me feel better. It has only ever made the day worse.", "Walking away right now is the strongest thing I can do.", "My large drawdown days come from this exact decision.", "Not following my system means I'm not following my dreams."];

const NON_NEGOTIABLES = ["Breaking my rules means I am intentionally breaking my own dreams.", "Not following my system means I'm not following my dreams.", "Picking tops & bottoms is picking a fight I'm likely to lose.", "Moving to BE out of fear is choosing comfort over conviction.", "Distractions while trading rob me of my progress.", "Trading my PnL means long term Probably Lose."];

const conceptColor = "#8B95A8";
const conceptGrad = "linear-gradient(135deg, #8B95A8 0%, #6B7280 100%)";
const conceptBg = "rgba(139,149,168,0.04)";

const AMT_CONCEPTS = {
  priceAboveValue: { name: "Price Above Value", subtitle: "Buyers are aggressive, but for how long?", color: conceptColor, gradient: conceptGrad, bg: conceptBg, icon: "↑", group: "core",
    rules: [{ label: "Core Principle", text: "When price trades above the value area, the market is probing for new buyers at higher prices. Sellers see opportunity, buyers are paying a premium." }, { label: "What to Expect", text: "If new buyers continue to enter at these higher prices, value migrates up — this is acceptance. If volume dries up and price falls back into the value area, it was a failed probe — this is rejection." }, { label: "Key Signal", text: "Watch for responsive sellers stepping in. If price stays above value but volume drops, the auction is running out of buyers. Gravity pulls price back to value." }],
    action: "If long: trail and manage — you're in profit territory but the edge is thinning. If flat: don't chase. Wait for either acceptance (value migration) or rejection (fade back to POC).",
    caution: "Buying above value is paying a premium. The further from value, the higher the odds of mean reversion. Responsive sellers live here." },
  priceBelowValue: { name: "Price Below Value", subtitle: "Sellers are aggressive, but for how long?", color: conceptColor, gradient: conceptGrad, bg: conceptBg, icon: "↓", group: "core",
    rules: [{ label: "Core Principle", text: "When price trades below the value area, the market is probing for new sellers at lower prices. Buyers see opportunity, sellers are accepting lower prices." }, { label: "What to Expect", text: "If new sellers continue to enter at these lower prices, value migrates down — acceptance. If volume dries up and price returns to the value area, it was a failed probe — rejection." }, { label: "Key Signal", text: "Watch for responsive buyers stepping in. If price stays below value but selling pressure fades, the auction is exhausting sellers. Price gets pulled back to value." }],
    action: "If short: trail and manage — you're in profit territory. If flat: don't chase the sell. Wait for acceptance (value migrating down) or rejection (bounce back to POC).",
    caution: "Selling below value is selling at a discount. Responsive buyers are looking for entries here. The further from value, the stronger the pull back." },
  balance: { name: "Balance", subtitle: "The market has found agreement", color: conceptColor, gradient: conceptGrad, bg: conceptBg, icon: "⊜", group: "core",
    rules: [{ label: "Core Principle", text: "Balance means the market has found a fair price. Both buyers and sellers are satisfied at this level. Price rotates around the Point of Control within a defined range." }, { label: "What to Expect", text: "Price oscillates between the value area high and low. Breakout attempts fail and get absorbed. Volume concentrates around POC. This is the market building energy for the next move." }, { label: "Key Signal", text: "Narrowing range and declining volume signal the balance is maturing. The longer the balance, the more significant the eventual breakout. Time in balance = energy for imbalance." }],
    action: "Trade the edges of the range. Buy near VAL with stops below, sell near VAH with stops above. Target POC. Do NOT try to pick the breakout direction — let the market show you.",
    caution: "This is where consolidation chops you up. Your January review said it — do not engage with price action when consolidating unless you're trading the edges with a plan." },
  imbalance: { name: "Imbalance", subtitle: "One side has taken control", color: conceptColor, gradient: conceptGrad, bg: conceptBg, icon: "⇶", group: "core",
    rules: [{ label: "Core Principle", text: "Imbalance means the market has left fair value. One side — buyers or sellers — has overwhelmed the other. Price moves directionally as the market searches for a new level of agreement." }, { label: "What to Expect", text: "Elongated profiles, single prints, poor structure. Price moves with conviction and pullbacks are shallow. The market is migrating value, not rotating within it." }, { label: "Key Signal", text: "Initiative activity — participants trading away from value, not back to it. Volume confirms: high volume on the move, low volume on pullbacks. This is trend." }],
    action: "Trade with the imbalance, not against it. Enter on pullbacks to developing value, not at the extremes. This is where your trend filter alignment matters most — your biggest wins come from riding imbalance.",
    caution: "Do NOT pick tops and bottoms during imbalance. Against trend filters & strong tape was your biggest loss category. The market will tell you when imbalance ends — you don't need to predict it." },
  failedAuction: { name: "Failed Auction", subtitle: "The probe was rejected", color: conceptColor, gradient: conceptGrad, bg: conceptBg, icon: "⟲", group: "core",
    rules: [{ label: "Core Principle", text: "A failed auction occurs when price probes a direction — makes a new high or low — but fails to attract continuation. The lack of follow-through traps participants and reverses." }, { label: "What to Expect", text: "Sharp rejection from the extreme. Excess prints (single TPOs at the high/low). Volume spike at the extreme followed by aggressive reversal. Trapped traders fuel the move back." }, { label: "Key Signal", text: "The auction needs two things to succeed: price discovery AND participation. If price reaches a new level but nobody follows, the auction fails. Look for: poor high/low (no excess), single prints, quick rejection." }],
    action: "Failed auctions create high-probability reversal entries. The trap provides the fuel. Enter on confirmation of failure (price re-entering the prior range) with a stop beyond the failed extreme.",
    caution: "Confirmation is everything. A probe is not a failed auction until it fails. Don't front-run the failure — that's picking tops and bottoms. Wait for the rejection to confirm, then act." },
  acceptance: { name: "Acceptance vs Rejection", subtitle: "Is the new price level real?", color: conceptColor, gradient: conceptGrad, bg: conceptBg, icon: "⇌", group: "core",
    rules: [{ label: "Acceptance", text: "Price spends time at the new level. Volume builds. TPOs accumulate. The market is saying: 'This is fair.' Value area begins to shift. When you see acceptance, the old value area becomes less relevant — trade the new developing value." }, { label: "Rejection", text: "Price touches the new level but doesn't stay. Volume is thin. Single prints. Quick snap back to prior value. The market is saying: 'No, this isn't fair.' When you see rejection, the prior value area remains the magnet." }, { label: "How to Tell the Difference", text: "Time and volume. Acceptance = time at the level + volume building. Rejection = brief visit + volume drying up. If you're unsure, you're probably looking at rejection — acceptance is obvious when it's happening." }],
    action: "Acceptance: trade in the direction of the new value. The breakout is real. Rejection: fade back to the prior value area. The breakout failed.",
    caution: "Don't decide too early. Give the auction time to show you. Jumping in before acceptance/rejection is confirmed is gambling, not trading. Patience here directly protects your capital." },

  initiativeResponsive: { name: "Initiative vs Responsive", subtitle: "Who is driving the auction?", color: conceptColor, gradient: conceptGrad, bg: conceptBg, icon: "⥃", group: "reading",
    rules: [{ label: "Responsive Activity", text: "Responsive participants trade back toward value. Responsive sellers appear above VAH — they believe price is too high and will return. Responsive buyers appear below VAL — they see a discount. Responsive activity is mean-reversion behavior. It maintains the existing balance and keeps price rotating within the value area." }, { label: "Initiative Activity", text: "Initiative participants trade away from value. Initiative buying above VAH means new buyers are willing to pay a premium and drive price further from fair value. Initiative selling below VAL means sellers are pushing aggressively for lower prices. Initiative activity is trend behavior. It breaks the existing balance and creates imbalance." }, { label: "Reading the Shift", text: "When responsive activity dominates, the value area holds — trade the range. When initiative takes over, value migrates — trade with the direction. The critical read: if price is above VAH and volume is building (not fading), that's initiative buying — don't fade it. If price is above VAH but volume thins and price stalls, responsive sellers are winning — fade back to value." }],
    action: "Identify which type of activity is dominant. Responsive = trade the range, target POC, fade the edges. Initiative = trade with the move, enter on pullbacks, don't fight the direction.",
    caution: "Fading initiative activity is one of the most costly mistakes in trading. If the market is moving away from value with conviction and volume, stepping in front of it is not a high-probability trade — it's a gamble on a reversal that hasn't happened yet." },

  auctionRotations: { name: "Auction Rotations & Excess", subtitle: "How auctions complete", color: conceptColor, gradient: conceptGrad, bg: conceptBg, icon: "↻", group: "reading",
    rules: [{ label: "How Auctions End", text: "Price probes in one direction until it runs out of willing participants at that level, then reverses. The turning point creates excess — visible as single prints or buying/selling tails at the profile extremes. Excess means the auction in that direction is complete. The market found the boundary and turned away." }, { label: "Poor Highs & Poor Lows", text: "A poor high or poor low has no excess — the profile edge is flat, with no tail or single prints. This means the auction was interrupted before it completed. The market has unfinished business in that direction and is likely to return to probe further. Poor structure = incomplete auction = future directional target." }, { label: "Pre-Session Read", text: "Check yesterday's profile. Excess at both the high and low? Both auctions completed — expect a balanced, rotational day. Poor high with excess low? Unfinished business above — directional bias is up. Poor low with excess high? Unfinished business below — directional bias is down. This is one of the most reliable pre-session prep tools." }],
    action: "Use excess and poor structure as part of daily preparation. A poor high or low gives you a directional bias before the session opens. When the market confirms that bias with early initiative activity, you have a high-conviction trade.",
    caution: "Poor structure creates a directional bias, not a guarantee. The market may need multiple sessions to revisit unfinished business. Use it as context, not as a trigger — let the live auction confirm the bias before committing." },

  valueAreaMigration: { name: "Value Area Migration", subtitle: "How value shifts session to session", color: conceptColor, gradient: conceptGrad, bg: conceptBg, icon: "⇥", group: "reading",
    rules: [{ label: "Higher Value", text: "Today's value area is entirely above yesterday's. This signals bullish migration — the market has repriced higher and both buyers and sellers agree that fair value has moved up. This is trend continuation. The stronger and more consistent the migration across multiple sessions, the stronger the trend." }, { label: "Lower Value", text: "Today's value area is entirely below yesterday's. Bearish migration — fair value has shifted down. Sellers are in control and the market is accepting lower prices. As with higher value migration, consistency across sessions confirms the trend." }, { label: "Overlapping Value", text: "Today's value area overlaps with yesterday's. The market hasn't committed to a new level — balance continues. This is the most common scenario. The degree of overlap matters: slight overlap suggests the market is testing a move, heavy overlap means it's going nowhere. When value areas stack on top of each other across sessions, the market is building a larger balance area." }, { label: "Rate of Migration", text: "How fast value migrates tells you about trend strength. Rapid migration with gaps between value areas = strong trend with high conviction. Gradual migration with overlapping areas = grinding trend that could stall or reverse. No migration = range-bound, wait for a catalyst." }],
    action: "Compare value areas as part of daily prep before the session. Migration direction tells you which side to favour. Migration rate tells you how aggressively to position. If value is migrating, only look for trades in the direction of migration.",
    caution: "Value migration is a lagging indicator — it confirms what happened, not what will happen. A trend that has been migrating for many sessions may be approaching exhaustion. Always combine migration analysis with live auction reads (initiative vs responsive, excess) for the full picture." },

  profileShapes: { name: "Profile Shapes & Day Types", subtitle: "Reading the session's story", color: conceptColor, gradient: conceptGrad, bg: conceptBg, icon: "◨", group: "reading",
    rules: [{ label: "D-Shape — Balance / Rotational", text: "A normal distribution — fat in the middle, thin at the extremes. The market found fair value and rotated around it. An indecisive market with no buyers at the highs and no sellers at the lows. Prices below VAL are too cheap to sell, prices above VAH are too expensive to buy. Two-way trade dominates with a lack of imbalances. VWAP remains fairly flat throughout the session. Price is choppy in these conditions — execute at the edges and be patient. Target the middle of the range for take-profit and the opposite side of the range for runners." },
      { label: "P-Shape — Grind / Melt Up", text: "The market auctioned lower early in the session (the tail of the P), found responsive buyers, then rallied and spent most of its time building volume in the upper range (the bulge of the P). Strong imbalance up from the open which holds. Price pushes higher with every move, building volume to the upside — signalling buyers continue to be rewarded and shorts are off the table. Pullbacks tend to be shallow. Even though it feels like buying high in the moment, buyers tend to be rewarded. The best trades are buying every pullback until the volume structure breaks. With no trapped buy volume, the market has no fuel to move down. Do not attempt to pick a high or force a short — this is a recipe for hitting your daily loss limit. Be patient and frame longs until there is a clear break in volume structure leaving buyers offside." },
      { label: "b-Shape — Liquidation / Sell Off", text: "The market rallied early (the tail of the b), found responsive sellers, then sold off with volume building in the lower range (the bulge of the b). Unlike grind-up days which are slow with shallow pullbacks, liquidations tend to be fast-moving with violent whips and bounces. The bounces can be very strong — strong enough to mistakenly flip bullish bias before the market shows any real change in structure. The market continually sequences lower highs and lower lows. Short covering rallies are easily misinterpreted as aggressive new buying, but once the selling imbalance is neutralised, the market often resumes its prior downward course. This creates opportunities to sell into the bounce. Shorting is inherently difficult — be conservative, lock in profits earlier, and be prepared for squeezes. The market's natural tendency leans long and most participants instinctively try to pick bottoms, which is one of the fastest ways to blow through a daily loss limit. Risk-taking is deeply wired through fight-or-flight mechanisms, making self-awareness of your physiological state crucial in fast-moving markets." },
      { label: "Double Distribution", text: "Two distinct value areas in the same session connected by a thin bridge of single prints. The market shifted from one fair price to another — a strong directional signal. This typically happens around a catalyst (news, data release, large institutional order) that causes the market to rapidly reprice. The gap between the two distributions is where initiative activity overwhelmed responsive activity completely. The single prints between the distributions often act as future support or resistance. When you see a double distribution forming, the move between the two areas is not an opportunity to fade — it's the market telling you fair value has shifted." }],
    action: "Identify the developing profile shape early in the session. D-shape: trade the edges, be patient. P-shape: buy pullbacks, don't short. b-shape: sell bounces, be conservative with targets. Double distribution: trade with the shift, don't fade the move between distributions.",
    caution: "Profile shapes are clearest in hindsight. Intraday, a P-shape can look like the top of a D-shape until the market proves otherwise. Let the session develop before committing to a day-type read — the first hour often misleads. Use volume structure and initiative/responsive activity to confirm what the shape is telling you." },
};

// ═══════════════════════════════════════════════════════════
// STORAGE HELPERS
// ═══════════════════════════════════════════════════════════

async function loadData(key, fallback) { try { const r = await storage.get(key); return r ? JSON.parse(r.value) : fallback; } catch { return fallback; } }
async function saveData(key, value) { try { await storage.set(key, JSON.stringify(value)); } catch (e) { console.error("Save:", e); } }
function todayKey() { return new Date().toISOString().split("T")[0]; }
function weekKey() { const d = new Date(); const s = new Date(d); s.setDate(d.getDate() - d.getDay() + 1); return `week-${s.toISOString().split("T")[0]}`; }
function formatDate(d) { const parts = d.split("-"); const dt = new Date(parts[0], parts[1]-1, parts[2]); return dt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }); }
function getWhoopGate(sl, re) { const s = parseFloat(sl), r = parseFloat(re); if (isNaN(s)||isNaN(r)) return null; if (s<70||r<55) return "RED"; if (s>=80&&r>=70) return "GREEN"; return "AMBER"; }
function gateColor(g) { return g==="GREEN"?"#10B981":g==="AMBER"?"#F48C06":g==="RED"?"#E94560":"rgba(255,255,255,0.2)"; }

// ═══════════════════════════════════════════════════════════
// EXPANDABLE CARD (shared pattern for schemas + AMT)
// ═══════════════════════════════════════════════════════════

function ExpandableCard({ item, expanded, onToggle, children }) {
  return (
    <div style={{ background: expanded ? item.bg : "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)", borderRadius: 22, border: `1px solid ${expanded ? `${item.color}33` : "rgba(255,255,255,0.06)"}`, marginBottom: 14, overflow: "hidden", transition: "all 0.3s ease" }}>
      <div onClick={onToggle} style={{ padding: "20px 22px", cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 46, height: 46, borderRadius: 13, background: item.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, boxShadow: expanded ? `0 4px 16px ${item.color}40` : "none", transition: "box-shadow 0.3s", color: item.iconColor || "#fff", fontWeight: 300 }}>{item.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, letterSpacing: 2, color: item.color, textTransform: "uppercase" }}>{item.name}</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>{item.subtitle}</div>
        </div>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s ease", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>▼</div>
      </div>
      {expanded && <div style={{ padding: "0 22px 22px", fontSize: 15, lineHeight: 1.8, color: "rgba(255,255,255,0.65)", animation: "fadeIn 0.25s ease" }}><div style={{ height: 1, background: `${item.color}22`, marginBottom: 18 }} />{children}</div>}
    </div>
  );
}

function RuleBlock({ label, text, color }) {
  return <div style={{ marginBottom: 16 }}><span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 1.5, color, fontWeight: 600, textTransform: "uppercase" }}>{label}</span><div style={{ marginTop: 5 }}>{text}</div></div>;
}

function DashedLabel({ text, color }) {
  return <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, color, fontWeight: 700, marginBottom: 14, opacity: 0.8, display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 16, height: 2, background: color, borderRadius: 1, opacity: 0.6 }} />{text}<span style={{ width: 16, height: 2, background: color, borderRadius: 1, opacity: 0.6 }} /></div>;
}

function HighlightBox({ label, icon, text, color }) {
  return <div style={{ background: `${color}15`, borderRadius: 14, padding: "16px 18px", fontSize: 15, border: `1px solid ${color}25`, marginTop: 10 }}><div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, color, fontWeight: 700, marginBottom: 8 }}>{icon} {label}</div><div style={{ color: "rgba(255,255,255,0.85)", fontWeight: 600, lineHeight: 1.7 }}>{text}</div></div>;
}

function AccentCard({ text, color }) {
  return <div style={{ padding: "14px 18px", marginBottom: 6, background: `${color}0A`, borderRadius: 14, borderLeft: `2px solid ${color}50`, color: "rgba(255,255,255,0.7)", fontSize: 15, lineHeight: 1.7 }}>{text}</div>;
}

// ═══════════════════════════════════════════════════════════
// LANDING PAGE
// ═══════════════════════════════════════════════════════════

function LandingPage({ onNavigate }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 24px", animation: "fadeIn 0.4s ease" }}>
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 4, color: "rgba(45,212,191,0.5)", fontWeight: 600 }}>LIBERTRADE</div>
        <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, marginTop: 6, color: "rgba(255,255,255,0.85)" }}>Trading Desk</div>
        <div style={{ fontSize: 15, color: "rgba(255,255,255,0.25)", marginTop: 10, lineHeight: 1.7 }}>My system works when I follow it. These tools help me follow it.</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <NavCard onClick={() => onNavigate("mental")} gradient="linear-gradient(180deg, #E94560, #4361EE, #F48C06)" tag="SCHEMA AWARENESS" title="Mental Game Framework" desc="Pre-session check-in, schema tracking, DLL circuit breaker, activation logs and reviews." />
        <NavCard onClick={() => onNavigate("fundamentals")} gradient="linear-gradient(180deg, #10B981, #4361EE, #A855F7)" tag="MARKET KNOWLEDGE" title="Market Fundamentals" desc="Auction Market Theory, value and price relationships, balance, imbalance and failed auctions." />
      </div>
      <div style={{ marginTop: 48, textAlign: "center" }}>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.15)", fontStyle: "italic", lineHeight: 1.8 }}>"The recognition is where the pattern breaks."</div>
      </div>
    </div>
  );
}

function NavCard({ onClick, gradient, tag, title, desc }) {
  return (
    <div onClick={onClick} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 22, padding: "28px 24px", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", transition: "all 0.3s ease", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: gradient, borderRadius: "22px 0 0 22px" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, color: "rgba(255,255,255,0.35)", fontWeight: 600, marginBottom: 6 }}>{tag}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "rgba(255,255,255,0.8)", letterSpacing: -0.3 }}>{title}</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", marginTop: 6, lineHeight: 1.6 }}>{desc}</div>
        </div>
        <div style={{ fontSize: 24, color: "rgba(255,255,255,0.15)", marginLeft: 16, flexShrink: 0 }}>→</div>
      </div>
    </div>
  );
}


const ruleColor = "#8B95A8";

const AMT_RULES = [
  { num: 1, diagram: 1, title: "Acceptance Into Balance", rule: "If price accepts into a balance area, it is likely to revert to the other side of balance.", detail: "Once price enters and is accepted into a value area, expect it to travel through to the opposite edge. The value area acts as a magnet — price gets pulled through it.", color: ruleColor },
  { num: 2, diagram: 2, title: "Rejection at Balance Edges", rule: "Price inside a balance area is expected to reject edges of balance until proven otherwise.", detail: "The edges of the value area (VAH and VAL) act as boundaries. Price will bounce between them. This gives you defined risk/reward — trade the rejection with stops beyond the edge.", color: ruleColor },
  { num: 3, diagram: 4, title: "Acceptance Outside Balance", rule: "If price accepts outside of balance, it is likely to become imbalanced (seeking new balance).", detail: "When price breaks out of balance AND accepts (time + volume at the new level), the market has shifted. It will trend until it finds a new balance area. Trade with the direction.", color: ruleColor },
  { num: 4, diagram: 6, title: "Destination of Imbalance", rule: "The 'destination' of an imbalance is often a prior older balance area, and the first stop is typically the Point of Control (PoC).", detail: "When the market moves in imbalance, it's heading somewhere. That somewhere is usually a prior balance area where the market previously found agreement. The PoC of that area is the first target.", color: ruleColor },
  { num: 5, diagram: 7, title: "Strong PoC Reaction", rule: "If price reacts strong from a PoC, that can disrupt Rule #1.", detail: "Normally price accepted into balance travels to the other side. But if there's a strong reaction at the PoC (heavy volume, sharp rejection), the PoC acts as a wall instead of a waypoint. The rule gets overridden.", color: ruleColor },
  { num: 6, diagram: 8, title: "Retest of Balance Edges", rule: "Price often 'retests' edges of balance areas.", detail: "After breaking out of balance, price frequently comes back to test the edge it broke through. The old resistance becomes support (or vice versa). These retests are high-probability entries in the direction of the breakout.", color: ruleColor },
  { num: 7, diagram: 9, title: "Time/Volume at Edge = Breakout", rule: "If time/volume builds at the edge of balance or range, price is likely to push through.", detail: "When you see price spending time at an edge and volume is building (not rejecting), the market is accepting the new level. This is the precursor to a breakout. The balance is about to end.", color: ruleColor },
  { num: 8, diagram: 3, title: "Choppy Inside Balance", rule: "Price action is 'choppier' inside balance areas (established value / consolidation).", detail: "Inside balance, there's no directional conviction. Both sides are active. This is where you get chopped up trying to trade directionally. Recognise it and either trade the edges or sit out.", color: ruleColor },
  { num: 9, diagram: 5, title: "The Two Big Questions", rule: "What direction does the market want to go in? How good of a job is the market doing in trying to go in that direction?", detail: "These two questions are all you need. Direction tells you which side to be on. Conviction (how good a job) tells you how aggressively to position. If the market wants to go up but is doing a poor job, be cautious.", color: ruleColor },
];

function RuleDiagram({ num }) {
  const w = 300, h = 180;
  const rc = "#8B95A8";
  const accent = "#E94560";
  const price = "rgba(255,255,255,0.7)";
  const dim = "rgba(255,255,255,0.08)";
  const lbl = "rgba(255,255,255,0.3)";
  const mono = "'JetBrains Mono', monospace";
  const af = "rgba(139,149,168,0.06)";
  const ad = "rgba(139,149,168,0.2)";

  const bal = (x1,y1,x2,y2) => (<>
    <rect x={x1} y={y1} width={x2-x1} height={y2-y1} fill={af} rx={3} />
    <line x1={x1} y1={y1} x2={x2} y2={y1} stroke={ad} strokeWidth={0.8} strokeDasharray="4,3" />
    <line x1={x1} y1={y2} x2={x2} y2={y2} stroke={ad} strokeWidth={0.8} strokeDasharray="4,3" />
  </>);

  const prof = (x,y1,y2) => {
    const m=(y1+y2)/2;
    return <path d={`M ${x},${y1} Q ${x+20},${m} ${x},${y2}`} stroke={rc} strokeWidth={1} fill="none" opacity={0.2} />;
  };

  const pocL = (x1,y,x2) => <line x1={x1} y1={y} x2={x2} y2={y} stroke={dim} strokeWidth={0.8} strokeDasharray="2,3" />;

  const tx = (x,y,text,fill=lbl,anchor="start",size=8) => (
    <text x={x} y={y} fontSize={size} fontFamily={mono} fill={fill} textAnchor={anchor} dominantBaseline="middle">{text}</text>
  );

  const ah = (x,y,angle,col=rc,len=7) => (
    <polyline points={`${x-len*Math.cos(angle-0.45)},${y-len*Math.sin(angle-0.45)} ${x},${y} ${x-len*Math.cos(angle+0.45)},${y-len*Math.sin(angle+0.45)}`} stroke={col} strokeWidth={1.5} fill="none" />
  );

  const diagrams = {
    1: () => {
      // Price approaches, shows ACCEPTANCE (sideways chop at VAH), then travels through to VAL
      const vah=52,va=122,p=87;
      return <>
        {bal(20,vah,275,va)}
        {prof(24,vah,va)}
        {pocL(20,p,275)}
        {tx(278,vah,"VAH")}
        {tx(278,va,"VAL")}
        {tx(278,p,"PoC")}
        {/* Price approaching from above */}
        <polyline points="35,20 52,30 68,40 82,48" stroke={price} strokeWidth={2} fill="none" strokeLinejoin="round" />
        {/* Acceptance zone — price chops sideways around VAH showing time spent */}
        <polyline points="82,48 92,56 100,50 110,58 118,52 128,60 136,54 144,62" stroke={price} strokeWidth={2} fill="none" strokeLinejoin="round" />
        {/* Acceptance bracket */}
        <rect x={85} y={45} width={62} height={20} fill="rgba(139,149,168,0.08)" rx={3} stroke="rgba(139,149,168,0.15)" strokeWidth={0.7} />
        {tx(116,38,"accepting",rc,"middle",7)}
        {/* Now travels through to other side */}
        <polyline points="144,62 158,72 172,82 185,92 198,102 210,110 222,118" stroke={price} strokeWidth={2} fill="none" strokeLinejoin="round" />
        {/* Exits below VAL */}
        <polyline points="222,118 235,130 248,142 258,152" stroke={price} strokeWidth={2} fill="none" strokeLinejoin="round" />
        {ah(258,152,Math.atan2(10,10))}
        {tx(205,160,"exits other side",rc,"start",7)}
      </>;
    },
    2: () => {
      // Price bouncing between VAH and VAL — rejection at each edge
      const vah=48,va=132;
      return <>
        {bal(20,vah,265,va)}
        {prof(24,vah,va)}
        {tx(270,vah,"VAH")}
        {tx(270,va,"VAL")}
        <polyline points="50,50 78,128 108,52 142,126 176,54 210,124 242,56" stroke={price} strokeWidth={2} fill="none" strokeLinejoin="round" />
        {/* Rejection chevrons at edges */}
        {[78,142].map(x => <polyline key={`b${x}`} points={`${x-4},134 ${x},128 ${x+4},134`} stroke={accent} strokeWidth={1.5} fill="none" />)}
        {[108,176,242].map(x => <polyline key={`t${x}`} points={`${x-4},46 ${x},52 ${x+4},46`} stroke={accent} strokeWidth={1.5} fill="none" />)}
        {tx(148,160,"rejects edges — defined R:R",accent,"middle",7)}
      </>;
    },
    3: () => {
      // Choppy erratic price inside balance
      const vah=48,va=132;
      return <>
        {bal(20,vah,265,va)}
        {prof(24,vah,va)}
        <polyline points="45,88 55,72 63,98 72,66 82,105 90,70 100,95 110,68 120,100 128,74 138,96 146,70 158,92 166,78 178,102 186,64 196,108 206,70 218,94 228,80 240,90 252,84" stroke={price} strokeWidth={1.5} fill="none" strokeLinejoin="round" opacity={0.55} />
        {tx(148,155,"choppy — no directional conviction","rgba(255,255,255,0.35)","middle",8)}
      </>;
    },
    4: () => {
      // Balance left side, price breaks above VAH, shows acceptance outside (chop above), then trends
      const vah=75,va=140,p=108;
      return <>
        {bal(20,vah,155,va)}
        {prof(24,vah,va)}
        {pocL(20,p,155)}
        {tx(10,vah-8,"VAH",lbl,"start",7)}
        {/* Price inside balance */}
        <polyline points="40,115 55,105 70,95 85,88 100,82 115,78 130,76" stroke={price} strokeWidth={2} fill="none" strokeLinejoin="round" />
        {/* Breaks above VAH */}
        <polyline points="130,76 142,68 152,60" stroke={price} strokeWidth={2} fill="none" strokeLinejoin="round" />
        {/* Acceptance zone — sideways chop above balance showing time+volume */}
        <polyline points="152,60 160,52 168,58 176,50 184,56 192,48 200,54" stroke={price} strokeWidth={2} fill="none" strokeLinejoin="round" />
        <rect x={150} y={44} width={54} height={18} fill="rgba(139,149,168,0.08)" rx={3} stroke="rgba(139,149,168,0.15)" strokeWidth={0.7} />
        {tx(177,38,"accepting above",rc,"middle",7)}
        {/* Now imbalanced — trends away */}
        <polyline points="200,54 218,40 238,26 260,14" stroke={rc} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
        {ah(260,14,Math.atan2(-12,22))}
        {tx(245,32,"imbalance",rc,"start",7)}
      </>;
    },
    5: () => {
      // Practical: balance → breakout, two questions annotated cleanly
      // Use taller viewbox with annotations below the price action
      const vah=55,va=105,p=80;
      return <>
        {/* Prior balance on the left */}
        {bal(15,vah,110,va)}
        {prof(19,vah,va)}
        {pocL(15,p,110)}
        {tx(18,vah-8,"balance",lbl,"start",7)}
        {/* Price choppy inside balance */}
        <polyline points="28,78 38,65 48,90 58,62 68,88 78,64 88,82 98,68 106,78" stroke={price} strokeWidth={1.5} fill="none" strokeLinejoin="round" opacity={0.5} />
        {/* Breaks above — strong trend */}
        <polyline points="106,78 118,65 130,55 145,45 162,36 180,28 200,22 222,16 248,10" stroke={price} strokeWidth={2} fill="none" strokeLinejoin="round" />
        {ah(248,10,Math.atan2(-6,26))}
        {/* Weak alternative — faint choppy path */}
        <polyline points="106,78 118,72 126,82 138,74 148,84 160,76 172,86 185,78 198,88" stroke={price} strokeWidth={1} fill="none" strokeLinejoin="round" opacity={0.15} strokeDasharray="3,3" />

        {/* Annotation line 1: direction — at breakout point */}
        <circle cx={130} cy={55} r={3} fill="none" stroke={rc} strokeWidth={1} />
        <line x1={130} y1={58} x2={130} y2={120} stroke="rgba(139,149,168,0.25)" strokeWidth={0.7} strokeDasharray="2,2" />
        {tx(20,128,"Q1: What direction?",rc,"start",7)}
        {tx(20,140,"→ UP (breaking above balance)",lbl,"start",7)}

        {/* Annotation line 2: conviction — along the trend */}
        <circle cx={200} cy={22} r={3} fill="none" stroke={rc} strokeWidth={1} />
        <line x1={200} y1={25} x2={200} y2={152} stroke="rgba(139,149,168,0.25)" strokeWidth={0.7} strokeDasharray="2,2" />
        {tx(20,158,"Q2: How good a job?",rc,"start",7)}
        {tx(20,170,"→ Strong (clean trend)  |  Faint line = weak (choppy, no progress)",lbl,"start",6)}
      </>;
    },
    6: () => {
      // Two balance areas, imbalance connecting, PoC target
      return <>
        {bal(15,28,95,88)}
        {prof(19,28,88)}
        {pocL(15,58,95)}
        {tx(35,20,"Balance A",lbl,"start",7)}
        {bal(185,78,280,148)}
        {prof(189,78,148)}
        {pocL(185,113,280)}
        {tx(210,70,"Balance B",lbl,"start",7)}
        {tx(248,111,"PoC",rc,"start",7)}
        <polyline points="80,58 105,70 128,85 152,98 172,108" stroke={price} strokeWidth={2} fill="none" strokeLinejoin="round" />
        {ah(172,108,Math.atan2(10,20))}
        <circle cx={198} cy={113} r={5} fill="none" stroke={rc} strokeWidth={1.5} />
        {tx(208,128,"first stop",rc,"start",7)}
        {tx(118,76,"imbalance","rgba(255,255,255,0.25)","start",7)}
      </>;
    },
    7: () => {
      // Price enters balance heading down, hits PoC, strong reversal back up
      const vah=48,va=135,p=92;
      return <>
        {bal(20,vah,270,va)}
        {prof(24,vah,va)}
        {pocL(20,p,270)}
        {tx(274,p,"PoC")}
        <polyline points="45,22 65,35 85,48 105,60 122,72 138,82 148,88" stroke={price} strokeWidth={2} fill="none" strokeLinejoin="round" />
        <circle cx={150} cy={90} r={6} fill="none" stroke={accent} strokeWidth={2} />
        <polyline points="154,86 168,72 182,55 198,40 218,28 240,18" stroke={accent} strokeWidth={2} fill="none" strokeLinejoin="round" />
        {ah(240,18,Math.atan2(-10,22),accent)}
        {tx(158,108,"strong reaction",accent,"start",7)}
        {tx(205,12,"reverses — disrupts #1",accent,"start",7)}
      </>;
    },
    8: () => {
      // Breakout above VAH, pullback retest, continuation
      const vah=75,va=135;
      return <>
        {bal(20,vah,175,va)}
        {prof(24,vah,va)}
        {tx(10,vah-8,"VAH",lbl,"start",7)}
        <line x1={175} y1={vah} x2={280} y2={vah} stroke={ad} strokeWidth={0.8} strokeDasharray="4,3" opacity={0.4} />
        <polyline points="95,110 115,98 132,85 148,76 162,65 178,52 198,38 215,28" stroke={price} strokeWidth={2} fill="none" strokeLinejoin="round" />
        <polyline points="215,28 225,42 235,58 242,70" stroke={price} strokeWidth={2} fill="none" strokeLinejoin="round" />
        <circle cx={244} cy={75} r={5} fill="none" stroke={rc} strokeWidth={1.5} />
        {tx(252,88,"retest",rc,"start",7)}
        <polyline points="247,72 255,58 264,42 275,25" stroke={rc} strokeWidth={2} fill="none" strokeLinejoin="round" />
        {ah(275,25,Math.atan2(-17,11),rc)}
      </>;
    },
    9: () => {
      // Price tightening at VAH edge, building, then breakout
      const vah=68,va=135;
      return <>
        {bal(20,vah,170,va)}
        {prof(24,vah,va)}
        {tx(10,vah-8,"VAH",lbl,"start",7)}
        <polyline points="42,115 58,100 72,85 86,78 98,73 110,76 122,71 134,74 145,70 155,72 164,69" stroke={price} strokeWidth={2} fill="none" strokeLinejoin="round" />
        <rect x={118} y={64} width={52} height={12} fill="rgba(139,149,168,0.08)" rx={3} stroke="rgba(139,149,168,0.15)" strokeWidth={0.7} />
        {tx(144,58,"time + volume building",rc,"middle",7)}
        <polyline points="164,69 185,52 210,36 238,20 262,8" stroke={rc} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
        {ah(262,8,Math.atan2(-12,24),rc)}
        {tx(230,42,"breakout",rc,"start",7)}
      </>;
    },
  };

  const d = diagrams[num];
  if (!d) return null;

  return (
    <div style={{ background: "rgba(0,0,0,0.35)", borderRadius: 14, padding: "14px 12px 10px", marginBottom: 14, border: "1px solid rgba(255,255,255,0.04)" }}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: "block" }}>
        {d()}
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MARKET FUNDAMENTALS
// ═══════════════════════════════════════════════════════════

function MarketFundamentals({ onBack }) {
  const [expanded, setExpanded] = useState(null);
  const [subTab, setSubTab] = useState("concepts");

  return (
    <div style={{ animation: "fadeIn 0.3s ease", padding: "32px 24px 24px" }}>
      <BackButton onClick={onBack} />
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 3, color: "rgba(45,212,191,0.5)", fontWeight: 600 }}>LIBERTRADE</div>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, marginTop: 3, color: "rgba(255,255,255,0.7)" }}>Market Fundamentals</div>
      <p style={{ fontSize: 15, color: "rgba(255,255,255,0.3)", lineHeight: 1.7, marginTop: 12, marginBottom: 20 }}>Price is always doing one of two things: searching for value or confirming it.</p>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[{ id: "concepts", label: "Deep Dive" }, { id: "rules", label: "AMT Rules" }].map(t => (
          <button key={t.id} onClick={() => { setSubTab(t.id); setExpanded(null); }} style={{
            flex: 1, padding: "14px 16px", border: "none", borderRadius: 14, cursor: "pointer",
            background: subTab === t.id ? "rgba(45,212,191,0.15)" : "rgba(255,255,255,0.03)",
            color: subTab === t.id ? "#2DD4BF" : "rgba(255,255,255,0.3)",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: subTab === t.id ? 700 : 500,
            letterSpacing: 1.5, transition: "all 0.2s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* AMT RULES TAB */}
      {subTab === "rules" && <div style={{ animation: "fadeIn 0.3s ease" }}>
        <Card style={{ marginBottom: 24, textAlign: "center" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,0.5)", fontWeight: 600, marginBottom: 16 }}>THE AXIOM</div>
          <div style={{ fontSize: 17, fontWeight: 600, fontStyle: "italic", lineHeight: 1.8, color: "rgba(255,255,255,0.65)" }}>"Price advertises opportunity. Volume confirms acceptance. Time reveals intent."</div>
        </Card>

        {AMT_RULES.map((r) => (
          <div key={r.num} onClick={() => setExpanded(expanded === `rule-${r.num}` ? null : `rule-${r.num}`)} style={{
            background: expanded === `rule-${r.num}` ? "rgba(139,149,168,0.04)" : "rgba(255,255,255,0.03)",
            borderRadius: 22, border: `1px solid ${expanded === `rule-${r.num}` ? "rgba(139,149,168,0.2)" : "rgba(255,255,255,0.06)"}`,
            marginBottom: 10, overflow: "hidden", cursor: "pointer", transition: "all 0.3s ease",
          }}>
            <div style={{ padding: "18px 22px", display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(139,149,168,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: r.color, flexShrink: 0 }}>{r.num}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: 1.5, color: r.color, marginBottom: 4 }}>{r.title.toUpperCase()}</div>
                <div style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>{r.rule}</div>
              </div>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", transform: expanded === `rule-${r.num}` ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s ease", color: "rgba(255,255,255,0.3)", fontSize: 11, flexShrink: 0, marginTop: 2 }}>▼</div>
            </div>
            {expanded === `rule-${r.num}` && (
              <div style={{ padding: "0 22px 20px", animation: "fadeIn 0.25s ease" }} onClick={e => e.stopPropagation()}>
                <div style={{ height: 1, background: "rgba(139,149,168,0.15)", marginBottom: 14 }} />
                <RuleDiagram num={r.diagram} />
                <div style={{ padding: "14px 18px", background: "rgba(139,149,168,0.04)", borderRadius: 14, borderLeft: "2px solid rgba(139,149,168,0.3)", color: "rgba(255,255,255,0.6)", fontSize: 15, lineHeight: 1.7 }}>{r.detail}</div>
              </div>
            )}
          </div>
        ))}
      </div>}

      {/* CONCEPTS TAB */}
      {subTab === "concepts" && <div style={{ animation: "fadeIn 0.3s ease" }}>
        {Object.entries(AMT_CONCEPTS).filter(([,c]) => c.group === "core").map(([key, c]) => (
          <ExpandableCard key={key} item={c} expanded={expanded === key} onToggle={() => setExpanded(expanded === key ? null : key)}>
            {c.rules.map((r, i) => <RuleBlock key={i} label={r.label} text={r.text} color={c.color} />)}
            <div style={{ marginTop: 14, marginBottom: 10 }}>
              <DashedLabel text="HOW TO TRADE IT" color={c.color} />
              <AccentCard text={c.action} color={c.color} />
            </div>
            <HighlightBox label="CAUTION" icon="⚠" text={c.caution} color={c.color} />
          </ExpandableCard>
        ))}

        <Card style={{ marginTop: 10, marginBottom: 20, textAlign: "center", padding: "18px 22px" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 3, color: "rgba(139,149,168,0.6)", fontWeight: 600 }}>READING THE AUCTION</div>
        </Card>

        {Object.entries(AMT_CONCEPTS).filter(([,c]) => c.group === "reading").map(([key, c]) => (
          <ExpandableCard key={key} item={c} expanded={expanded === key} onToggle={() => setExpanded(expanded === key ? null : key)}>
            {c.rules.map((r, i) => <RuleBlock key={i} label={r.label} text={r.text} color={c.color} />)}
            <div style={{ marginTop: 14, marginBottom: 10 }}>
              <DashedLabel text="HOW TO TRADE IT" color={c.color} />
              <AccentCard text={c.action} color={c.color} />
            </div>
            <HighlightBox label="CAUTION" icon="⚠" text={c.caution} color={c.color} />
          </ExpandableCard>
        ))}
      </div>}

      <div style={{ marginTop: 20, borderLeft: "3px solid rgba(45,212,191,0.4)", padding: "16px 20px" }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, color: "rgba(45,212,191,0.6)", fontWeight: 600, marginBottom: 8 }}>REMEMBER</div>
        <div style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.8 }}>The market is an auction. It moves to find participants. When it finds them, it stops. When it doesn't, it keeps searching. Your only job is to recognise which phase the auction is in and position accordingly.</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DLL BREAKER
// ═══════════════════════════════════════════════════════════

function DLLBreaker({ onLog }) {
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState({});
  const [completed, setCompleted] = useState(false);
  const [coolingDown, setCoolingDown] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const cs = DLL_STEPS[step]; const isLast = step === DLL_STEPS.length - 1;
  const canAdvance = cs.type === "affirmations" || responses[cs.key];

  const handleNext = () => { if (isLast) { const d = responses.decision || ""; if (d.startsWith("Unlock")) { setCoolingDown(true); setCooldownLeft(30); } else { setCompleted(true); onLog({ ...responses, timestamp: new Date().toISOString(), keptLocked: true }); } } else setStep(step + 1); };

  useEffect(() => { if (!coolingDown) return; if (cooldownLeft <= 0) { setCompleted(true); onLog({ ...responses, timestamp: new Date().toISOString(), keptLocked: false }); return; } const t = setTimeout(() => setCooldownLeft(cooldownLeft - 1), 1000); return () => clearTimeout(t); }, [coolingDown, cooldownLeft]);

  const reset = () => { setStep(0); setResponses({}); setCompleted(false); setCoolingDown(false); setCooldownLeft(0); };

  if (completed) { const kl = responses.decision && !responses.decision.startsWith("Unlock"); return (<div style={{ animation: "fadeIn 0.3s ease" }}><Card style={{ textAlign: "center", border: `1px solid ${kl ? "rgba(16,185,129,0.3)" : "rgba(233,69,96,0.3)"}` }}><div style={{ fontSize: 52, marginBottom: 18 }}>{kl ? "✓" : "⚠"}</div><div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700, color: kl ? "#10B981" : "#E94560", letterSpacing: 2, marginBottom: 10 }}>{kl ? "DLL PROTECTED" : "DLL UNLOCKED"}</div><div style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 24 }}>{kl ? "You chose to protect your dreams." : "This decision has been logged."}</div><button onClick={reset} style={{ padding: "14px 28px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Reset</button></Card></div>); }
  if (coolingDown) { return (<div style={{ animation: "fadeIn 0.3s ease" }}><Card style={{ textAlign: "center", border: "1px solid rgba(233,69,96,0.3)" }}><div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 3, color: "#E94560", fontWeight: 600, marginBottom: 18 }}>COOLING DOWN</div><div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 64, fontWeight: 700, color: "#E94560", textShadow: "0 0 40px rgba(233,69,96,0.4)", marginBottom: 14 }}>{cooldownLeft}</div><div style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 18 }}>Sit with this decision for {cooldownLeft} seconds.</div><button onClick={() => { setCompleted(true); onLog({ ...responses, timestamp: new Date().toISOString(), keptLocked: true, changedMind: true }); }} style={{ marginTop: 24, padding: "16px 28px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #10B981, #059669)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>I changed my mind — Keep DLL Locked</button></Card></div>); }

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", gap: 5, marginBottom: 28 }}>{DLL_STEPS.map((_, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? "#E94560" : "rgba(255,255,255,0.06)", transition: "all 0.3s" }} />)}</div>
      <Card style={{ border: "1px solid rgba(233,69,96,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #E94560, #C62A47)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700, color: "#fff" }}>{step + 1}</div>
          <div><div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, letterSpacing: 2, color: "#E94560" }}>{cs.title}</div><div style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>{cs.subtitle}</div></div>
        </div>
        {cs.type === "affirmations" ? (<div><div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.3)", marginBottom: 18 }}>READ EACH ONE CAREFULLY</div>{DLL_AFFIRMATIONS.map((a, i) => <div key={i} style={{ padding: "16px 18px", marginBottom: 10, background: "rgba(233,69,96,0.06)", borderRadius: 14, border: "1px solid rgba(233,69,96,0.1)", fontSize: 16, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, fontWeight: 500 }}>{a}</div>)}</div>
        ) : (<div><label style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 12 }}>{cs.prompt}</label>
          {cs.type === "select" ? (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{cs.options.map(o => <button key={o} onClick={() => setResponses({ ...responses, [cs.key]: o })} style={{ padding: "16px 18px", borderRadius: 14, textAlign: "left", border: responses[cs.key] === o ? "1px solid rgba(233,69,96,0.5)" : "1px solid rgba(255,255,255,0.06)", background: responses[cs.key] === o ? "rgba(233,69,96,0.1)" : "rgba(255,255,255,0.03)", color: responses[cs.key] === o ? "#E94560" : "rgba(255,255,255,0.55)", fontSize: 15, fontWeight: responses[cs.key] === o ? 600 : 400, cursor: "pointer", fontFamily: "inherit" }}>{o}</button>)}</div>
          ) : (<textarea value={responses[cs.key] || ""} onChange={(e) => setResponses({ ...responses, [cs.key]: e.target.value })} rows={3} placeholder="Be honest with yourself..." style={{ width: "100%", padding: "14px 16px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", fontSize: 16, fontFamily: "inherit", background: "rgba(255,255,255,0.04)", color: "#fff", boxSizing: "border-box", outline: "none", resize: "vertical" }} />)}
        </div>)}
        <div style={{ display: "flex", gap: 14, marginTop: 28 }}>
          {step > 0 && <button onClick={() => setStep(step - 1)} style={{ padding: "16px 22px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Back</button>}
          <button onClick={handleNext} disabled={!canAdvance} style={{ flex: 1, padding: 16, borderRadius: 14, border: "none", background: canAdvance ? (isLast ? "linear-gradient(135deg, #E94560, #C62A47)" : "rgba(255,255,255,0.08)") : "rgba(255,255,255,0.03)", color: canAdvance ? (isLast ? "#fff" : "rgba(255,255,255,0.7)") : "rgba(255,255,255,0.15)", fontSize: 16, fontWeight: 700, cursor: canAdvance ? "pointer" : "default", fontFamily: "inherit" }}>{isLast ? "Submit Decision" : "Continue →"}</button>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MENTAL GAME FRAMEWORK
// ═══════════════════════════════════════════════════════════

function MentalGameFramework({ onBack }) {
  const [tab, setTab] = useState("schemas");
  const [exp, setExp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ws, setWs] = useState(""); const [wr, setWr] = useState("");
  const [oc, setOc] = useState([false, false]); const [ss, setSs] = useState([0,0,0,0,0]); const [cs, setCs] = useState(false);
  const [al, setAl] = useState({ time:"", happened:"", feeling:"", bodyLocation:"", urge:"", schema:"", cascadeFrom:"", howOld:"", interrupt:"", outcome:"" });
  const [sa, setSa] = useState([]); const [dl, setDl] = useState([]);
  const [ps, setPs] = useState({}); const [pss, setPss] = useState(false);
  const [wrev, setWrev] = useState({}); const [wrs, setWrs] = useState(false);
  const [hk, setHk] = useState([]); const [sh, setSh] = useState(null); const [hd, setHd] = useState(null);
  const [nn, setNn] = useState(false);
  const wg = getWhoopGate(ws, wr);

  useEffect(() => { (async () => {
    const k = todayKey(); const ch = await loadData(`checkin-${k}`, null);
    if (ch) { setWs(ch.whoopSleep||""); setWr(ch.whoopRecovery||""); setOc(ch.otherChecks||[false,false]); setSs(ch.schemaScores||[0,0,0,0,0]); setCs(true); }
    setSa(await loadData(`activations-${k}`, [])); setDl(await loadData(`dll-${k}`, []));
    const p = await loadData(`post-${k}`, null); if (p) { setPs(p); setPss(true); }
    const w = await loadData(`weekly-${weekKey()}`, null); if (w) { setWrev(w); setWrs(true); }
    try { const keys = await storage.list("checkin-"); if (keys?.keys) setHk(keys.keys.map(k=>k.replace("checkin-","")).sort().reverse()); } catch {}
    setLoading(false);
  })(); }, []);

  const saveCheckin = async () => { await saveData(`checkin-${todayKey()}`, { whoopSleep:ws, whoopRecovery:wr, otherChecks:oc, schemaScores:ss, whoopGate:wg, timestamp:new Date().toISOString() }); setCs(true); };
  const saveAct = async () => { const u = [...sa, { ...al, timestamp:new Date().toISOString() }]; await saveData(`activations-${todayKey()}`, u); setSa(u); setAl({ time:"", happened:"", feeling:"", bodyLocation:"", urge:"", schema:"", cascadeFrom:"", howOld:"", interrupt:"", outcome:"" }); };
  const logDll = async (e) => { const u = [...dl, e]; await saveData(`dll-${todayKey()}`, u); setDl(u); };
  const savePost = async () => { await saveData(`post-${todayKey()}`, { ...ps, timestamp:new Date().toISOString() }); setPss(true); };
  const saveWeek = async () => { await saveData(`weekly-${weekKey()}`, { ...wrev, timestamp:new Date().toISOString() }); setWrs(true); };
  const loadHist = async (d) => { setSh(d); setHd({ checkin:await loadData(`checkin-${d}`,null), activations:await loadData(`activations-${d}`,[]), post:await loadData(`post-${d}`,null), dll:await loadData(`dll-${d}`,[]) }); };

  if (loading) return <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:"100vh", color:"rgba(255,255,255,0.3)" }}>Loading...</div>;

  const tabs = [{id:"schemas",label:"Schemas",icon:"☰"},{id:"checkin",label:"Check-In",icon:"◉"},{id:"activation",label:"Live",icon:"⚡"},{id:"dll",label:"DLL",icon:"⊘"},{id:"post",label:"Review",icon:"◈"},{id:"weekly",label:"Weekly",icon:"▣"},{id:"history",label:"Log",icon:"◫"}];

  const maxS = Math.max(...ss); const sg = maxS>5?"RED":maxS>3?"AMBER":"GREEN";
  const go = {GREEN:0,AMBER:1,RED:2}; const fg = !wg ? sg : go[wg]>go[sg] ? wg : sg;
  const gc = {GREEN:{c:"#10B981",g:"rgba(16,185,129,0.12)",l:"FULL SIZE",m:"All systems go. Execute CSTE plan.",i:"●"},AMBER:{c:"#F48C06",g:"rgba(244,140,6,0.12)",l:"HALF SIZE",m:"A+ setups only. Reduced size.",i:"◐"},RED:{c:"#E94560",g:"rgba(233,69,96,0.12)",l:"NO TRADE",m:"Walk away. Protect capital & progress.",i:"○"}};
  const fgc = gc[fg]; const dp = []; if(wg&&wg!=="GREEN") dp.push(`Whoop: ${wg}`); if(sg!=="GREEN") dp.push(`Schemas: ${sg}`);

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ padding: "32px 24px 0" }}>
        <BackButton onClick={onBack} />
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 3, color: "rgba(45,212,191,0.5)", fontWeight: 600 }}>SCHEMA AWARENESS</div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, marginTop: 3, color: "rgba(255,255,255,0.7)" }}>Mental Game Framework</div>
        </div>
        <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 4, position: "sticky", top: 0, zIndex: 100 }}>
          {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ flex:1, padding:"12px 4px", border:"none", borderRadius:13, cursor:"pointer", background:tab===t.id?(t.id==="dll"?"rgba(233,69,96,0.25)":"rgba(45,212,191,0.15)"):"transparent", color:tab===t.id?(t.id==="dll"?"#E94560":"#2DD4BF"):(t.id==="dll"?"rgba(233,69,96,0.4)":"rgba(255,255,255,0.25)"), fontFamily:"inherit", fontSize:12, fontWeight:tab===t.id?700:500, transition:"all 0.2s", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}><span style={{fontSize:16}}>{t.icon}</span>{t.label}</button>)}
        </div>
      </div>
      <div style={{ padding: "28px 20px 60px" }}>

        {tab === "schemas" && <div style={{ animation: "fadeIn 0.3s ease" }}>
          <p style={{ fontSize:15, color:"rgba(255,255,255,0.35)", lineHeight:1.7, marginBottom:22 }}>Your three core threat patterns. Tap to expand.</p>
          {Object.entries(SCHEMAS).map(([key, s]) => (
            <ExpandableCard key={key} item={{...s, iconColor: key==="standards"?"rgba(255,255,255,0.5)":"#fff"}} expanded={exp===key} onToggle={() => setExp(exp===key?null:key)}>
              {[{label:"Trigger",value:s.trigger},{label:"Core Belief",value:s.belief},{label:"Body Sensation",value:s.body}].map(r => <RuleBlock key={r.label} label={r.label} text={r.value} color={s.color} />)}
              <div style={{ marginTop:14, marginBottom:14 }}>
                <DashedLabel text="PATTERN INTERRUPTS" color={s.color} />
                {s.interrupts.map((int,i) => <AccentCard key={i} text={`"${int}"`} color={s.color} />)}
              </div>
              <HighlightBox label="PHYSICAL RESET" icon="⟐" text={s.reset} color={s.color} />
            </ExpandableCard>
          ))}
          <Card style={{ textAlign:"center", marginTop:28, marginBottom:18 }}><div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:10, letterSpacing:3, color:"rgba(255,255,255,0.5)", fontWeight:600, marginBottom:16 }}>THE CRITICAL QUESTION</div><div style={{ fontSize:17, fontWeight:600, fontStyle:"italic", lineHeight:1.7, color:"rgba(255,255,255,0.65)" }}>"What am I actually feeling right now, and how old does this feeling feel?"</div></Card>
          <div onClick={() => setNn(!nn)} style={{ background:nn?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.03)", borderRadius:22, border:nn?"1px solid rgba(255,255,255,0.1)":"1px solid rgba(255,255,255,0.08)", borderLeft:`3px solid ${nn?"#2DD4BF":"rgba(45,212,191,0.4)"}`, marginBottom:16, overflow:"hidden", cursor:"pointer", transition:"all 0.3s ease" }}>
            <div style={{ padding:"20px 22px", display:"flex", alignItems:"center", justifyContent:"space-between" }}><div><div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:12, fontWeight:700, letterSpacing:2, color:"rgba(255,255,255,0.6)" }}>MY NON-NEGOTIABLES</div>{!nn && <div style={{ fontSize:14, color:"rgba(255,255,255,0.3)", marginTop:4, fontWeight:500 }}>The truths that protect my dreams</div>}</div><div style={{ width:32, height:32, borderRadius:10, background:"rgba(255,255,255,0.05)", display:"flex", alignItems:"center", justifyContent:"center", transform:nn?"rotate(180deg)":"rotate(0deg)", transition:"transform 0.3s ease", color:"rgba(255,255,255,0.3)", fontSize:13 }}>▼</div></div>
            {nn && <div style={{ padding:"0 22px 22px", animation:"fadeIn 0.25s ease" }} onClick={e=>e.stopPropagation()}><div style={{ height:1, background:"rgba(255,255,255,0.06)", marginBottom:18 }} />{NON_NEGOTIABLES.map((r,i) => <div key={i} style={{ padding:"14px 0", borderBottom:i<5?"1px solid rgba(255,255,255,0.04)":"none", fontSize:16, color:"rgba(255,255,255,0.7)", lineHeight:1.6, fontWeight:500 }}>{r}</div>)}</div>}
          </div>
        </div>}

        {tab === "checkin" && <div style={{ animation:"fadeIn 0.3s ease" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}><SectionLabel text="Pre-Session Check-In" /><span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:12, color:"rgba(255,255,255,0.2)" }}>{todayKey()}</span></div>
          <Card style={{ marginBottom:18 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}><SectionLabel text="Whoop Scores" color="#10B981" />{wg && <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:11, fontWeight:700, letterSpacing:1.5, padding:"5px 12px", borderRadius:8, background:`${gateColor(wg)}15`, color:gateColor(wg), border:`1px solid ${gateColor(wg)}33` }}>{wg}</span>}</div>
            <div style={{ display:"flex", gap:14, marginBottom:18 }}>
              {[["Sleep Score",ws,v=>{setWs(v);setCs(false);}],["Recovery Score",wr,v=>{setWr(v);setCs(false);}]].map(([l,v,fn]) => <div key={l} style={{flex:1}}><label style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.4)",display:"block",marginBottom:8}}>{l}</label><div style={{position:"relative"}}><input type="number" min={0} max={100} value={v} onChange={e=>fn(e.target.value)} placeholder="—" style={{width:"100%",padding:"16px 44px 16px 16px",borderRadius:14,border:`1px solid ${v?`${gateColor(wg)}44`:"rgba(255,255,255,0.08)"}`,fontSize:26,fontFamily:"'JetBrains Mono', monospace",fontWeight:700,background:v?`${gateColor(wg)}08`:"rgba(255,255,255,0.04)",color:v?gateColor(wg):"rgba(255,255,255,0.3)",boxSizing:"border-box",outline:"none",textAlign:"center"}} /><span style={{position:"absolute",right:16,top:"50%",transform:"translateY(-50%)",fontSize:15,color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono', monospace"}}>%</span></div></div>)}
            </div>
            <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:12, padding:14, fontSize:12, color:"rgba(255,255,255,0.25)", lineHeight:2, fontFamily:"'JetBrains Mono', monospace" }}><div><span style={{color:"#10B981"}}>●</span> Sleep ≥80% + Recovery ≥70% → Full Size</div><div><span style={{color:"#F48C06"}}>●</span> Sleep 70–79% or Recovery 55–69% → Half Size</div><div><span style={{color:"#E94560"}}>●</span> Sleep &lt;70% or Recovery &lt;55% → No Trade</div></div>
          </Card>
          <Card style={{ marginBottom:18 }}><SectionLabel text="Readiness" color="rgba(255,255,255,0.25)" />{["Eaten properly & hydrated","Exercised or moved today"].map((item,i) => <div key={i} onClick={()=>{const n=[...oc];n[i]=!n[i];setOc(n);setCs(false);}} style={{display:"flex",alignItems:"center",gap:16,padding:"14px 0",borderBottom:i===0?"1px solid rgba(255,255,255,0.04)":"none",cursor:"pointer",fontSize:16,color:oc[i]?"#10B981":"rgba(255,255,255,0.5)",userSelect:"none"}}><div style={{width:28,height:28,borderRadius:9,flexShrink:0,border:oc[i]?"none":"2px solid rgba(255,255,255,0.12)",background:oc[i]?"linear-gradient(135deg, #10B981, #059669)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"#fff"}}>{oc[i]?"✓":""}</div>{item}</div>)}</Card>
          <Card style={{ marginBottom:18 }}><SectionLabel text="Emotional Baseline" color="#4361EE" /><p style={{fontSize:14,color:"rgba(255,255,255,0.25)",marginBottom:22,lineHeight:1.6}}>Score ≥5 means significantly lower threshold for schema activation.</p>
            {CHECKIN_QUESTIONS.map((item,i) => { const v=ss[i]; const color=v>5?"#E94560":v>3?"#F48C06":"#10B981"; return <div key={i} style={{marginBottom:22}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><span style={{fontSize:15,color:"rgba(255,255,255,0.6)",flex:1}}>{item.q}</span><span style={{fontFamily:"'JetBrains Mono', monospace",fontSize:11,color:"rgba(255,255,255,0.2)",marginRight:14,letterSpacing:1}}>{item.schema}</span><span style={{fontFamily:"'JetBrains Mono', monospace",fontWeight:700,fontSize:22,color,width:40,textAlign:"center"}}>{v}</span></div><div style={{position:"relative"}}><div style={{position:"absolute",top:"50%",left:0,right:0,height:5,borderRadius:3,background:"rgba(255,255,255,0.06)",transform:"translateY(-50%)"}} /><div style={{position:"absolute",top:"50%",left:0,width:`${v*10}%`,height:5,borderRadius:3,background:color,transform:"translateY(-50%)",transition:"all 0.15s"}} /><input type="range" min={0} max={10} value={v} onChange={e=>{const n=[...ss];n[i]=parseInt(e.target.value);setSs(n);setCs(false);}} style={{width:"100%",background:"transparent",position:"relative",zIndex:2,WebkitAppearance:"none",appearance:"none",height:24}} /></div></div>; })}
            <div style={{background:fgc.g,borderRadius:18,padding:28,textAlign:"center",border:`1px solid ${fgc.c}33`,marginTop:28}}><div style={{fontSize:40,marginBottom:6,filter:`drop-shadow(0 0 12px ${fgc.c})`,color:fgc.c}}>{fgc.i}</div><div style={{fontFamily:"'JetBrains Mono', monospace",fontWeight:700,fontSize:36,color:fgc.c,letterSpacing:4}}>{fg}</div><div style={{fontFamily:"'JetBrains Mono', monospace",fontWeight:600,fontSize:12,color:fgc.c,marginTop:6,letterSpacing:2,opacity:0.8}}>{fgc.l}</div><div style={{fontSize:15,color:"rgba(255,255,255,0.45)",marginTop:12}}>{fgc.m}</div>{dp.length>0&&<div style={{fontSize:12,color:"rgba(255,255,255,0.25)",marginTop:10,fontFamily:"'JetBrains Mono', monospace"}}>Driven by: {dp.join(" + ")}</div>}</div>
          </Card>
          <SaveButton saved={cs} onClick={saveCheckin} label="Save Check-In" />
        </div>}

        {tab === "activation" && <div style={{ animation:"fadeIn 0.3s ease" }}>
          <p style={{fontSize:15,color:"rgba(255,255,255,0.35)",lineHeight:1.7,marginBottom:22}}>Pausing to fill this in <em>is</em> the intervention.</p>
          <Card style={{marginBottom:18}}><SectionLabel text="New Activation" color="#E94560" />
            {[{key:"time",label:"Time",placeholder:"e.g. 10:32 AM"},{key:"happened",label:"What happened?",placeholder:"Price action, P&L change..."},{key:"feeling",label:"What am I feeling?",placeholder:"Fear, anger, urgency..."},{key:"bodyLocation",label:"Where in my body?",placeholder:"Chest, stomach, jaw..."},{key:"urge",label:"The urge?",placeholder:"Close, move SL, unlock DLL..."},{key:"schema",label:"Which schema fired?",type:"select",options:["Abandonment","Defectiveness","Unrelenting Standards"]},{key:"cascadeFrom",label:"Did another schema fire first?",type:"select",options:["No — this was the first","Abandonment triggered it","Defectiveness triggered it","Standards triggered it"]},{key:"howOld",label:"How old does this feel?",placeholder:"This trade, or deeper?"},{key:"interrupt",label:"Pattern interrupt used",placeholder:"Write your phrase..."},{key:"outcome",label:"What did I do?",type:"select",options:["Followed plan","Deviated"]}].map(f => <InputField key={f.key} label={f.label} value={al[f.key]} onChange={v=>setAl({...al,[f.key]:v})} type={f.type} options={f.options} placeholder={f.placeholder} />)}
            <button onClick={saveAct} disabled={!al.feeling} style={{width:"100%",padding:18,border:"none",borderRadius:16,background:al.feeling?"linear-gradient(135deg, #E94560, #C62A47)":"rgba(255,255,255,0.05)",color:al.feeling?"#fff":"rgba(255,255,255,0.2)",fontSize:16,fontWeight:700,cursor:al.feeling?"pointer":"default",fontFamily:"inherit"}}>Log Activation</button>
          </Card>
          {sa.length>0&&<Card><SectionLabel text={`Today's Activations (${sa.length})`} color="#E94560" />{sa.map((a,i) => <div key={i} style={{padding:"16px 0",borderBottom:i<sa.length-1?"1px solid rgba(255,255,255,0.04)":"none",fontSize:15}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}><span style={{fontFamily:"'JetBrains Mono', monospace",fontWeight:600,fontSize:13,color:"rgba(255,255,255,0.6)"}}>{a.time||"—"}</span><span style={{fontSize:11,padding:"4px 12px",borderRadius:8,fontWeight:600,fontFamily:"'JetBrains Mono', monospace",background:a.outcome==="Followed plan"?"rgba(16,185,129,0.15)":"rgba(233,69,96,0.15)",color:a.outcome==="Followed plan"?"#10B981":"#E94560"}}>{a.outcome||"—"}</span></div><div style={{color:"rgba(255,255,255,0.5)"}}><strong style={{color:"rgba(255,255,255,0.7)"}}>{a.schema}</strong> — {a.feeling}</div>{a.cascadeFrom&&a.cascadeFrom!=="No — this was the first"&&<div style={{fontSize:12,color:"rgba(255,255,255,0.3)",marginTop:4,fontFamily:"'JetBrains Mono', monospace"}}>CASCADE: {a.cascadeFrom}</div>}{a.interrupt&&<div style={{color:"rgba(255,255,255,0.3)",fontStyle:"italic",marginTop:5,fontSize:14}}>"{a.interrupt}"</div>}</div>)}</Card>}
        </div>}

        {tab === "dll" && <div style={{ animation:"fadeIn 0.3s ease" }}>
          <div style={{textAlign:"center",marginBottom:28}}><div style={{fontFamily:"'JetBrains Mono', monospace",fontSize:11,letterSpacing:3,color:"#E94560",fontWeight:600,marginBottom:10}}>CIRCUIT BREAKER</div><div style={{fontSize:18,fontWeight:700,color:"rgba(255,255,255,0.7)"}}>DLL Unlock Protocol</div><div style={{fontSize:15,color:"rgba(255,255,255,0.3)",marginTop:8,lineHeight:1.6}}>Work through each step before making any decision.</div></div>
          <DLLBreaker onLog={logDll} />
          {dl.length>0&&<Card style={{marginTop:24}}><SectionLabel text={`Today's DLL Events (${dl.length})`} color="#E94560" />{dl.map((d,i) => <div key={i} style={{padding:"14px 0",borderBottom:i<dl.length-1?"1px solid rgba(255,255,255,0.04)":"none",fontSize:15}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{color:"rgba(255,255,255,0.5)"}}>{d.schema||"—"}</span><span style={{fontSize:11,padding:"4px 12px",borderRadius:8,fontWeight:600,fontFamily:"'JetBrains Mono', monospace",background:d.keptLocked?"rgba(16,185,129,0.15)":"rgba(233,69,96,0.15)",color:d.keptLocked?"#10B981":"#E94560"}}>{d.keptLocked?(d.changedMind?"CHANGED MIND":"KEPT LOCKED"):"UNLOCKED"}</span></div></div>)}</Card>}
        </div>}

        {tab === "post" && <div style={{animation:"fadeIn 0.3s ease"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}><SectionLabel text="Post-Session Review" /><span style={{fontFamily:"'JetBrains Mono', monospace",fontSize:12,color:"rgba(255,255,255,0.2)"}}>{todayKey()}</span></div><Card>{POST_SESSION_FIELDS.map(f => <InputField key={f.key} label={f.label} value={ps[f.key]} onChange={v=>{setPs({...ps,[f.key]:v});setPss(false);}} type={f.type} options={f.options} />)}<SaveButton saved={pss} onClick={savePost} label="Save Review" /></Card></div>}

        {tab === "weekly" && <div style={{animation:"fadeIn 0.3s ease"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}><SectionLabel text="Weekly Reflection" /><span style={{fontFamily:"'JetBrains Mono', monospace",fontSize:12,color:"rgba(255,255,255,0.2)"}}>{weekKey()}</span></div><Card>{WEEKLY_QUESTIONS.map((q,i) => <InputField key={i} label={q} value={wrev[`q${i}`]} type="textarea" rows={2} onChange={v=>{setWrev({...wrev,[`q${i}`]:v});setWrs(false);}} />)}<SaveButton saved={wrs} onClick={saveWeek} label="Save Weekly Reflection" /></Card></div>}

        {tab === "history" && <div style={{animation:"fadeIn 0.3s ease"}}><SectionLabel text="Session History" />
          {hk.length===0?<Card style={{textAlign:"center",padding:52}}><div style={{fontSize:40,marginBottom:14,opacity:0.3}}>◫</div><div style={{color:"rgba(255,255,255,0.25)",fontSize:16}}>No sessions logged yet.</div></Card>:<>
            <div style={{display:"flex",flexWrap:"wrap",gap:10,marginBottom:22}}>{hk.map(d => <button key={d} onClick={()=>loadHist(d)} style={{padding:"10px 16px",borderRadius:12,cursor:"pointer",border:sh===d?"1px solid rgba(45,212,191,0.4)":"1px solid rgba(255,255,255,0.06)",background:sh===d?"rgba(45,212,191,0.1)":"rgba(255,255,255,0.03)",fontSize:13,fontFamily:"'JetBrains Mono', monospace",fontWeight:sh===d?700:400,color:sh===d?"#2DD4BF":"rgba(255,255,255,0.35)"}}>{formatDate(d)}</button>)}</div>
            {hd&&<div>
              {hd.checkin&&<Card style={{marginBottom:14}}><SectionLabel text="Pre-Session" color="#4361EE" /><div style={{fontSize:15,color:"rgba(255,255,255,0.5)",lineHeight:2.2}}>{hd.checkin.whoopSleep&&<div><strong style={{color:"rgba(255,255,255,0.7)"}}>Whoop:</strong> Sleep {hd.checkin.whoopSleep}% · Recovery {hd.checkin.whoopRecovery}%{hd.checkin.whoopGate&&<span style={{color:gateColor(hd.checkin.whoopGate),fontFamily:"'JetBrains Mono', monospace",fontWeight:700,marginLeft:10}}>{hd.checkin.whoopGate}</span>}</div>}<div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><strong style={{color:"rgba(255,255,255,0.7)"}}>Schema Scores:</strong>{hd.checkin.schemaScores?.map((s,i) => <span key={i} style={{fontFamily:"'JetBrains Mono', monospace",fontWeight:700,color:s>5?"#E94560":s>3?"#F48C06":"#10B981"}}>{s}</span>)}</div></div></Card>}
              {hd.activations?.length>0&&<Card style={{marginBottom:14}}><SectionLabel text={`Activations (${hd.activations.length})`} color="#E94560" />{hd.activations.map((a,i) => <div key={i} style={{padding:"12px 0",borderBottom:i<hd.activations.length-1?"1px solid rgba(255,255,255,0.04)":"none",fontSize:15}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontFamily:"'JetBrains Mono', monospace",fontSize:12,color:"rgba(255,255,255,0.4)"}}>{a.time}</span><span style={{fontSize:11,color:a.outcome==="Followed plan"?"#10B981":"#E94560",fontFamily:"'JetBrains Mono', monospace",fontWeight:600}}>{a.outcome}</span></div><div style={{color:"rgba(255,255,255,0.5)",marginTop:3}}><strong style={{color:"rgba(255,255,255,0.6)"}}>{a.schema}</strong> — {a.feeling}</div>{a.cascadeFrom&&a.cascadeFrom!=="No — this was the first"&&<div style={{fontSize:12,color:"rgba(255,255,255,0.25)",marginTop:3,fontFamily:"'JetBrains Mono', monospace"}}>CASCADE: {a.cascadeFrom}</div>}</div>)}</Card>}
              {hd.dll?.length>0&&<Card style={{marginBottom:14}}><SectionLabel text={`DLL Events (${hd.dll.length})`} color="#E94560" />{hd.dll.map((d,i) => <div key={i} style={{padding:"12px 0",borderBottom:i<hd.dll.length-1?"1px solid rgba(255,255,255,0.04)":"none",fontSize:15}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"rgba(255,255,255,0.5)"}}>{d.schema||"—"}</span><span style={{fontSize:11,fontFamily:"'JetBrains Mono', monospace",fontWeight:600,color:d.keptLocked?"#10B981":"#E94560"}}>{d.keptLocked?"LOCKED":"UNLOCKED"}</span></div></div>)}</Card>}
              {hd.post&&<Card><SectionLabel text="Post-Session" color="#F48C06" />{POST_SESSION_FIELDS.filter(f=>hd.post[f.key]).map(f => <div key={f.key} style={{marginBottom:12,fontSize:15}}><span style={{color:"rgba(255,255,255,0.4)"}}>{f.label}: </span><span style={{color:"rgba(255,255,255,0.65)"}}>{hd.post[f.key]}</span></div>)}</Card>}
            </div>}
          </>}
        </div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════

export default function App() {
  const [page, setPage] = useState("landing");

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", background: "#0A0A0F", minHeight: "100vh", width: "100%", maxWidth: 768, margin: "0 auto", color: "#fff" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type="range"] { -webkit-appearance: none; appearance: none; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 26px; height: 26px; border-radius: 50%; background: #fff; cursor: pointer; border: none; box-shadow: 0 2px 8px rgba(0,0,0,0.4); }
        input[type="number"] { -moz-appearance: textfield; }
        input[type="number"]::-webkit-outer-spin-button, input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        textarea:focus, input:focus, select:focus { outline: none; border-color: rgba(45,212,191,0.4) !important; box-shadow: 0 0 0 3px rgba(45,212,191,0.08); }
        ::-webkit-scrollbar { width: 0; height: 0; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      {page === "landing" && <LandingPage onNavigate={setPage} />}
      {page === "mental" && <MentalGameFramework onBack={() => setPage("landing")} />}
      {page === "fundamentals" && <MarketFundamentals onBack={() => setPage("landing")} />}
    </div>
  );
}
