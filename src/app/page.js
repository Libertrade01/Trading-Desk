"use client";
import { storage } from "../lib/supabase";
import { useState, useEffect, useCallback } from "react";

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
  abandonment: { name: "Abandonment", subtitle: "Grab It Before It's Gone", color: "#E94560", gradient: "linear-gradient(135deg, #E94560 0%, #C62A47 100%)", bg: "rgba(233,69,96,0.06)", icon: "⚡", trigger: "Unrealised profit on an open position. A winner that starts to pull back. The urge to move stop loss to breakeven prematurely. An imperfect entry making me feel like the trade doesn't deserve to run.", belief: "Good things get taken away. Encoded at survival level from past losses. Your nervous system remembers even when your mind moves on.", body: "Chest tightness, urgency, restless hands hovering over close button or SL.", interrupts: ["A good entry taken beats a perfect entry missed.", "Stop loss should not be moved until I am prepared to take profit. My system is managing risk.", "Grabbing profit early is my fear talking, not my system.", "I let the market do the heavy lifting.", "Bigger balls = Bigger results."], reset: "Hands off keyboard. Three slow breaths. Feel your feet on the floor. You are safe." },
  defectiveness: { name: "Defectiveness", subtitle: "I Have to Prove Myself", color: "#4361EE", gradient: "linear-gradient(135deg, #4361EE 0%, #3A0CA3 100%)", bg: "rgba(67,97,238,0.06)", icon: "🛡", trigger: "A loss, multiple losses, hitting DLL. Feeling like you made a mistake.", belief: "Losses confirm I'm not adequate. This fires in relationships too, especially when feeling unappreciated.", body: "Heat in face/chest, jaw tightening, compulsive drive to re-enter immediately.", interrupts: ["A loss is a cost of business, not evidence of who I am.", "The DLL exists to protect me. Respecting it IS the professional move.", "Revenge trading has never once made me feel better.", "Walking away right now is the strongest thing I can do."], reset: "Stand up. Walk away for 5 minutes. Splash cold water on your face." },
  standards: { name: "Unrelenting Standards", subtitle: "It Has to Be Perfect", color: "#F48C06", gradient: "linear-gradient(135deg, #F48C06 0%, #DC6C02 100%)", bg: "rgba(244,140,6,0.06)", icon: "△", trigger: "Feeling like my entry wasn't perfect enough. Wanting the exact top or bottom instead of accepting a good A+ setup. Staying on the charts because I haven't hit a P&L number that feels 'good enough'.", belief: "Anything less than perfect isn't good enough. This drives overtrading, chasing, and refusing to walk away from the screen.", body: "Inability to step away from charts, restlessness, the feeling that I need to do more or stay longer to prove today was worth it.", interrupts: ["A+ is the standard. Not perfect. A+ builds accounts.", "Picking tops and bottoms is picking a fight I will lose.", "Conserve mental capital. Perform better. Be selective.", "My P&L does not define my worth or my session quality."], reset: "Close the 1-minute chart. Zoom out. Look at the higher timeframe trend." },
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
  { key: "dllOutcome", label: "DLL outcome", type: "select", options: ["No urges", "Used breaker, stayed locked", "Unlocked", "N/A"] },
  { key: "usedInterrupts", label: "Used pattern interrupts?", type: "select", options: ["Yes", "No", "Partially"] },
  { key: "interruptsWorked", label: "Did they work?", type: "select", options: ["Yes", "No", "Partially", "N/A"] },
  { key: "deviated", label: "Deviated from CSTE?", type: "select", options: ["Yes", "No"] }, { key: "deviationSchema", label: "If deviated, which schema?" },
  { key: "bestMoment", label: "Best moment" }, { key: "worstMoment", label: "Worst moment" }, { key: "reflection", label: "Key insight", type: "textarea" },
];

const WEEKLY_QUESTIONS = ["Which schema was most active this week?", "Most common cascade pattern this week?", "How many DLL urges? Did the circuit breaker help?", "On my worst day, what was my pre-session emotional state?", "Sessions where I was activated but followed plan? (These are wins)", "P&L on GREEN vs AMBER vs RED days?", "Patterns activating me outside of trading?", "One thing I'll change next week?"];

const DLL_STEPS = [
  { title: "STOP", subtitle: "Do not touch the DLL yet.", prompt: "What just happened that made me want to unlock?", key: "whatHappened", type: "text" },
  { title: "FEEL", subtitle: "Name what's happening inside you.", prompt: "What am I feeling right now?", key: "feeling", type: "select", options: ["Anger at a loss", "Need to prove myself", "Frustration, I know I'm better than this", "Desperation to recover", "Numbness, I've stopped caring", "Other"] },
  { title: "IDENTIFY", subtitle: "Which schema is driving this?", prompt: "This urge is being driven by:", key: "schema", type: "select", options: ["Defectiveness: I need to prove I'm not a failure", "Abandonment: I need to get back what was taken", "Standards: I can't accept ending the day like this"] },
  { title: "REMEMBER", subtitle: "These are your own words.", prompt: null, key: "remember", type: "affirmations" },
  { title: "DECIDE", subtitle: "Make a conscious choice.", prompt: "Having read all of this, I choose to:", key: "decision", type: "select", options: ["Keep DLL locked. Walk away and protect my dreams", "Keep DLL locked. I'll come back tomorrow stronger", "Unlock DLL. I acknowledge I am breaking my own rules"] },
];

const DLL_AFFIRMATIONS = ["Disrespecting and unlocking DLL means I am intentionally breaking my own dreams.", "The DLL exists to protect me from this exact moment.", "Revenge trading has never once made me feel better. It has only ever made the day worse.", "Walking away right now is the strongest thing I can do.", "My large drawdown days come from this exact decision.", "Not following my system means I'm not following my dreams."];

const NON_NEGOTIABLES = ["Breaking my rules means I am intentionally breaking my own dreams.", "Not following my system means I'm not following my dreams.", "Picking tops & bottoms is picking a fight I'm likely to lose.", "Moving to BE out of fear is choosing comfort over conviction.", "Distractions while trading rob me of my progress.", "Trading my PnL means long term Probably Lose."];

const conceptColor = "#8B95A8";
const conceptGrad = "linear-gradient(135deg, #8B95A8 0%, #6B7280 100%)";
const conceptBg = "rgba(139,149,168,0.04)";

const AMT_CONCEPTS = {
  priceAboveValue: { name: "Price Above Value", subtitle: "Buyers are aggressive, but for how long?", color: conceptColor, gradient: conceptGrad, bg: conceptBg, icon: "↑", group: "core",
    rules: [{ label: "Core Principle", text: "When price trades above the value area, the market is probing for new buyers at higher prices. Sellers see opportunity, buyers are paying a premium." }, { label: "What to Expect", text: "If new buyers continue to enter at these higher prices, value migrates up. This is acceptance. If volume dries up and price falls back into the value area, it was a failed probe. This is rejection." }, { label: "Key Signal", text: "Watch for responsive sellers stepping in. If price stays above value but volume drops, the auction is running out of buyers. Gravity pulls price back to value." }],
    action: "If long: trail and manage. You're in profit territory but the edge is thinning. If flat: don't chase. Wait for either acceptance (value migration) or rejection (fade back to POC).",
    caution: "Buying above value is paying a premium. The further from value, the higher the odds of mean reversion. Responsive sellers live here." },
  priceBelowValue: { name: "Price Below Value", subtitle: "Sellers are aggressive, but for how long?", color: conceptColor, gradient: conceptGrad, bg: conceptBg, icon: "↓", group: "core",
    rules: [{ label: "Core Principle", text: "When price trades below the value area, the market is probing for new sellers at lower prices. Buyers see opportunity, sellers are accepting lower prices." }, { label: "What to Expect", text: "If new sellers continue to enter at these lower prices, value migrates down. This is acceptance. If volume dries up and price returns to the value area, it was a failed probe and rejection." }, { label: "Key Signal", text: "Watch for responsive buyers stepping in. If price stays below value but selling pressure fades, the auction is exhausting sellers. Price gets pulled back to value." }],
    action: "If short: trail and manage. You're in profit territory. If flat: don't chase the sell. Wait for acceptance (value migrating down) or rejection (bounce back to POC).",
    caution: "Selling below value is selling at a discount. Responsive buyers are looking for entries here. The further from value, the stronger the pull back." },
  balance: { name: "Balance", subtitle: "The market has found agreement", color: conceptColor, gradient: conceptGrad, bg: conceptBg, icon: "⊜", group: "core",
    rules: [{ label: "Core Principle", text: "Balance means the market has found a fair price. Both buyers and sellers are satisfied at this level. Price rotates around the Point of Control within a defined range." }, { label: "What to Expect", text: "Price oscillates between the value area high and low. Breakout attempts fail and get absorbed. Volume concentrates around POC. This is the market building energy for the next move." }, { label: "Key Signal", text: "Narrowing range and declining volume signal the balance is maturing. The longer the balance, the more significant the eventual breakout. Time in balance = energy for imbalance." }],
    action: "Trade the edges of the range. Buy near VAL with stops below, sell near VAH with stops above. Target POC. Do NOT try to pick the breakout direction. Let the market show you.",
    caution: "This is where consolidation chops you up. Your January review said it. Do not engage with price action when consolidating unless you're trading the edges with a plan." },
  imbalance: { name: "Imbalance", subtitle: "One side has taken control", color: conceptColor, gradient: conceptGrad, bg: conceptBg, icon: "⇶", group: "core",
    rules: [{ label: "Core Principle", text: "Imbalance means the market has left fair value. One side (buyers or sellers) has overwhelmed the other. Price moves directionally as the market searches for a new level of agreement." }, { label: "What to Expect", text: "Elongated profiles, single prints, poor structure. Price moves with conviction and pullbacks are shallow. The market is migrating value, not rotating within it." }, { label: "Key Signal", text: "Initiative activity, meaning participants trading away from value, not back to it. Volume confirms: high volume on the move, low volume on pullbacks. This is trend." }],
    action: "Trade with the imbalance, not against it. Enter on pullbacks to developing value, not at the extremes. This is where your trend filter alignment matters most. Your biggest wins come from riding imbalance.",
    caution: "Do NOT pick tops and bottoms during imbalance. Against trend filters & strong tape was your biggest loss category. The market will tell you when imbalance ends. You don't need to predict it." },
  failedAuction: { name: "Failed Auction", subtitle: "The probe was rejected", color: conceptColor, gradient: conceptGrad, bg: conceptBg, icon: "⟲", group: "core",
    rules: [{ label: "Core Principle", text: "A failed auction occurs when price probes a direction, makes a new high or low, but fails to attract continuation. The lack of follow-through traps participants and reverses." }, { label: "What to Expect", text: "Sharp rejection from the extreme. Excess prints (single TPOs at the high/low). Volume spike at the extreme followed by aggressive reversal. Trapped traders fuel the move back." }, { label: "Key Signal", text: "The auction needs two things to succeed: price discovery AND participation. If price reaches a new level but nobody follows, the auction fails. Look for: poor high/low (no excess), single prints, quick rejection." }],
    action: "Failed auctions create high-probability reversal entries. The trap provides the fuel. Enter on confirmation of failure (price re-entering the prior range) with a stop beyond the failed extreme.",
    caution: "Confirmation is everything. A probe is not a failed auction until it fails. Don't front-run the failure. That's picking tops and bottoms. Wait for the rejection to confirm, then act." },
  acceptance: { name: "Acceptance vs Rejection", subtitle: "Is the new price level real?", color: conceptColor, gradient: conceptGrad, bg: conceptBg, icon: "⇌", group: "core",
    rules: [{ label: "Acceptance", text: "Price spends time at the new level. Volume builds. TPOs accumulate. The market is saying: 'This is fair.' Value area begins to shift. When you see acceptance, the old value area becomes less relevant. Trade the new developing value." }, { label: "Rejection", text: "Price touches the new level but doesn't stay. Volume is thin. Single prints. Quick snap back to prior value. The market is saying: 'No, this isn't fair.' When you see rejection, the prior value area remains the magnet." }, { label: "How to Tell the Difference", text: "Time and volume. Acceptance = time at the level + volume building. Rejection = brief visit + volume drying up. If you're unsure, you're probably looking at rejection. Acceptance is obvious when it's happening." }],
    action: "Acceptance: trade in the direction of the new value. The breakout is real. Rejection: fade back to the prior value area. The breakout failed.",
    caution: "Don't decide too early. Give the auction time to show you. Jumping in before acceptance/rejection is confirmed is gambling, not trading. Patience here directly protects your capital." },

  initiativeResponsive: { name: "Initiative vs Responsive", subtitle: "Who is driving the auction?", color: conceptColor, gradient: conceptGrad, bg: conceptBg, icon: "⥃", group: "reading",
    rules: [{ label: "Responsive Activity", text: "Responsive participants trade back toward value. Responsive sellers appear above VAH because they believe price is too high and will return. Responsive buyers appear below VAL because they see a discount. Responsive activity is mean-reversion behavior. It maintains the existing balance and keeps price rotating within the value area." }, { label: "Initiative Activity", text: "Initiative participants trade away from value. Initiative buying above VAH means new buyers are willing to pay a premium and drive price further from fair value. Initiative selling below VAL means sellers are pushing aggressively for lower prices. Initiative activity is trend behavior. It breaks the existing balance and creates imbalance." }, { label: "Reading the Shift", text: "When responsive activity dominates, the value area holds. Trade the range. When initiative takes over, value migrates. Trade with the direction. The critical read: if price is above VAH and volume is building (not fading), that's initiative buying. Don't fade it. If price is above VAH but volume thins and price stalls, responsive sellers are winning. Fade back to value." }],
    action: "Identify which type of activity is dominant. Responsive = trade the range, target POC, fade the edges. Initiative = trade with the move, enter on pullbacks, don't fight the direction.",
    caution: "Fading initiative activity is one of the most costly mistakes in trading. If the market is moving away from value with conviction and volume, stepping in front of it is not a high-probability trade. It's a gamble on a reversal that hasn't happened yet." },

  auctionRotations: { name: "Auction Rotations & Excess", subtitle: "How auctions complete", color: conceptColor, gradient: conceptGrad, bg: conceptBg, icon: "↻", group: "reading",
    rules: [{ label: "How Auctions End", text: "Price probes in one direction until it runs out of willing participants at that level, then reverses. The turning point creates excess, visible as single prints or buying/selling tails at the profile extremes. Excess means the auction in that direction is complete. The market found the boundary and turned away." }, { label: "Poor Highs & Poor Lows", text: "A poor high or poor low has no excess. The profile edge is flat, with no tail or single prints. This means the auction was interrupted before it completed. The market has unfinished business in that direction and is likely to return to probe further. Poor structure means an incomplete auction and a future directional target." }, { label: "Pre-Session Read", text: "Check yesterday's profile. Excess at both the high and low? Both auctions completed. Expect a balanced, rotational day. Poor high with excess low? Unfinished business above, so directional bias is up. Poor low with excess high? Unfinished business below, so directional bias is down. This is one of the most reliable pre-session prep tools." }],
    action: "Use excess and poor structure as part of daily preparation. A poor high or low gives you a directional bias before the session opens. When the market confirms that bias with early initiative activity, you have a high-conviction trade.",
    caution: "Poor structure creates a directional bias, not a guarantee. The market may need multiple sessions to revisit unfinished business. Use it as context, not as a trigger. Let the live auction confirm the bias before committing." },

  valueAreaMigration: { name: "Value Area Migration", subtitle: "How value shifts session to session", color: conceptColor, gradient: conceptGrad, bg: conceptBg, icon: "⇥", group: "reading",
    rules: [{ label: "Higher Value", text: "Today's value area is entirely above yesterday's. This signals bullish migration. The market has repriced higher and both buyers and sellers agree that fair value has moved up. This is trend continuation. The stronger and more consistent the migration across multiple sessions, the stronger the trend." }, { label: "Lower Value", text: "Today's value area is entirely below yesterday's. Bearish migration. Fair value has shifted down. Sellers are in control and the market is accepting lower prices. As with higher value migration, consistency across sessions confirms the trend." }, { label: "Overlapping Value", text: "Today's value area overlaps with yesterday's. The market hasn't committed to a new level. Balance continues. This is the most common scenario. The degree of overlap matters: slight overlap suggests the market is testing a move, heavy overlap means it's going nowhere. When value areas stack on top of each other across sessions, the market is building a larger balance area." }, { label: "Rate of Migration", text: "How fast value migrates tells you about trend strength. Rapid migration with gaps between value areas = strong trend with high conviction. Gradual migration with overlapping areas = grinding trend that could stall or reverse. No migration = range-bound, wait for a catalyst." }],
    action: "Compare value areas as part of daily prep before the session. Migration direction tells you which side to favour. Migration rate tells you how aggressively to position. If value is migrating, only look for trades in the direction of migration.",
    caution: "Value migration is a lagging indicator. It confirms what happened, not what will happen. A trend that has been migrating for many sessions may be approaching exhaustion. Always combine migration analysis with live auction reads (initiative vs responsive, excess) for the full picture." },

  profileShapes: { name: "Profile Shapes & Day Types", subtitle: "Reading the session's story", color: conceptColor, gradient: conceptGrad, bg: conceptBg, icon: "◨", group: "reading",
    rules: [{ label: "D-Shape: Balance / Rotational", text: "A normal distribution, fat in the middle and thin at the extremes. The market found fair value and rotated around it. An indecisive market with no buyers at the highs and no sellers at the lows. Prices below VAL are too cheap to sell, prices above VAH are too expensive to buy. Two-way trade dominates with a lack of imbalances. VWAP remains fairly flat throughout the session. Price is choppy in these conditions so execute at the edges and be patient. Target the middle of the range for take-profit and the opposite side of the range for runners." },
      { label: "P-Shape: Grind / Melt Up", text: "The market auctioned lower early in the session (the tail of the P), found responsive buyers, then rallied and spent most of its time building volume in the upper range (the bulge of the P). Strong imbalance up from the open which holds. Price pushes higher with every move, building volume to the upside, signalling buyers continue to be rewarded and shorts are off the table. Pullbacks tend to be shallow. Even though it feels like buying high in the moment, buyers tend to be rewarded. The best trades are buying every pullback until the volume structure breaks. With no trapped buy volume, the market has no fuel to move down. Do not attempt to pick a high or force a short. This is a recipe for hitting your daily loss limit. Be patient and frame longs until there is a clear break in volume structure leaving buyers offside." },
      { label: "b-Shape: Liquidation / Sell Off", text: "The market rallied early (the tail of the b), found responsive sellers, then sold off with volume building in the lower range (the bulge of the b). Unlike grind-up days which are slow with shallow pullbacks, liquidations tend to be fast-moving with violent whips and bounces. The bounces can be very strong, strong enough to mistakenly flip bullish bias before the market shows any real change in structure. The market continually sequences lower highs and lower lows. Short covering rallies are easily misinterpreted as aggressive new buying, but once the selling imbalance is neutralised, the market often resumes its prior downward course. This creates opportunities to sell into the bounce. Shorting is inherently difficult. Be conservative, lock in profits earlier, and be prepared for squeezes. The market's natural tendency leans long and most participants instinctively try to pick bottoms, which is one of the fastest ways to blow through a daily loss limit. Risk-taking is deeply wired through fight-or-flight mechanisms, making self-awareness of your physiological state crucial in fast-moving markets." },
      { label: "Double Distribution", text: "Two distinct value areas in the same session connected by a thin bridge of single prints. The market shifted from one fair price to another, which is a strong directional signal. This typically happens around a catalyst (news, data release, large institutional order) that causes the market to rapidly reprice. The gap between the two distributions is where initiative activity overwhelmed responsive activity completely. The single prints between the distributions often act as future support or resistance. When you see a double distribution forming, the move between the two areas is not an opportunity to fade. The market is telling you fair value has shifted." }],
    action: "Identify the developing profile shape early in the session. D-shape: trade the edges, be patient. P-shape: buy pullbacks, don't short. b-shape: sell bounces, be conservative with targets. Double distribution: trade with the shift, don't fade the move between distributions.",
    caution: "Profile shapes are clearest in hindsight. Intraday, a P-shape can look like the top of a D-shape until the market proves otherwise. Let the session develop before committing to a day-type read. The first hour often misleads. Use volume structure and initiative/responsive activity to confirm what the shape is telling you." },
  mgi: { name: "Market Generated Information", subtitle: "Reference levels the market has already decided on", color: conceptColor, gradient: conceptGrad, bg: conceptBg, icon: "⊡", group: "session",
    rules: [{ label: "What MGI Is", text: "MGI levels are decision points the market has already established. They are not signals to execute. They are reference points that tell you where the market stands relative to prior decisions, helping you frame setups and build context for where price is heading." },
      { label: "Key MGI Levels", text: "RTH Open, Daily Open, and Weekly Open mark the starting point for each timeframe's auction. Overnight High/Low (ONH/ONL) shows the range established outside regular hours. Previous Day High/Low (PDH/PDL) marks where yesterday's auction found its boundaries. Initial Balance Range (IBH/IBL) and its 50% extensions define the first 30-60 minutes of trade, often setting the tone for the session." },
      { label: "Reading MGI Decisions", text: "The value of MGI is in observing how the market reacts to these levels, not in the levels themselves. Price running through ONH and finding buyers above signals the market wants higher prices. Price rejecting PDH signals the market is not ready to transact outside the previous day's range. A peek below IBL followed by acceptance back inside signals the market is ready to move higher. Just because a level is on your chart does not mean the market cares about it." }],
    action: "Always ask two questions. First: which decisions have already been made, and what is the likely outcome? Second: what MGI level is the market heading towards and where did it come from? Use MGI to build a directional narrative for the session, then look for your setups at or near these levels when the market confirms the direction.",
    caution: "MGI levels are context, not edge. Placing a trade purely because price is at PDH or ONL without reading how the market is behaving at that level is no different from blind support/resistance trading. Let the market show you what it's deciding before you act." },
  vwap: { name: "VWAP", subtitle: "Dynamic line of positioning", color: conceptColor, gradient: conceptGrad, bg: conceptBg, icon: "∿", group: "session",
    rules: [{ label: "What VWAP Tells You", text: "VWAP represents the average price weighted by volume for a given period. It shows where the average risk sits. Price above VWAP means buyers are in control. Price below means sellers are in control. It's a simple but effective read of who currently has the upper hand." },
      { label: "Balance vs Imbalance", text: "A flat VWAP with price rotating around it signals balance. A steeply sloping VWAP with price consistently above or below signals imbalance and trending conditions. This aligns directly with your AMT balance and imbalance reads but gives you a dynamic, updating reference rather than a static zone." }],
    action: "In balance, avoid entering at VWAP as this is where most volume has transacted and price is likely to chop. In trending conditions, VWAP pullbacks become high probability entries because institutional algorithms benchmark their fills against VWAP, creating natural activity around it.",
    caution: "VWAP is a lagging, volume-weighted average. It confirms what has happened, not what will happen. Use it as context alongside your volume profile levels and MGI, not as a standalone signal." },
};

// ═══════════════════════════════════════════════════════════
// STORAGE HELPERS
// ═══════════════════════════════════════════════════════════

async function loadData(key, fallback) { try { const r = await storage.get(key); return r ? JSON.parse(r.value) : fallback; } catch { return fallback; } }
async function saveData(key, value) { try { await storage.set(key, JSON.stringify(value)); } catch (e) { console.error("Save:", e); } }
function todayKey() { return new Date().toISOString().split("T")[0]; }
function weekKey() { const d = new Date(); const s = new Date(d); s.setDate(d.getDate() - d.getDay() + 1); return `week-${s.toISOString().split("T")[0]}`; }
function formatDate(d) { const parts = d.split("-"); const dt = new Date(parts[0], parts[1]-1, parts[2]); return dt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }); }
function getWhoopGate(sl, re) { const s = parseFloat(sl), r = parseFloat(re); if (isNaN(s)||isNaN(r)) return null; if (s<70||r<30) return "RED"; if (s>=80) return "GREEN"; return "AMBER"; }
function recoveryWarning(re) { const r = parseFloat(re); if (isNaN(r)) return null; if (r >= 70) return null; if (r < 30) return null; return true; }
function gateColor(g) { return g==="GREEN"?"#10B981":g==="AMBER"?"#F48C06":g==="RED"?"#E94560":"rgba(255,255,255,0.2)"; }

// ═══════════════════════════════════════════════════════════
// EXPANDABLE CARD (shared pattern for schemas + AMT)
// ═══════════════════════════════════════════════════════════

function ExpandableCard({ item, expanded, onToggle, hideIcon, children }) {
  return (
    <div style={{ background: expanded ? item.bg : "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)", borderRadius: 22, border: `1px solid ${expanded ? `${item.color}33` : "rgba(255,255,255,0.06)"}`, marginBottom: 14, overflow: "hidden", transition: "all 0.3s ease" }}>
      <div onClick={onToggle} style={{ padding: "20px 22px", cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
        {!hideIcon && <div style={{ width: 46, height: 46, borderRadius: 13, background: item.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, boxShadow: expanded ? `0 4px 16px ${item.color}40` : "none", transition: "box-shadow 0.3s", color: item.iconColor || "#fff", fontWeight: 300 }}>{item.icon}</div>}
        {hideIcon && <div style={{ width: 3, height: 36, borderRadius: 2, background: item.color, opacity: expanded ? 0.6 : 0.25, flexShrink: 0, transition: "opacity 0.3s" }} />}
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
        <NavCard onClick={() => onNavigate("prep")} gradient="linear-gradient(180deg, #F48C06, #10B981, #4361EE)" tag="SESSION PREPARATION" title="Market Prep" desc="Mental check-in, pre-market analysis, scenarios and session focus." />
        <NavCard onClick={() => onNavigate("playbook")} gradient="linear-gradient(180deg, #2DD4BF, #10B981, #F48C06)" tag="TRADE EXECUTION" title="Playbook" desc="Setups, execution framework, risk framing and trigger confirmation." />
        <NavCard onClick={() => onNavigate("review")} gradient="linear-gradient(180deg, #A855F7, #4361EE, #2DD4BF)" tag="PROCESS & MENTAL GAME" title="Review" desc="Weekly process review, lessons, activations and discipline tracking." />
        <NavCard onClick={() => onNavigate("mental")} gradient="linear-gradient(180deg, #E94560, #4361EE, #F48C06)" tag="SCHEMA AWARENESS" title="Mental Game" desc="Schema tracking, DLL circuit breaker, activation logs and reviews." />
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
  { num: 1, diagram: 1, title: "Acceptance Into Balance", rule: "If price accepts into a balance area, it is likely to revert to the other side of balance.", detail: "Once price enters and is accepted into a value area, expect it to travel through to the opposite edge. The value area acts as a magnet and price gets pulled through it.", color: ruleColor },
  { num: 2, diagram: 2, title: "Rejection at Balance Edges", rule: "Price inside a balance area is expected to reject edges of balance until proven otherwise.", detail: "The edges of the value area (VAH and VAL) act as boundaries. Price will bounce between them. This gives you defined risk/reward. Trade the rejection with stops beyond the edge.", color: ruleColor },
  { num: 3, diagram: 4, title: "Acceptance Outside Balance", rule: "If price accepts outside of balance, it is likely to become imbalanced (seeking new balance).", detail: "When price breaks out of balance AND accepts (time + volume at the new level), the market has shifted. It will trend until it finds a new balance area. Trade with the direction.", color: ruleColor },
  { num: 4, diagram: 6, title: "Destination of Imbalance", rule: "The 'destination' of an imbalance is often a prior older balance area, and the first stop is typically the Point of Control (PoC).", detail: "When the market moves in imbalance, it's heading somewhere. That somewhere is usually a prior balance area where the market previously found agreement. The PoC of that area is the first target.", color: ruleColor },
  { num: 5, diagram: 7, title: "Strong PoC Reaction", rule: "If price reacts strong from a PoC, that can disrupt Rule #1.", detail: "Normally price accepted into balance travels to the other side. But if there's a strong reaction at the PoC (heavy volume, sharp rejection), the PoC acts as a wall instead of a waypoint. The rule gets overridden.", color: ruleColor },
  { num: 6, diagram: 8, title: "Retest of Balance Edges", rule: "Price often 'retests' edges of balance areas.", detail: "After breaking out of balance, price frequently comes back to test the edge it broke through. The old resistance becomes support (or vice versa). These retests are high-probability entries in the direction of the breakout.", color: ruleColor },
  { num: 7, diagram: 9, title: "Time/Volume at Edge = Breakout", rule: "If time/volume builds at the edge of balance or range, price is likely to push through.", detail: "When you see price spending time at an edge and volume is building (not rejecting), the market is accepting the new level. This is the precursor to a breakout. The balance is about to end.", color: ruleColor },
  { num: 8, diagram: 3, title: "Choppy Inside Balance", rule: "Price action is 'choppier' inside balance areas (established value / consolidation).", detail: "Inside balance, there's no directional conviction. Both sides are active. This is where you get chopped up trying to trade directionally. Recognise it and either trade the edges or sit out.", color: ruleColor },
  { num: 9, diagram: 5, title: "The Two Big Questions", rule: "What direction does the market want to go in? How good of a job is the market doing in trying to go in that direction?", detail: "These two questions are all you need. Direction tells you which side to be on. Conviction (how good a job) tells you how aggressively to position. If the market wants to go up but is doing a poor job, be cautious.", color: ruleColor },
];

const VOLUME_PROFILE = [
  { name: "Reading the Profile", subtitle: "Where the market found agreement", color: conceptColor, gradient: conceptGrad, bg: conceptBg, icon: "◫",
    rules: [
      { label: "High Volume Nodes (HVNs)", text: "Price levels where significant trading occurred. The market spent time here and found agreement. These are the same as AMT balance areas viewed through a volume lens. HVNs act as magnets. Price that enters an HVN tends to slow down, chop, and rotate. Expect responsive activity and mean reversion within these clusters. The wider the HVN, the more established the agreement and the harder it is for price to break through." },
      { label: "Low Volume Nodes (LVNs)", text: "Price levels where the market moved through quickly with minimal participation. These are air pockets where no agreement was reached, so there's nothing to hold price. LVNs between two HVNs create natural speed corridors. This is AMT's imbalance made visible. The market rejected these prices and moved on. The edges of an LVN often act as support and resistance. This is the boundary of the adjacent HVN. If price accepts through the edge, expect acceleration to the other side." },
      { label: "Point of Control (PoC)", text: "The single price level with the highest volume in a given profile. This is the market's strongest statement of fair value for that period. It sits at the heart of the HVN cluster and represents the highest concentration of filled orders. When price returns to a prior PoC, expect the strongest reaction of any level in that profile. This is AMT Rule 5 in action." },
    ],
    action: "HVNs are your zones. Expect reactions, rotations, and slower price action inside them. LVN edges are your support and resistance. Watch for rejection or acceptance. If price accepts into an LVN, expect acceleration to the other side. PoC is your highest conviction reaction level within any zone. Read the profile before the session to know where these levels are.",
    caution: "Volume profile shows you where volume was, not necessarily where unfilled interest remains. An HVN from three weeks ago that has been revisited multiple times is spent. A fresh HVN that price departed impulsively from still has active interest. Freshness matters. Always consider whether the level has been tested since it formed." },
  { name: "Daily Profile Levels", subtitle: "Building your session map from recent profiles", color: conceptColor, gradient: conceptGrad, bg: conceptBg, icon: "⊟",
    rules: [
      { label: "What to Mark", text: "From each relevant recent daily profile, mark the PoC, significant HVNs, and VAH/VAL. The PoC is your highest probability reaction level. The HVNs are your zones. VAH and VAL are your key boundaries, the edges where the market previously decided prices were too expensive or too cheap. These are your framework for the session." },
      { label: "Fresh vs Visited Levels", text: "A daily HVN that price hasn't revisited since it formed carries unfilled interest. Orders were placed there but the market moved away before all of them could be executed. When price returns, those remaining orders activate. An HVN that has already been retested has had some of that interest absorbed. Multiple revisits and the level is largely spent. Prioritise fresh levels over tested ones." },
      { label: "Multi-Day Confluences", text: "When HVNs from multiple sessions overlap at the same price, that level carries extra significance. The market has found agreement there repeatedly. These become your anchor levels. Conversely, when multiple sessions leave LVNs at the same area, that price range is consistently rejected. Expect fast moves through it regardless of direction." },
    ],
    action: "Each pre-session, assess where price is relative to recent daily profiles. Mark the PoC, HVNs, VAH and VAL from each relevant session. Note any multi-day confluences. When price approaches these levels during the session, drop to your entry timeframe and read the reaction. The profile tells you where to look. The live auction tells you what to do.",
    caution: "Don't limit yourself to yesterday's profile alone. Scan back through recent sessions for any untested levels. Unfinished business doesn't expire just because a new session started. A large HVN from several days ago that hasn't been revisited is still live and potentially more significant than yesterday's levels if it sits directly in the path of today's price action." },
  { name: "Zone Quality from the Profile", subtitle: "Grading your levels with data", color: conceptColor, gradient: conceptGrad, bg: conceptBg, icon: "✦",
    rules: [
      { label: "Thin Profile Departures", text: "When price leaves an HVN and the volume profile shows a sharp drop-off, a fat cluster immediately followed by a thin LVN, that's a high quality zone. The market transitioned from agreement to imbalance rapidly, meaning orders were left behind. The thinner the departure, the more unfilled interest remains at the HVN." },
      { label: "Wide Profile Departures", text: "When price leaves an HVN gradually and the volume tapers off slowly through a range, the orders were largely filled during the move. Less unfilled interest remains. These zones are lower quality and more likely to be absorbed on a retest rather than producing a strong reaction." },
      { label: "Profile Shape at the Zone", text: "Look at the shape of the volume cluster itself. A narrow, tall HVN (concentrated at a few price levels) means precise institutional interest. Expect a sharp reaction at a specific price. A wide, flat HVN (volume spread across a range) means distributed interest. Expect a more gradual response across the whole zone. The narrow clusters give you tighter entries and cleaner risk." },
      { label: "Stacked PoCs", text: "When the PoC from multiple sessions lands at or near the same price, that level is institutional consensus. These are your highest conviction zones. The market keeps coming back to this price as fair value. A break through a stacked PoC is highly significant. It means the market's assessment of fair value has fundamentally shifted." },
    ],
    action: "Grade every level on your chart. Thin departure + fresh + trend-aligned = A+ zone, full conviction. Wide departure + tested + counter-trend = low quality, skip it or reduce size. Let zone quality dictate your position sizing. Your best zones get full size, weaker zones get reduced or skipped entirely.",
    caution: "Zone grading is a probability tool, not a guarantee. An A+ zone in a strongly trending market against the zone's direction will still likely fail. Always combine zone quality with your broader auction read. Context overrides confluence." },
  { name: "The Developing Profile", subtitle: "Reading zones as they form", color: conceptColor, gradient: conceptGrad, bg: conceptBg, icon: "◧",
    rules: [
      { label: "Live Zone Formation", text: "The developing volume profile during the current session shows you balance areas forming in real time. When you see volume concentrating at a level and the HVN building, the market is finding agreement. You're watching a zone being created. If price then breaks away impulsively, leaving an LVN gap, you've just witnessed a fresh zone form live. That developing HVN becomes an intraday level you can trade on a retest." },
      { label: "Value Area Development", text: "Watch how the session's value area evolves. A value area that stays narrow and concentrated means the market is in tight balance with choppy, rotational conditions. A value area that migrates steadily in one direction means trending conditions. If the value area suddenly expands, the market has shifted from balance to imbalance. Reassess your bias and your levels." },
      { label: "Single Prints and LVN Gaps", text: "When the developing profile shows single prints (prices visited only once with minimal volume), those are the market's speed zones. Price ripped through without stopping. These single print areas act as magnets for future fills. The market often comes back to repair them. In AMT terms, it's unfinished business. In practical terms, these are potential intraday targets." },
    ],
    action: "Use the developing profile to identify intraday zones as they form. When the session creates a clear HVN and then departs, that's a tradeable level for the remainder of the day. Combine with your daily profile levels. If the developing profile builds an HVN right at a prior session's PoC, that confluence strengthens both levels.",
    caution: "The developing profile is noisy in the first hour. Let the session establish itself before treating developing HVNs as tradeable zones. Early volume clusters often get absorbed or shifted as the full session unfolds. Be patient. The profile becomes more reliable as more data builds." },
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
        {tx(148,160,"rejects edges, defined R:R",accent,"middle",7)}
      </>;
    },
    3: () => {
      // Choppy erratic price inside balance
      const vah=48,va=132;
      return <>
        {bal(20,vah,265,va)}
        {prof(24,vah,va)}
        <polyline points="45,88 55,72 63,98 72,66 82,105 90,70 100,95 110,68 120,100 128,74 138,96 146,70 158,92 166,78 178,102 186,64 196,108 206,70 218,94 228,80 240,90 252,84" stroke={price} strokeWidth={1.5} fill="none" strokeLinejoin="round" opacity={0.55} />
        {tx(148,155,"choppy, no directional conviction","rgba(255,255,255,0.35)","middle",8)}
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
        {tx(205,12,"reverses, disrupts #1",accent,"start",7)}
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

// ═══════════════════════════════════════════════════════════
// WEEKLY REVIEW
// ═══════════════════════════════════════════════════════════

function getWeekDates(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + (offset * 7));
  const days = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);
  }
  return days;
}

function weekLabel(dates) {
  if (!dates || dates.length === 0) return "";
  const fmt = d => { const p = d.split("-"); return `${p[2]}/${p[1]}`; };
  return `${fmt(dates[0])} - ${fmt(dates[4])}`;
}

function WeeklyReview({ onBack }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [ack, setAck] = useState({ activations: {}, lessons: {} });
  const [ackSaved, setAckSaved] = useState(false);
  const [takeaway, setTakeaway] = useState("");
  const [takeawaySaved, setTakeawaySaved] = useState(false);
  const [refresher, setRefresher] = useState({ flagged: {}, done: {} });
  const [refresherSaved, setRefresherSaved] = useState(true);

  const dates = getWeekDates(weekOffset);
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  useEffect(() => {
    (async () => {
      setLoading(true);

      // Load all days in parallel - checkins + activations + find review keys
      const dayPromises = dates.map(async (dk) => {
        const [checkin, activations, reviewKeys] = await Promise.all([
          loadData(`checkin-${dk}`, null),
          loadData(`activations-${dk}`, []),
          storage.list(`review-${dk}-`).then(r => r?.keys || []).catch(() => []),
        ]);
        // Load first found review if any key exists
        let review = null;
        if (reviewKeys.length > 0) {
          review = await loadData(reviewKeys[0], null);
        }
        return { date: dk, checkin, activations, review };
      });

      const [days, savedAck, savedTakeaway, savedRefresher] = await Promise.all([
        Promise.all(dayPromises),
        loadData(`weekly-ack-${dates[0]}`, { activations: {}, lessons: {} }),
        loadData(`weekly-takeaway-${dates[0]}`, null),
        loadData(`weekly-refresher-${dates[0]}`, null),
      ]);

      setData({ days });
      setAck(savedAck);
      setAckSaved(true);
      if (savedTakeaway) { setTakeaway(savedTakeaway.text || ""); setTakeawaySaved(true); }
      else { setTakeaway(""); setTakeawaySaved(false); }
      if (savedRefresher) { setRefresher(savedRefresher); setRefresherSaved(true); }
      else { setRefresher({ flagged: {}, done: {} }); setRefresherSaved(true); }
      setLoading(false);
    })();
  }, [weekOffset]);

  const saveAck = async (newAck) => {
    setAck(newAck);
    setAckSaved(false);
    await saveData(`weekly-ack-${dates[0]}`, newAck);
    setAckSaved(true);
  };

  const saveTakeawayFn = async () => {
    await saveData(`weekly-takeaway-${dates[0]}`, { text: takeaway, timestamp: new Date().toISOString() });
    setTakeawaySaved(true);
  };

  const toggleAckActivation = (dayIdx, actIdx) => {
    const key = `${dayIdx}-${actIdx}`;
    const newAck = { ...ack, activations: { ...ack.activations, [key]: !ack.activations[key] } };
    saveAck(newAck);
  };

  const toggleAckLesson = (dayIdx) => {
    const newAck = { ...ack, lessons: { ...ack.lessons, [dayIdx]: !ack.lessons[dayIdx] } };
    saveAck(newAck);
  };

  const REFRESHER_AREAS = ["Mental Schemas", "AMT / Volume Profile", "Setups", "Execution", "Risk / Trade Management"];
  const toggleRefresherFlag = (area) => {
    const newR = { ...refresher, flagged: { ...refresher.flagged, [area]: !refresher.flagged[area] } };
    if (!newR.flagged[area]) { newR.done = { ...newR.done }; delete newR.done[area]; }
    setRefresher(newR); setRefresherSaved(false);
  };
  const toggleRefresherDone = (area) => {
    const newR = { ...refresher, done: { ...refresher.done, [area]: !refresher.done[area] } };
    setRefresher(newR); setRefresherSaved(false);
  };
  const saveRefresherFn = async () => {
    await saveData(`weekly-refresher-${dates[0]}`, refresher);
    setRefresherSaved(true);
  };

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.2)", fontSize: 14 }}>Loading week...</div></div>;

  // Aggregate data
  // Schema flags (any question > 4)
  const schemaFlags = [];
  const schemaNames = ["Am I trying to prove something?", "Am I avoiding out of fear?", "Do I feel not good enough?", "Am I overcomplicating?", "Do I feel the need to be right?"];
  data.days.forEach((d, di) => {
    if (!d.checkin?.schemaScores) return;
    d.checkin.schemaScores.forEach((score, si) => {
      if (score > 4) schemaFlags.push({ day: dayNames[di], date: d.date, question: schemaNames[si], score, dayIdx: di });
    });
  });

  // Post-session mental checks for flagged days
  const flaggedDayIndices = [...new Set(schemaFlags.map(f => f.dayIdx))];

  // All activations
  const allActivations = [];
  data.days.forEach((d, di) => {
    if (d.activations?.length > 0) {
      d.activations.forEach((a, ai) => allActivations.push({ ...a, dayIdx: di, actIdx: ai, day: dayNames[di], date: d.date }));
    }
  });

  // Plays review
  const allPlays = [];
  data.days.forEach((d, di) => {
    if (!d.review) return;
    [["Bullish Play 1","bull1","bull1Invalid","bull1Result","bull1Traded","bull1WhyNot","#10B981"],
     ["Bullish Play 2","bull2","bull2Invalid","bull2Result","bull2Traded","bull2WhyNot","#10B981"],
     ["Bearish Play 1","bear1","bear1Invalid","bear1Result","bear1Traded","bear1WhyNot","#E94560"],
     ["Bearish Play 2","bear2","bear2Invalid","bear2Result","bear2Traded","bear2WhyNot","#E94560"]
    ].forEach(([label, sKey, iKey, rKey, tKey, wKey, color]) => {
      const result = d.review[rKey];
      const traded = d.review[tKey];
      if (result || traded) {
        allPlays.push({ label, day: dayNames[di], date: d.date, result, traded, whyNot: d.review[wKey], color });
      }
    });
  });
  const untradedPlays = allPlays.filter(p => p.traded === "No");
  const tradedPlays = allPlays.filter(p => p.traded === "Yes");

  // Rule compliance
  const ruleKeys = [["rulesTrend","Traded with Trend / Tape"],["rulesMarketCond","Traded Inline with Market Condition"],["rulesTopBottom","Avoided Picking Tops and Bottoms"],["rulesPlays","Trades from Pre Defined Plays"],["rulesExecution","Execution Model Followed"],["rulesFocus","Stayed Focused and Avoided Distraction"],["rulesConsol","Avoided Entering During Consolidation"],["rulesDLL","DLL Respected"]];
  const ruleSummary = ruleKeys.map(([key, label]) => {
    let followed = 0, broke = 0, na = 0;
    data.days.forEach(d => {
      if (!d.review) return;
      const v = d.review[key];
      if (v === "Followed") followed++;
      else if (v === "Broke") broke++;
      else na++;
    });
    return { label, followed, broke, total: followed + broke };
  });

  // Lessons
  const allLessons = [];
  data.days.forEach((d, di) => {
    if (!d.review) return;
    if (d.review.biggestLesson || d.review.tomorrowWill) {
      allLessons.push({ dayIdx: di, day: dayNames[di], date: d.date, lesson: d.review.biggestLesson, tomorrow: d.review.tomorrowWill });
    }
  });


  const CheckRow = ({ checked, onToggle, children }) => (
    <div style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "flex-start" }}>
      <div onClick={onToggle} style={{ width: 22, height: 22, borderRadius: 6, border: checked ? "1px solid rgba(45,212,191,0.4)" : "1px solid rgba(255,255,255,0.1)", background: checked ? "rgba(45,212,191,0.12)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, marginTop: 2, transition: "all 0.2s", fontSize: 12, color: "#2DD4BF" }}>{checked ? "✓" : ""}</div>
      <div style={{ flex: 1, opacity: checked ? 0.4 : 1, transition: "opacity 0.2s" }}>{children}</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", padding: "40px 20px 100px" }}>
      <BackButton onClick={onBack} />
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 4, color: "rgba(168,85,247,0.5)", fontWeight: 600 }}>PROCESS & MENTAL GAME</div>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, marginTop: 6, marginBottom: 8, color: "rgba(255,255,255,0.85)" }}>Weekly Review</div>

      {/* Week Selector */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <button onClick={() => setWeekOffset(weekOffset - 1)} style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.4)", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>←</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>{weekLabel(dates)}</div>
          {weekOffset === 0 && <div style={{ fontSize: 11, color: "rgba(45,212,191,0.5)", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>Current Week</div>}
        </div>
        <button onClick={() => setWeekOffset(Math.min(weekOffset + 1, 0))} style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: weekOffset < 0 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)", fontSize: 14, cursor: weekOffset < 0 ? "pointer" : "default", fontFamily: "inherit" }}>→</button>
      </div>

      {/* SECTION 1: BODY & MIND */}
      <Card style={{ marginBottom: 18 }}>
        <SectionLabel text="Body & Mind" />
        {/* Column headers */}
        <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 1fr 1fr 1fr", gap: 6, marginBottom: 8, padding: "0 4px" }}>
          <div />
          <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.2)", letterSpacing: 0.5, textAlign: "center" }}>SLEEP</div>
          <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.2)", letterSpacing: 0.5, textAlign: "center" }}>RECOV</div>
          <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.2)", letterSpacing: 0.5, textAlign: "center" }}>AWARE</div>
          <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.2)", letterSpacing: 0.5, textAlign: "center" }}>CONN</div>
        </div>
        {/* Day rows */}
        {data.days.map((d, di) => {
          const sl = d.checkin ? parseFloat(d.checkin.whoopSleep) : null;
          const rc = d.checkin ? parseFloat(d.checkin.whoopRecovery) : null;
          const aw = d.checkin?.mentalScores?.[0] || null;
          const cn = d.checkin?.mentalScores?.[1] || null;
          const slC = sl >= 80 ? "#10B981" : sl >= 70 ? "#F48C06" : sl ? "#E94560" : null;
          const rcC = rc >= 70 ? "#10B981" : rc >= 30 ? "#F48C06" : rc ? "#E94560" : null;
          const awC = aw >= 4 ? "#10B981" : aw >= 2 ? "#F48C06" : aw ? "#E94560" : null;
          const cnC = cn >= 4 ? "#10B981" : cn >= 2 ? "#F48C06" : cn ? "#E94560" : null;
          const cell = (val, unit, color) => (
            <div style={{ textAlign: "center", padding: "8px 4px", borderRadius: 8, background: color ? `${color}08` : "rgba(255,255,255,0.02)" }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: color || "rgba(255,255,255,0.1)" }}>{val ?? "..."}{unit || ""}</span>
            </div>
          );
          return (
            <div key={di} style={{ display: "grid", gridTemplateColumns: "44px 1fr 1fr 1fr 1fr", gap: 6, marginBottom: 4, padding: "0 4px" }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center" }}>{dayNames[di]}</div>
              {cell(sl ? Math.round(sl) : null, "%", slC)}
              {cell(rc ? Math.round(rc) : null, "%", rcC)}
              {cell(aw > 0 ? aw : null, null, awC)}
              {cell(cn > 0 ? cn : null, null, cnC)}
            </div>
          );
        })}
        {/* Summary line */}
        {(() => {
          const slDays = data.days.filter(d => d.checkin?.whoopSleep);
          const redCount = slDays.filter(d => parseFloat(d.checkin.whoopSleep) < 70 || parseFloat(d.checkin.whoopRecovery) < 30).length;
          const amberCount = slDays.filter(d => { const s = parseFloat(d.checkin.whoopSleep); const r = parseFloat(d.checkin.whoopRecovery); return s >= 70 && r >= 30 && s < 80; }).length;
          const greenCount = slDays.filter(d => parseFloat(d.checkin.whoopSleep) >= 80 && parseFloat(d.checkin.whoopRecovery) >= 30).length;
          return slDays.length > 0 ? (
            <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 12, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
              {greenCount > 0 && <span style={{ color: "#10B981" }}>{greenCount} green</span>}
              {amberCount > 0 && <span style={{ color: "#F48C06" }}>{amberCount} amber</span>}
              {redCount > 0 && <span style={{ color: "#E94560" }}>{redCount} red</span>}
              <span style={{ color: "rgba(255,255,255,0.15)" }}>{slDays.length}/5 logged</span>
            </div>
          ) : <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.15)", textAlign: "center", marginTop: 8 }}>No days logged yet</div>;
        })()}
      </Card>

      {/* SCHEMA FLAGS */}
      {schemaFlags.length > 0 && <Card style={{ marginBottom: 18 }}>
        <SectionLabel text="Schema Flags" color="#E94560" />
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 14, lineHeight: 1.6 }}>Baseline scores above 4 this week.</div>
        {schemaFlags.map((f, i) => (
          <div key={i} style={{ padding: "10px 0", borderBottom: i < schemaFlags.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", fontSize: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "rgba(255,255,255,0.5)" }}><span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.3)" }}>{f.day}</span> {f.question}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 16, color: "#E94560" }}>{f.score}</span>
            </div>
          </div>
        ))}
        {/* Post-session mental for flagged days */}
        {flaggedDayIndices.map(di => {
          const d = data.days[di];
          if (!d.review) return null;
          const { postEmotional, postDecision, postPhysical } = d.review;
          if (!postEmotional && !postDecision && !postPhysical) return null;
          return (
            <div key={di} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "12px 16px", marginTop: 10, fontSize: 13 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>{dayNames[di]} POST-SESSION</div>
              <div style={{ display: "flex", gap: 16, color: "rgba(255,255,255,0.5)" }}>
                {postEmotional > 0 && <span>Emotional: <strong style={{ color: postEmotional >= 4 ? "#10B981" : postEmotional >= 3 ? "#F48C06" : "#E94560" }}>{postEmotional}/5</strong></span>}
                {postDecision > 0 && <span>Decision: <strong style={{ color: postDecision >= 4 ? "#10B981" : postDecision >= 3 ? "#F48C06" : "#E94560" }}>{postDecision}/5</strong></span>}
                {postPhysical > 0 && <span>Physical: <strong style={{ color: postPhysical >= 4 ? "#10B981" : postPhysical >= 3 ? "#F48C06" : "#E94560" }}>{postPhysical}/5</strong></span>}
              </div>
            </div>
          );
        })}
      </Card>}

      {/* SECTION 2: ACTIVATIONS */}
      <Card style={{ marginBottom: 18 }}>
        <SectionLabel text={`Activations (${allActivations.length})`} />
        {allActivations.length === 0 ? (
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.2)", textAlign: "center", padding: 20 }}>No activations this week.</div>
        ) : allActivations.map((a, i) => (
          <CheckRow key={i} checked={!!ack.activations[`${a.dayIdx}-${a.actIdx}`]} onToggle={() => toggleAckActivation(a.dayIdx, a.actIdx)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)" }}>{a.day} {a.time || ""}</span>
              <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, background: a.outcome === "Followed plan" ? "rgba(16,185,129,0.12)" : "rgba(233,69,96,0.12)", color: a.outcome === "Followed plan" ? "#10B981" : "#E94560" }}>{a.outcome || "?"}</span>
            </div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}><strong style={{ color: "rgba(255,255,255,0.6)" }}>{a.schema}</strong>: {a.feeling}</div>
            {a.happened && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 4, lineHeight: 1.5 }}>{a.happened}</div>}
            {a.interrupt && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", fontStyle: "italic", marginTop: 4 }}>"{a.interrupt}"</div>}
            {a.cascadeFrom && a.cascadeFrom !== "No, this was the first" && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>CASCADE: {a.cascadeFrom}</div>}
          </CheckRow>
        ))}
      </Card>

      {/* SECTION 3: PLAYS */}
      <Card style={{ marginBottom: 18 }}>
        <SectionLabel text="Play Review" />

        {untradedPlays.length > 0 && <>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 1.5, color: "rgba(233,69,96,0.6)", fontWeight: 600, marginBottom: 10, marginTop: 8 }}>PLAYS NOT TRADED</div>
          {untradedPlays.map((p, i) => (
            <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: p.color, flexShrink: 0 }} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{p.day}</span>
                <span style={{ color: "rgba(255,255,255,0.5)" }}>{p.label}</span>
                {p.result && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: p.result === "Played Out" ? "rgba(16,185,129,0.1)" : "rgba(244,140,6,0.1)", color: p.result === "Played Out" ? "#10B981" : "#F48C06", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{p.result}</span>}
              </div>
              {p.whyNot && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginLeft: 14 }}>Why not: {p.whyNot}</div>}
            </div>
          ))}
        </>}

        {tradedPlays.length > 0 && <>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 1.5, color: "rgba(16,185,129,0.6)", fontWeight: 600, marginBottom: 10, marginTop: untradedPlays.length > 0 ? 18 : 8 }}>PLAYS TRADED</div>
          {tradedPlays.map((p, i) => (
            <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: p.color, flexShrink: 0 }} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{p.day}</span>
                <span style={{ color: "rgba(255,255,255,0.5)" }}>{p.label}</span>
                {p.result && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: p.result === "Played Out" ? "rgba(16,185,129,0.1)" : p.result === "Partially" ? "rgba(244,140,6,0.1)" : "rgba(233,69,96,0.1)", color: p.result === "Played Out" ? "#10B981" : p.result === "Partially" ? "#F48C06" : "#E94560", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{p.result}</span>}
              </div>
            </div>
          ))}
        </>}

        {allPlays.length === 0 && <div style={{ fontSize: 14, color: "rgba(255,255,255,0.2)", textAlign: "center", padding: 20 }}>No plays reviewed this week.</div>}
      </Card>

      {/* SECTION 4: DISCIPLINE */}
      <Card style={{ marginBottom: 18 }}>
        <SectionLabel text="Discipline" />

        {/* Rule Compliance */}
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 1.5, color: "rgba(255,255,255,0.3)", fontWeight: 600, marginBottom: 12 }}>RULE COMPLIANCE</div>
        {ruleSummary.map((r, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < ruleSummary.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.45)" }}>{r.label}</span>
            <div style={{ display: "flex", gap: 12, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
              {r.followed > 0 && <span style={{ color: "#10B981", fontWeight: 600 }}>{r.followed}✓</span>}
              {r.broke > 0 && <span style={{ color: "#E94560", fontWeight: 600 }}>{r.broke}✗</span>}
              {r.total === 0 && <span style={{ color: "rgba(255,255,255,0.15)" }}>...</span>}
            </div>
          </div>
        ))}

      </Card>

      {/* SECTION 5: LESSONS */}
      <Card style={{ marginBottom: 18 }}>
        <SectionLabel text={`Lessons (${allLessons.length})`} />
        {allLessons.length === 0 ? (
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.2)", textAlign: "center", padding: 20 }}>No lessons recorded this week.</div>
        ) : allLessons.map((l, i) => (
          <CheckRow key={i} checked={!!ack.lessons[l.dayIdx]} onToggle={() => toggleAckLesson(l.dayIdx)}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>{l.day}</div>
            {l.lesson && <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, marginBottom: 4 }}>{l.lesson}</div>}
            {l.tomorrow && <div style={{ fontSize: 13, color: "rgba(16,185,129,0.6)", fontStyle: "italic" }}>Tomorrow: {l.tomorrow}</div>}
          </CheckRow>
        ))}
      </Card>

      {/* SECTION 6: PROCESS REFRESHER */}
      <Card style={{ marginBottom: 18 }}>
        <SectionLabel text="Process Refresher" color="#A855F7" />
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", marginBottom: 16, lineHeight: 1.6 }}>Based on this week's review, flag any areas that need refreshing. Check them off once reviewed.</p>
        {REFRESHER_AREAS.map((area) => {
          const flagged = !!refresher.flagged[area];
          const done = !!refresher.done[area];
          return (
            <div key={area} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div onClick={() => toggleRefresherFlag(area)} style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, border: flagged ? "none" : "2px solid rgba(255,255,255,0.12)", background: flagged ? (done ? "rgba(168,85,247,0.15)" : "rgba(168,85,247,0.25)") : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#A855F7", cursor: "pointer" }}>{flagged ? "!" : ""}</div>
              <div style={{ flex: 1, fontSize: 15, color: flagged ? (done ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.6)") : "rgba(255,255,255,0.4)", textDecoration: done ? "line-through" : "none", cursor: "pointer", userSelect: "none" }} onClick={() => toggleRefresherFlag(area)}>{area}</div>
              {flagged && <div onClick={() => toggleRefresherDone(area)} style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, border: done ? "none" : "2px solid rgba(255,255,255,0.12)", background: done ? "#2DD4BF" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", cursor: "pointer" }}>{done ? "✓" : ""}</div>}
            </div>
          );
        })}
        {Object.values(refresher.flagged).some(Boolean) && <SaveButton saved={refresherSaved} onClick={saveRefresherFn} label="Save Refresher" />}
      </Card>

      {/* SECTION 7: WEEKLY TAKEAWAY */}
      <Card style={{ marginBottom: 18 }}>
        <SectionLabel text="Weekly Takeaway" />
        <textarea value={takeaway} onChange={e => { setTakeaway(e.target.value); setTakeawaySaved(false); }} placeholder="What is the key takeaway from this week? What patterns emerged? What will you carry into next week?" rows={5} style={{ width: "100%", padding: 16, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)", fontSize: 15, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", lineHeight: 1.7 }} />
        <SaveButton saved={takeawaySaved} onClick={saveTakeawayFn} label="Save Takeaway" />
      </Card>

    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PLAYBOOK
// ═══════════════════════════════════════════════════════════

function Playbook({ onBack }) {
  const [tab, setTab] = useState("setups");
  const tabs = [{id:"setups",label:"Setups",icon:"◎"},{id:"execution",label:"Execution",icon:"⊕"},{id:"risk",label:"Risk Mgmt",icon:"◈"}];

  const SectionBlock = ({ title, children }) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.3)", fontWeight: 600, marginBottom: 14, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 16, height: 1, background: "rgba(255,255,255,0.15)", borderRadius: 1 }} />{title}
      </div>
      {children}
    </div>
  );

  const RuleCard = ({ text }) => (
    <div style={{ padding: "14px 18px", marginBottom: 8, background: "rgba(255,255,255,0.025)", borderRadius: 14, borderLeft: "2px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", fontSize: 15, lineHeight: 1.8 }}>{text}</div>
  );

  const StandDownCard = ({ text }) => (
    <div style={{ padding: "14px 18px", marginBottom: 8, background: "rgba(233,69,96,0.04)", borderRadius: 14, borderLeft: "2px solid rgba(233,69,96,0.3)", color: "rgba(233,69,96,0.7)", fontSize: 14, lineHeight: 1.8 }}>{text}</div>
  );

  const SequenceStep = ({ number, title, children }) => (
    <div style={{ display: "flex", gap: 14, marginBottom: 18 }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.35)", flexShrink: 0, marginTop: 2 }}>{number}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: 1, marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.8 }}>{children}</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", padding: "40px 20px 100px" }}>
      <BackButton onClick={onBack} />
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 4, color: "rgba(45,212,191,0.5)", fontWeight: 600 }}>TRADE EXECUTION</div>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, marginTop: 6, marginBottom: 24, color: "rgba(255,255,255,0.85)" }}>Playbook</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "14px 12px", borderRadius: 16, cursor: "pointer", transition: "all 0.2s",
            background: tab === t.id ? "rgba(45,212,191,0.12)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${tab === t.id ? "rgba(45,212,191,0.3)" : "rgba(255,255,255,0.06)"}`,
            color: tab === t.id ? "#2DD4BF" : "rgba(255,255,255,0.35)",
            fontSize: 12, fontWeight: tab === t.id ? 700 : 500, fontFamily: "inherit", textAlign: "center",
          }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{t.icon}</div>{t.label}
          </button>
        ))}
      </div>

      {/* EXECUTION TAB */}
      {tab === "execution" && <div style={{ animation: "fadeIn 0.3s ease" }}>

        {/* OVERVIEW */}
        <Card style={{ marginBottom: 18 }}>
          <SectionLabel text="Execution Framework" color="rgba(255,255,255,0.3)" />
          <div style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", lineHeight: 1.9, marginBottom: 14 }}>
            Execution uses <strong style={{ color: "rgba(255,255,255,0.8)" }}>5-minute price action at pre-defined key levels</strong>, refined by orderflow. Levels come from your pre-market prep or develop as the session gives new data.
          </div>
          <div style={{ background: "rgba(45,212,191,0.06)", borderRadius: 14, padding: "14px 18px", border: "1px solid rgba(45,212,191,0.15)", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.4)", letterSpacing: 0.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
            <span>Key Area</span><span style={{ color: "rgba(255,255,255,0.15)" }}>→</span>
            <span style={{ color: "#4361EE", fontWeight: 700, padding: "4px 12px", background: "rgba(67,97,238,0.12)", borderRadius: 8, border: "1px solid rgba(67,97,238,0.25)" }}>RISK ZONE</span>
            <span style={{ color: "rgba(255,255,255,0.15)" }}>→</span><span>Passive Participants</span><span style={{ color: "rgba(255,255,255,0.15)" }}>→</span><span>Initiative Activity</span>
          </div>
        </Card>

        {/* STEP 1: FRAMING RISK */}
        <Card style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, letterSpacing: 1.5, color: "rgba(255,255,255,0.5)", fontWeight: 700, marginBottom: 18, textTransform: "uppercase" }}>Step 1: Frame the Risk Zone</div>
          <div style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", lineHeight: 1.9, marginBottom: 16 }}>
            Before any entry, establish the <strong style={{ color: "rgba(67,97,238,0.8)" }}>Risk Zone</strong>. A clearly defined area to trade against and how your risk is framed. No risk zone = no trade.
          </div>

          <SectionBlock title="Defined By">
            <RuleCard text="Stuck or offside participants, seen through DELTA by price. Where are traders trapped on the wrong side? Their stops and capitulation fuel your move." />
            <div style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono', monospace", margin: "4px 0", letterSpacing: 2 }}>AND / OR</div>
            <RuleCard text="Lack of interest, seen through a TAPER in volume. Where did participants stop engaging? This vacuum becomes the wall your trade leans against." />
          </SectionBlock>

          <StandDownCard text="If you cannot identify a clear Risk Zone at your level, there is no trade. Move on." />
        </Card>

        {/* STEP 2: PULLING THE TRIGGER */}
        <Card style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, letterSpacing: 1.5, color: "rgba(255,255,255,0.5)", fontWeight: 700, marginBottom: 18, textTransform: "uppercase" }}>Step 2: Pull the Trigger</div>
          <div style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", lineHeight: 1.9, marginBottom: 16 }}>
            The trigger is a <strong style={{ color: "rgba(255,255,255,0.8)" }}>two-part sequence</strong>. Passive activity sets up the trade. Aggressive activity confirms it. Without the passive setup, aggressive alone may be a trap.
          </div>

          <SequenceStep number="1" title="PASSIVE ACTIVITY: Pull / Stack">
            <div style={{ marginBottom: 8 }}>Orders aggressively <strong style={{ color: "rgba(255,255,255,0.8)" }}>reloading in your favour</strong> in or around the Risk Zone, indicating other participants are willing to support your trade idea.</div>
            <div>Opposing orders start to <strong style={{ color: "rgba(255,255,255,0.8)" }}>pull</strong>, pathing the way for price to move.</div>
          </SequenceStep>

          <div style={{ height: 1, background: "rgba(255,255,255,0.04)", margin: "8px 0 18px", position: "relative" }}>
            <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", background: "#0A0A0F", padding: "0 12px", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.2)", letterSpacing: 2 }}>THEN</div>
          </div>

          <SequenceStep number="2" title="AGGRESSIVE ACTIVITY: Recent Ask/Bid">
            <div style={{ marginBottom: 8 }}>Market orders from the opposing side <strong style={{ color: "rgba(255,255,255,0.8)" }}>taper off</strong> into the Risk Zone, indicating they are stepping off the gas.</div>
            <div>Followed by market orders in your favour starting to <strong style={{ color: "rgba(255,255,255,0.8)" }}>push price away</strong> from the Risk Zone.</div>
          </SequenceStep>

          <div style={{ background: "rgba(255,255,255,0.025)", borderRadius: 14, padding: "14px 18px", border: "1px solid rgba(255,255,255,0.06)", marginTop: 14, marginBottom: 14 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, color: "rgba(255,255,255,0.3)", fontWeight: 600, marginBottom: 6 }}>SEQUENCE MATTERS</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.8 }}>Passive first → Aggressive confirms. If you see aggressive market orders without the passive setup (pulling/stacking), treat it with caution. It may be a short-lived burst without genuine support behind it.</div>
          </div>

          <StandDownCard text="Passive setup present but no aggressive follow-through? No trade. The support is there but nobody is pulling the trigger, neither should you." />
          <StandDownCard text="Aggressive activity fires but opposing passive orders are NOT pulling? No trade. Absorption is likely and your move gets eaten." />
        </Card>

        {/* EXECUTION AIDS */}
        <Card style={{ marginBottom: 18 }}>
          <SectionLabel text="Execution Aids" color="rgba(255,255,255,0.3)" />

          <SectionBlock title="Tape">
            <RuleCard text="Execute inline with the tape reader, or when the tape is turning in your favour. The tape shows real-time aggression and intent." />
            <StandDownCard text="Never enter against a strong tape. If the tape is printing aggressively against your direction, the flow is telling you something your levels aren't." />
          </SectionBlock>

          <SectionBlock title="Volume Candles">
            <RuleCard text="Volume candles show the speed of the tape at your levels. High-volume compression at a level indicates participants are actively engaging, either absorption or balance. Watch whether that compression resolves in your direction before committing." />
          </SectionBlock>
        </Card>

      </div>}

      {/* SETUPS TAB - PLACEHOLDER */}
      {tab === "setups" && <div style={{ animation: "fadeIn 0.3s ease" }}>
        <Card style={{ textAlign: "center", padding: 52 }}>
          <div style={{ fontSize: 40, marginBottom: 14, opacity: 0.3 }}>◎</div>
          <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 16 }}>Setups: coming soon.</div>
          <div style={{ color: "rgba(255,255,255,0.15)", fontSize: 13, marginTop: 8 }}>Entry models, patterns and conditions.</div>
        </Card>
      </div>}

      {/* RISK MANAGEMENT TAB - PLACEHOLDER */}
      {tab === "risk" && <div style={{ animation: "fadeIn 0.3s ease" }}>
        <Card style={{ textAlign: "center", padding: 52 }}>
          <div style={{ fontSize: 40, marginBottom: 14, opacity: 0.3 }}>◈</div>
          <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 16 }}>Risk Management: coming soon.</div>
          <div style={{ color: "rgba(255,255,255,0.15)", fontSize: 13, marginTop: 8 }}>Position sizing, stop placement and trade management.</div>
        </Card>
      </div>}

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
        {[{ id: "concepts", label: "Deep Dive" }, { id: "rules", label: "AMT Rules" }, { id: "volume", label: "Volume Profile" }].map(t => (
          <button key={t.id} onClick={() => { setSubTab(t.id); setExpanded(null); }} style={{
            flex: 1, padding: "14px 12px", border: "none", borderRadius: 14, cursor: "pointer",
            background: subTab === t.id ? "rgba(45,212,191,0.15)" : "rgba(255,255,255,0.03)",
            color: subTab === t.id ? "#2DD4BF" : "rgba(255,255,255,0.3)",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: subTab === t.id ? 700 : 500,
            letterSpacing: 1, transition: "all 0.2s",
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

        <Card style={{ marginTop: 10, marginBottom: 20, textAlign: "center", padding: "18px 22px" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 3, color: "rgba(139,149,168,0.6)", fontWeight: 600 }}>SESSION TOOLS</div>
        </Card>

        {Object.entries(AMT_CONCEPTS).filter(([,c]) => c.group === "session").map(([key, c]) => (
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

      {/* VOLUME PROFILE TAB */}
      {subTab === "volume" && <div style={{ animation: "fadeIn 0.3s ease" }}>
        {VOLUME_PROFILE.map((c, i) => (
          <ExpandableCard key={i} item={c} expanded={expanded === `vp-${i}`} onToggle={() => setExpanded(expanded === `vp-${i}` ? null : `vp-${i}`)}>
            {c.rules.map((r, j) => <RuleBlock key={j} label={r.label} text={r.text} color={c.color} />)}
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
  if (coolingDown) { return (<div style={{ animation: "fadeIn 0.3s ease" }}><Card style={{ textAlign: "center", border: "1px solid rgba(233,69,96,0.3)" }}><div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 3, color: "#E94560", fontWeight: 600, marginBottom: 18 }}>COOLING DOWN</div><div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 64, fontWeight: 700, color: "#E94560", textShadow: "0 0 40px rgba(233,69,96,0.4)", marginBottom: 14 }}>{cooldownLeft}</div><div style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 18 }}>Sit with this decision for {cooldownLeft} seconds.</div><button onClick={() => { setCompleted(true); onLog({ ...responses, timestamp: new Date().toISOString(), keptLocked: true, changedMind: true }); }} style={{ marginTop: 24, padding: "16px 28px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #10B981, #059669)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>I changed my mind. Keep DLL Locked</button></Card></div>); }

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
// MARKET PREP
// ═══════════════════════════════════════════════════════════

const VIX_REGIME = (vix) => {
  if (!vix) return null;
  const v = parseFloat(vix);
  if (v > 25) return { label: "STRESS", color: "#E94560", bg: "rgba(233,69,96,0.12)", border: "rgba(233,69,96,0.3)", desc: "High caution. Reduce size or sit out." };
  if (v > 20) return { label: "ELEVATED", color: "#F48C06", bg: "rgba(244,140,6,0.12)", border: "rgba(244,140,6,0.3)", desc: "Widen stops, reduce size." };
  if (v >= 14) return { label: "NORMAL", color: "#10B981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", desc: "Standard conditions." };
  return { label: "ULTRA LOW", color: "#38BDF8", bg: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.3)", desc: "Compressed vol, potential expansion." };
};

const RVOL_REGIME = (rvol) => {
  if (!rvol) return null;
  const r = parseFloat(rvol);
  if (r > 120) return { label: "HOT", color: "#E94560", bg: "rgba(233,69,96,0.12)", border: "rgba(233,69,96,0.3)", desc: "High potential, high risk. A-setups only." };
  if (r >= 85) return { label: "ACTIVE", color: "#10B981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", desc: "Normal. Run your playbook." };
  if (r >= 60) return { label: "QUIET", color: "#F48C06", bg: "rgba(244,140,6,0.12)", border: "rgba(244,140,6,0.3)", desc: "Trade small and selective." };
  return { label: "DEAD", color: "#8B95A8", bg: "rgba(139,149,168,0.12)", border: "rgba(139,149,168,0.3)", desc: "Protect capital. Nothing to do." };
};

function PrepLogEntry({ entry }) {
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const gc = (g) => g === "GREEN" ? "#10B981" : g === "AMBER" ? "#F48C06" : g === "RED" ? "#E94560" : "rgba(255,255,255,0.3)";

  const handleClick = async () => {
    if (!loaded && !loading) {
      setOpen(true);
      setLoading(true);
      const prepD = await loadData(entry.key, null);
      const checkinD = await loadData(`checkin-${entry.date}`, null);
      const reviewD = await loadData(`review-${entry.date}-${entry.instrument}`, null);
      setData({ prep: prepD, checkin: checkinD, review: reviewD });
      setLoaded(true);
      setLoading(false);
    } else {
      setOpen(o => !o);
    }
  };

  const p = data?.prep;
  const ch = data?.checkin;
  const rv = data?.review;

  return (
    <Card style={{ marginBottom: 12, cursor: "pointer" }} onClick={handleClick}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>{formatDate(entry.date)}</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#2DD4BF", marginLeft: 12, fontWeight: 700 }}>{entry.instrument}</span>
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.2)", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</div>
      </div>
      {open && <div onClick={e => e.stopPropagation()} style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.9 }}>

        {loading && <div style={{ color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>Loading...</div>}

        {loaded && <>

        {/* MENTAL CHECK-IN */}
        {ch && <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.5, color: "rgba(255,255,255,0.25)", fontWeight: 600, marginBottom: 6 }}>CHECK-IN</div>
          {ch.whoopSleep && <div><span style={{ color: "rgba(255,255,255,0.3)" }}>Whoop:</span> Sleep {ch.whoopSleep}% · Recovery {ch.whoopRecovery}% {ch.whoopGate && <span style={{ color: gc(ch.whoopGate), fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700 }}> {ch.whoopGate}</span>}</div>}
          {ch.mentalScores && (ch.mentalScores[0] > 0 || ch.mentalScores[1] > 0) && <div><span style={{ color: "rgba(255,255,255,0.3)" }}>Mental:</span> Awareness {ch.mentalScores[0]}/5 · Connected {ch.mentalScores[1]}/5</div>}
          {ch.otherChecks && <div><span style={{ color: "rgba(255,255,255,0.3)" }}>Ready:</span> {["Hydrated","Exercised","Meditated","Foundation"].filter((_, i) => ch.otherChecks[i]).join(", ") || "None"}</div>}
          {ch.schemaScores && Math.max(...ch.schemaScores) > 0 && <div><span style={{ color: "rgba(255,255,255,0.3)" }}>Schemas:</span> {ch.schemaScores.join(" · ")}</div>}
        </div>}

        {/* PREP DATA */}
        {p && <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.5, color: "rgba(255,255,255,0.25)", fontWeight: 600, marginBottom: 6 }}>PREP</div>
          {p.vix && <div><span style={{ color: "rgba(255,255,255,0.3)" }}>VIX:</span> {p.vix} {VIX_REGIME(p.vix) && <span style={{ color: VIX_REGIME(p.vix).color, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700 }}>{VIX_REGIME(p.vix).label}</span>}</div>}
          {p.rvol && <div><span style={{ color: "rgba(255,255,255,0.3)" }}>RVOL:</span> {p.rvol} {RVOL_REGIME(p.rvol) && <span style={{ color: RVOL_REGIME(p.rvol).color, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700 }}>{RVOL_REGIME(p.rvol).label}</span>}</div>}
          {p.adr && <div><span style={{ color: "rgba(255,255,255,0.3)" }}>ADR:</span> {p.adr}</div>}
          {p.emasW && <div><span style={{ color: "rgba(255,255,255,0.3)" }}>EMA W/D:</span> {p.emasW} / {p.emasD || "—"}</div>}
          {p.weeklyCandle && <div><span style={{ color: "rgba(255,255,255,0.3)" }}>PA W/D:</span> {p.weeklyCandle} / {p.priorDaily || "—"}</div>}
          {p.auctionDirection && <div><span style={{ color: "rgba(255,255,255,0.3)" }}>Auction:</span> {p.auctionDirection} {p.auctionConviction && `(${p.auctionConviction})`}</div>}
          {p.sessionFocus && <div><span style={{ color: "rgba(255,255,255,0.3)" }}>Focus:</span> {p.sessionFocus}</div>}
          {p.bull1 && <div><span style={{ color: "#10B981", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700 }}>Bull 1</span> {p.bull1.substring(0, 100)}{p.bull1.length > 100 ? "..." : ""}</div>}
        </div>}

        {/* REVIEW DATA */}
        {rv && <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.5, color: "rgba(255,255,255,0.25)", fontWeight: 600, marginBottom: 6 }}>REVIEW</div>
          {rv.focusRating > 0 && <div><span style={{ color: "rgba(255,255,255,0.3)" }}>Focus Rating:</span> <span style={{ color: rv.focusRating >= 4 ? "#10B981" : rv.focusRating >= 2 ? "#F48C06" : "#E94560", fontWeight: 700 }}>{rv.focusRating}/5</span></div>}
          {(rv.postEmotional > 0 || rv.postDecision > 0 || rv.postPhysical > 0) && <div><span style={{ color: "rgba(255,255,255,0.3)" }}>Post-Mental:</span> Emotion {rv.postEmotional}/5 · Decision {rv.postDecision}/5 · Physical {rv.postPhysical}/5</div>}
          {rv.biggestLesson && <div><span style={{ color: "rgba(255,255,255,0.3)" }}>Lesson:</span> {rv.biggestLesson}</div>}
          {rv.tomorrowWill && <div><span style={{ color: "#10B981" }}>Tomorrow:</span> {rv.tomorrowWill}</div>}
        </div>}

        {!p && !ch && !rv && <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 13 }}>No data found.</div>}
        </>}
      </div>}
    </Card>
  );
}

function MarketPrep({ onBack }) {
  const [tab, setTab] = useState("checkin");
  const [loading, setLoading] = useState(true);
  const [hunterOpen, setHunterOpen] = useState(false);

  // Check-in state (moved from MentalGame)
  const [ws, setWs] = useState(""); const [wr, setWr] = useState("");
  const [ms, setMs] = useState([0, 0]); // [selfAwareness, connectedness] 1-5
  const [oc, setOc] = useState([false, false, false]); const [ss, setSs] = useState([0,0,0,0,0]); const [cs, setCs] = useState(false);
  const wg = getWhoopGate(ws, wr);
  const maxS = Math.max(...ss); const sg = maxS>5?"RED":maxS>3?"AMBER":"GREEN";
  const minMs = ms[0] > 0 && ms[1] > 0 ? Math.min(ms[0], ms[1]) : 0;
  const mg = minMs === 0 ? null : minMs <= 1 ? "RED" : minMs <= 3 ? "AMBER" : "GREEN";
  const go = {GREEN:0,AMBER:1,RED:2};
  const gates = [wg, sg, mg].filter(Boolean);
  const fg = gates.length === 0 ? "GREEN" : gates.reduce((worst, g) => go[g] > go[worst] ? g : worst, "GREEN");
  const gc = {GREEN:{c:"#10B981",g:"rgba(16,185,129,0.12)",l:"FULL SIZE",m:"Ready to hunt. Patience is the edge.",i:"●"},AMBER:{c:"#F48C06",g:"rgba(244,140,6,0.12)",l:"HALF SIZE",m:"A+ setups only. Reduced size.",i:"◐"},RED:{c:"#E94560",g:"rgba(233,69,96,0.12)",l:"NO TRADE",m:"Walk away. Protect capital & progress.",i:"○"}};
  const fgc = gc[fg]; const dp = []; if(wg&&wg!=="GREEN") dp.push(`Whoop: ${wg}`); if(sg!=="GREEN") dp.push(`Schemas: ${sg}`); if(mg&&mg!=="GREEN") dp.push(`Mental: ${mg}`);

  // Instrument & prep state
  const [instrument, setInstrument] = useState("NQ");
  const [prep, setPrep] = useState({
    news: "", adr: "", rvol: "", vix: "",
    weeklyCandle: "", priorDaily: "", emasW: "", emasD: "",
    profilePriorDay: false, profileDevDay: false, profilePriorWeek: false, profileDevWeek: false, sdLevels: false,
    ema4h1h: "", pa4h1h: "", singlePrints: "", anomaly: [], rotationFactor: "",
    auctionDirection: "", auctionConviction: "", openVsValue: "",
    bull1: "", bull1Invalid: "", bull2: "", bull2Invalid: "",
    bear1: "", bear1Invalid: "", bear2: "", bear2Invalid: "",
    sessionFocus: "",
    simDeactivated: false, bracket: false, miniMicro: false, accountsUnlocked: false, lagCheck: false,
  });
  const [prepSaved, setPrepSaved] = useState(false);
  const [prevAdrs, setPrevAdrs] = useState([]);
  const [prevFocus, setPrevFocus] = useState("");
  const [prevLessons, setPrevLessons] = useState(null);
  const [savedInstruments, setSavedInstruments] = useState([]);
  const [prepLog, setPrepLog] = useState([]);
  const [logLoaded, setLogLoaded] = useState(false);
  const [logSelected, setLogSelected] = useState(null); // { date, instrument, key }
  const [logData, setLogData] = useState(null); // { prep, checkin, review }

  // Session Review state
  const [review, setReview] = useState({
    focusRating: 0,
    bull1Result: "", bull1Traded: "", bull1WhyNot: "",
    bull2Result: "", bull2Traded: "", bull2WhyNot: "",
    bear1Result: "", bear1Traded: "", bear1WhyNot: "",
    bear2Result: "", bear2Traded: "", bear2WhyNot: "",
    rulesTrend: "", rulesMarketCond: "", rulesTopBottom: "", rulesPlays: "", rulesExecution: "", rulesFocus: "", rulesConsol: "", rulesDLL: "",
    rulesTrendNote: "", rulesMarketCondNote: "", rulesTopBottomNote: "", rulesPlaysNote: "", rulesExecutionNote: "", rulesFocusNote: "", rulesConsolNote: "", rulesDLLNote: "",
    postEmotional: 0, postDecision: 0, postPhysical: 0,
    biggestLesson: "", tomorrowWill: "",
  });
  const [reviewSaved, setReviewSaved] = useState(false);
  const [reviewPrepData, setReviewPrepData] = useState(null);

  const ur = (k, v) => { setReview(r => ({...r, [k]: v})); setReviewSaved(false); };

  const up = (k, v) => { setPrep(p => ({...p, [k]: v})); setPrepSaved(false); };
  const prepKey = (inst, date) => `prep-${date || todayKey()}-${inst || instrument}`;

  const loadPrepForInstrument = async (inst) => {
    const k = todayKey();
    // Build all date keys we'll need (today + 7 previous days)
    const prevDates = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      prevDates.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);
    }

    // Load today's prep + all previous preps + all previous reviews in ONE parallel batch
    const [todayPrep, ...prevResults] = await Promise.all([
      loadData(prepKey(inst, k), null),
      ...prevDates.map(dk => loadData(prepKey(inst, dk), null)),
      ...prevDates.map(dk => loadData(`review-${dk}-${inst}`, null)),
    ]);

    // Set today's prep
    if (todayPrep) { setPrep(todayPrep); setPrepSaved(true); } else {
      setPrep({ news:"", adr:"", rvol:"", vix:"", weeklyCandle:"", priorDaily:"", emasW:"", emasD:"",
        profilePriorDay:false, profileDevDay:false, profilePriorWeek:false, profileDevWeek:false, sdLevels:false,
        ema4h1h:"", pa4h1h:"", singlePrints:"", anomaly:[], rotationFactor:"",
        auctionDirection:"", auctionConviction:"", openVsValue:"",
        bull1:"", bull1Invalid:"", bull2:"", bull2Invalid:"",
        bear1:"", bear1Invalid:"", bear2:"", bear2Invalid:"",
        sessionFocus:"",
        simDeactivated:false, bracket:false, miniMicro:false, accountsUnlocked:false, lagCheck:false });
      setPrepSaved(false);
    }

    // Extract previous preps (indices 0-6) and reviews (indices 7-13)
    const prevPreps = prevResults.slice(0, 7);
    const prevReviews = prevResults.slice(7, 14);

    // ADR from previous 5 days
    const adrs = [];
    for (let i = 0; i < 5; i++) { if (prevPreps[i]?.adr) adrs.push({ date: prevDates[i], adr: parseFloat(prevPreps[i].adr) }); }
    setPrevAdrs(adrs);

    // Previous session focus (first found)
    setPrevFocus("");
    for (let i = 0; i < 7; i++) { if (prevPreps[i]?.sessionFocus) { setPrevFocus(prevPreps[i].sessionFocus); break; } }

    // Previous day's lessons (first found)
    setPrevLessons(null);
    for (let i = 0; i < 7; i++) {
      const rv = prevReviews[i];
      if (rv && (rv.biggestLesson || rv.tomorrowWill)) { setPrevLessons({ date: prevDates[i], lesson: rv.biggestLesson, tomorrow: rv.tomorrowWill }); break; }
    }
  };

  useEffect(() => { (async () => {
    const k = todayKey();
    // Load check-in and prep in parallel (the two things needed for first screen)
    const [ch] = await Promise.all([
      loadData(`checkin-${k}`, null),
      loadPrepForInstrument("NQ"),
    ]);
    if (ch) { setWs(ch.whoopSleep||""); setWr(ch.whoopRecovery||""); setMs(ch.mentalScores||[0,0]); setOc(ch.otherChecks||[false,false,false,false]); setSs(ch.schemaScores||[0,0,0,0,0]); setCs(true); }
    setLoading(false);
    // Load review + instruments + log in background (non-blocking)
    (async () => {
      const [rv, rp] = await Promise.all([
        loadData(`review-${k}-${instrument || "NQ"}`, null),
        loadData(prepKey("NQ", k), null),
      ]);
      if (rv) { setReview(rv); setReviewSaved(true); }
      if (rp) setReviewPrepData(rp);
      try {
        const keys = await storage.list(`prep-${k}-`);
        if (keys?.keys) setSavedInstruments(keys.keys.map(k => k.split("-").pop()));
      } catch {}
    })();
  })(); }, []);

  const saveCheckin = async () => { await saveData(`checkin-${todayKey()}`, { whoopSleep:ws, whoopRecovery:wr, mentalScores:ms, otherChecks:oc, schemaScores:ss, whoopGate:wg, timestamp:new Date().toISOString() }); setCs(true); };
  const savePrep = async () => {
    await saveData(prepKey(instrument), { ...prep, instrument, timestamp:new Date().toISOString() });
    setPrepSaved(true);
    if (!savedInstruments.includes(instrument)) setSavedInstruments([...savedInstruments, instrument]);
  };
  const saveReview = async () => {
    await saveData(`review-${todayKey()}-${instrument}`, { ...review, instrument, timestamp:new Date().toISOString() });
    setReviewSaved(true);
  };
  const loadReviewForInstrument = async (inst) => {
    const rv = await loadData(`review-${todayKey()}-${inst}`, null);
    if (rv) { setReview(rv); setReviewSaved(true); }
    else { setReview({ focusRating:0, bull1Result:"", bull1Traded:"", bull1WhyNot:"", bull2Result:"", bull2Traded:"", bull2WhyNot:"", bear1Result:"", bear1Traded:"", bear1WhyNot:"", bear2Result:"", bear2Traded:"", bear2WhyNot:"", rulesTrend:"", rulesMarketCond:"", rulesTopBottom:"", rulesPlays:"", rulesExecution:"", rulesFocus:"", rulesConsol:"", rulesDLL:"", rulesTrendNote:"", rulesMarketCondNote:"", rulesTopBottomNote:"", rulesPlaysNote:"", rulesExecutionNote:"", rulesFocusNote:"", rulesConsolNote:"", rulesDLLNote:"", postEmotional:0, postDecision:0, postPhysical:0, biggestLesson:"", tomorrowWill:"" }); setReviewSaved(false); }
    const rp = await loadData(prepKey(inst, todayKey()), null);
    if (rp) setReviewPrepData(rp);
  };

  const loadLogEntry = async (entry) => {
    if (logSelected?.key === entry.key) { setLogSelected(null); setLogData(null); return; }
    setLogSelected(entry);
    setLogData(null);
    const prepD = await loadData(entry.key, null);
    const checkinD = await loadData(`checkin-${entry.date}`, null);
    const reviewD = await loadData(`review-${entry.date}-${entry.instrument}`, null);
    setLogData({ prep: prepD, checkin: checkinD, review: reviewD });
  };

  const switchInstrument = async (inst) => { setInstrument(inst); setPrevFocus(""); await loadPrepForInstrument(inst); await loadReviewForInstrument(inst); };

  const vixR = VIX_REGIME(prep.vix);
  const rvolR = RVOL_REGIME(prep.rvol);
  const adrTrend = prevAdrs.length > 0 && prep.adr ? (parseFloat(prep.adr) > prevAdrs[0].adr ? "↑" : parseFloat(prep.adr) < prevAdrs[0].adr ? "↓" : "→") : null;

  if (loading) return <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:"100vh", color:"rgba(255,255,255,0.3)" }}>Loading...</div>;

  const tabs = [{id:"checkin",label:"Check-In",icon:"◉"},{id:"prep",label:"Prep",icon:"◎"},{id:"review",label:"Review",icon:"◈"},{id:"log",label:"Log",icon:"◫"}];

  const handleTabSwitch = (id) => {
    setTab(id);
    if (id === "log" && !logLoaded) {
      setLogLoaded(true);
      (async () => {
        const log = [];
        const promises = [];
        for (let i = 0; i <= 14; i++) {
          const d = new Date(); d.setDate(d.getDate() - i);
          const dk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
          promises.push(storage.list(`prep-${dk}-`).then(keys => {
            if (keys?.keys?.length > 0) for (const key of keys.keys) log.push({ date: dk, instrument: key.split("-").pop(), key });
          }).catch(() => {}));
        }
        await Promise.all(promises);
        log.sort((a,b) => b.date.localeCompare(a.date));
        setPrepLog(log);
      })();
    }
  };

  const SelectField = ({ label, value, options, onChange }) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 8 }}>{label}</label>
      <div style={{ display: "flex", gap: 6 }}>
        {options.map(o => (
          <button key={o} onClick={() => onChange(value === o ? "" : o)} style={{
            flex: 1, padding: "12px 8px", borderRadius: 12, border: `1px solid ${value === o ? (o === "Bullish" || o === "Yes" || o === "Pushing Up" ? "rgba(16,185,129,0.4)" : o === "Bearish" || o === "No" || o === "Pushing Down" ? "rgba(233,69,96,0.4)" : "rgba(255,255,255,0.15)") : "rgba(255,255,255,0.06)"}`,
            background: value === o ? (o === "Bullish" || o === "Yes" || o === "Pushing Up" ? "rgba(16,185,129,0.1)" : o === "Bearish" || o === "No" || o === "Pushing Down" ? "rgba(233,69,96,0.1)" : "rgba(255,255,255,0.05)") : "rgba(255,255,255,0.03)",
            color: value === o ? (o === "Bullish" || o === "Yes" || o === "Pushing Up" ? "#10B981" : o === "Bearish" || o === "No" || o === "Pushing Down" ? "#E94560" : "rgba(255,255,255,0.6)") : "rgba(255,255,255,0.3)",
            fontSize: 13, fontWeight: value === o ? 700 : 500, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
          }}>{o}</button>
        ))}
      </div>
    </div>
  );

  const Checkbox = ({ label, checked, onChange, color }) => {
    const c = color || "#10B981";
    const bg = color ? `${color}` : "linear-gradient(135deg, #10B981, #059669)";
    return (
    <div onClick={() => onChange(!checked)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", cursor: "pointer", fontSize: 15, color: checked ? c : "rgba(255,255,255,0.5)", userSelect: "none" }}>
      <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, border: checked ? "none" : "2px solid rgba(255,255,255,0.12)", background: checked ? bg : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff" }}>{checked ? "✓" : ""}</div>
      {label}
    </div>
  );
  };

  const RegimeBadge = ({ regime }) => regime ? (
    <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:11, fontWeight:700, letterSpacing:1.5, padding:"5px 12px", borderRadius:8, background:regime.bg, color:regime.color, border:`1px solid ${regime.border}` }}>{regime.label}</span>
  ) : null;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ padding: "32px 24px 0" }}>
        <BackButton onClick={onBack} />
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 3, color: "rgba(45,212,191,0.5)", fontWeight: 600 }}>SESSION PREPARATION</div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, marginTop: 3, color: "rgba(255,255,255,0.7)" }}>Market Prep</div>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => handleTabSwitch(t.id)} style={{
              flex: 1, padding: "14px 8px", border: "none", borderRadius: 14, cursor: "pointer",
              background: tab === t.id ? "rgba(45,212,191,0.15)" : "rgba(255,255,255,0.03)",
              color: tab === t.id ? "#2DD4BF" : "rgba(255,255,255,0.3)",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: tab === t.id ? 700 : 500,
              letterSpacing: 1, transition: "all 0.2s", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            }}><span style={{ fontSize: 16 }}>{t.icon}</span>{t.label}</button>
          ))}
        </div>
      </div>
      <div style={{ padding: "0 20px 60px" }}>

        {/* MENTAL CHECK-IN TAB */}
        {tab === "checkin" && <div style={{ animation: "fadeIn 0.3s ease" }}>

          {/* THE HUNTER */}
          <div onClick={() => setHunterOpen(h => !h)} style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)", borderRadius: 22, border: "1px solid rgba(255,255,255,0.06)", marginBottom: 18, overflow: "hidden", cursor: "pointer", transition: "all 0.3s ease" }}>
            <div style={{ padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, letterSpacing: 2, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>The Hunter</div>
                {!hunterOpen && <div style={{ fontSize: 13, color: "rgba(45,212,191,0.5)", marginTop: 4, fontStyle: "italic" }}>Am I hunting, or just making noise?</div>}
              </div>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", transform: hunterOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s ease", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>▼</div>
            </div>
            {hunterOpen && <div onClick={e => e.stopPropagation()} style={{ padding: "0 22px 26px", animation: "fadeIn 0.25s ease" }}>
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 22 }} />
              <div style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.9 }}>
                <p style={{ marginBottom: 16 }}>Most people come to trading thinking they've found a new poker table. They've read the books, studied the setups, and convinced themselves that skill and discipline are enough to win. In poker, that's true. In trading, it isn't.</p>

                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: 1.5, color: "rgba(255,255,255,0.35)", fontWeight: 600, marginBottom: 12, marginTop: 24, textTransform: "uppercase" }}>You're Playing the Wrong Game</div>
                <p style={{ marginBottom: 10 }}>In poker, your opponents are human. They tilt, they bluff, they have patterns you can read and exploit. In trading, the other side of your trade is Goldman Sachs, Citadel, and algorithms that have already moved before your hand reaches the mouse. You are not trying to outthink humans. You are stepping into a system that was designed, structurally, to extract money from people who think they're playing a fair game.</p>
                <p style={{ marginBottom: 10 }}>The 95% who lose don't lose because they're dumb or haven't studied enough. They lose because they're playing the wrong game while completely convinced they're playing the right one.</p>
                <p style={{ marginBottom: 16 }}>Your job isn't to beat the institutions. It's to read what they're doing and ride their wave without getting crushed.</p>

                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: 1.5, color: "rgba(255,255,255,0.35)", fontWeight: 600, marginBottom: 12, marginTop: 24, textTransform: "uppercase" }}>Trading is Hunting, Not Poker</div>
                <p style={{ marginBottom: 10 }}>In poker, the game comes to you. Cards get dealt, you play the hand.</p>
                <p style={{ marginBottom: 10 }}>In trading, you sit in the wilderness and wait for prey. You don't control when it appears or what it does. You only control whether you take the shot when the moment arrives. Most of the job is waiting. Sitting in silence, doing nothing, and being completely at peace with that.</p>
                <p style={{ marginBottom: 10 }}>The institutions move through this market like large animals through a forest. Your job is to read their tracks, understand their direction, and step into their path at the right moment. You're not hunting against them. You're hunting in the wake of what they've already decided to do.</p>
                <p style={{ marginBottom: 16, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>This isn't a hobby. You eat what you kill.</p>

                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: 1.5, color: "rgba(255,255,255,0.35)", fontWeight: 600, marginBottom: 12, marginTop: 24, textTransform: "uppercase" }}>Levels of the Hunt</div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>The Tourist</div>
                  <p>You're in the forest with a camera, not a rifle. Watching price, marking levels after the fact, getting excited about trades you would have taken. Not yet in the game. Every hunter starts here, but you can't stay.</p>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>The Amateur</div>
                  <p style={{ marginBottom: 8 }}>You have a rifle and you've done the work. But you can't sit still. You wander through the forest firing at shadows, taking trades out of boredom, taking another because the last one went wrong and you want it back. You come home with one real kill for every ten trips. Not because the prey wasn't there. Because you scared it away before it came close enough.</p>
                  <p>Revenge trades. Boredom trades. "Kinda looks like my setup" trades. The amateur bleeds slowly, not from one big blow-up, but from a hundred small unnecessary trigger pulls.</p>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>The Professional</div>
                  <p style={{ marginBottom: 8 }}>You've accepted the hardest truth: waiting is the job. You're at your desk before the open, at the same spot you've scouted, watching for the specific conditions you know produce prey. You sit in silence for as long as it takes. And when the shot appears, clean and unmistakable, you take it without hesitation. Then you close the laptop. No second kill. No overstaying. You got what you came for and you're done.</p>
                  <p>The professional is boring to watch. He shoots less than everyone else and goes home earlier than everyone else. And he eats every single week while the amateurs go home empty-handed and exhausted.</p>
                </div>

                <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: "18px 20px", marginTop: 24, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.3)", fontWeight: 600, marginBottom: 10, textTransform: "uppercase" }}>The One Question</div>
                  <div style={{ fontSize: 16, fontWeight: 600, fontStyle: "italic", color: "rgba(255,255,255,0.65)", lineHeight: 1.7, marginBottom: 10 }}>Am I hunting right now, or am I just walking through the forest making noise?</div>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>If you can't answer that with complete clarity, put the rifle down and wait. The prey will come. Your only job is to be still enough to let it.</div>
                </div>
              </div>
            </div>}
          </div>

          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}><SectionLabel text="Mental Check-In" /><span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:12, color:"rgba(255,255,255,0.2)" }}>{todayKey()}</span></div>
          <Card style={{ marginBottom:18 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}><SectionLabel text="Whoop Scores" color="#10B981" />{wg && <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:11, fontWeight:700, letterSpacing:1.5, padding:"5px 12px", borderRadius:8, background:`${gateColor(wg)}15`, color:gateColor(wg), border:`1px solid ${gateColor(wg)}33` }}>{wg}</span>}</div>
            <div style={{ display:"flex", gap:14, marginBottom:18 }}>
              {[["Sleep Score",ws,v=>{setWs(v);setCs(false);}],["Recovery Score",wr,v=>{setWr(v);setCs(false);}]].map(([l,v,fn]) => <div key={l} style={{flex:1}}><label style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.4)",display:"block",marginBottom:8}}>{l}</label><div style={{position:"relative"}}><input type="number" min={0} max={100} value={v} onChange={e=>fn(e.target.value)} placeholder="—" style={{width:"100%",padding:"16px 44px 16px 16px",borderRadius:14,border:`1px solid ${v?`${gateColor(wg)}44`:"rgba(255,255,255,0.08)"}`,fontSize:26,fontFamily:"'JetBrains Mono', monospace",fontWeight:700,background:v?`${gateColor(wg)}08`:"rgba(255,255,255,0.04)",color:v?gateColor(wg):"rgba(255,255,255,0.3)",boxSizing:"border-box",outline:"none",textAlign:"center"}} /><span style={{position:"absolute",right:16,top:"50%",transform:"translateY(-50%)",fontSize:15,color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono', monospace"}}>%</span></div></div>)}
            </div>
            <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:12, padding:14, fontSize:12, color:"rgba(255,255,255,0.25)", lineHeight:2, fontFamily:"'JetBrains Mono', monospace" }}><div><span style={{color:"#10B981"}}>●</span> Sleep ≥80% → Full Size</div><div><span style={{color:"#F48C06"}}>●</span> Sleep 70–79% → Half Size</div><div><span style={{color:"#E94560"}}>●</span> Sleep &lt;70% or Recovery &lt;30% → No Trade</div></div>
            {recoveryWarning(wr) && <div style={{ background:"rgba(244,140,6,0.06)", borderRadius:12, padding:"12px 14px", marginTop:10, border:"1px solid rgba(244,140,6,0.15)", fontSize:13, color:"rgba(244,140,6,0.7)", lineHeight:1.6 }}>Recovery is low. Minimise intense screen time today and prioritise recovering.</div>}
          </Card>
          <Card style={{ marginBottom:18 }}>
            <SectionLabel text="Mental Check-In" color="#4361EE" />
            {[["Self Awareness","How aware are you of your current mental state?",0],["Connectedness","How connected do you feel to your emotions/body?",1]].map(([label,desc,idx]) => {
              const v = ms[idx]; const color = v >= 4 ? "#10B981" : v >= 2 ? "#F48C06" : v > 0 ? "#E94560" : "rgba(255,255,255,0.15)";
              return <div key={idx} style={{ marginBottom: 18 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                  <span style={{ fontSize:15, color:"rgba(255,255,255,0.6)", fontWeight:600 }}>{label}</span>
                  <span style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:22, color, width:36, textAlign:"center" }}>{v || "—"}</span>
                </div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.25)", marginBottom:10 }}>{desc}</div>
                <div style={{ display:"flex", gap:8 }}>
                  {[1,2,3,4,5].map(n => <button key={n} onClick={() => { const nm = [...ms]; nm[idx] = ms[idx] === n ? 0 : n; setMs(nm); setCs(false); }} style={{
                    flex:1, padding:"12px 0", borderRadius:10, border: v === n ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.06)",
                    background: v === n ? `${color}15` : "rgba(255,255,255,0.03)", color: v === n ? color : "rgba(255,255,255,0.3)",
                    fontSize:16, fontWeight: v === n ? 700 : 500, cursor:"pointer", fontFamily:"'JetBrains Mono', monospace",
                  }}>{n}</button>)}
                </div>
              </div>;
            })}
          </Card>
          <Card style={{ marginBottom:18 }}><SectionLabel text="Readiness" color="rgba(255,255,255,0.25)" />{["Eaten properly & hydrated","Exercised or moved today","Meditated or visualized (5+ min)","Read Mental Game Foundation"].map((item,i) => <div key={i} onClick={()=>{const n=[...oc];n[i]=!n[i];setOc(n);setCs(false);}} style={{display:"flex",alignItems:"center",gap:16,padding:"14px 0",borderBottom:i<3?"1px solid rgba(255,255,255,0.04)":"none",cursor:"pointer",fontSize:16,color:oc[i]?"#2DD4BF":"rgba(255,255,255,0.5)",userSelect:"none"}}><div style={{width:28,height:28,borderRadius:9,flexShrink:0,border:oc[i]?"none":"2px solid rgba(255,255,255,0.12)",background:oc[i]?"#2DD4BF":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"#fff"}}>{oc[i]?"✓":""}</div>{item}</div>)}</Card>
          <Card style={{ marginBottom:18 }}><SectionLabel text="Emotional Baseline" color="#4361EE" /><p style={{fontSize:14,color:"rgba(255,255,255,0.25)",marginBottom:22,lineHeight:1.6}}>Score ≥5 means significantly lower threshold for schema activation.</p>
            {CHECKIN_QUESTIONS.map((item,i) => { const v=ss[i]; const color=v>5?"#E94560":v>3?"#F48C06":"#10B981"; return <div key={i} style={{marginBottom:22}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><span style={{fontSize:15,color:"rgba(255,255,255,0.6)",flex:1}}>{item.q}</span><span style={{fontFamily:"'JetBrains Mono', monospace",fontSize:11,color:"rgba(255,255,255,0.2)",marginRight:14,letterSpacing:1}}>{item.schema}</span><span style={{fontFamily:"'JetBrains Mono', monospace",fontWeight:700,fontSize:22,color,width:40,textAlign:"center"}}>{v}</span></div><div style={{position:"relative"}}><div style={{position:"absolute",top:"50%",left:0,right:0,height:5,borderRadius:3,background:"rgba(255,255,255,0.06)",transform:"translateY(-50%)"}} /><div style={{position:"absolute",top:"50%",left:0,width:`${v*10}%`,height:5,borderRadius:3,background:color,transform:"translateY(-50%)",transition:"all 0.15s"}} /><input type="range" min={0} max={10} value={v} onChange={e=>{const n=[...ss];n[i]=parseInt(e.target.value);setSs(n);setCs(false);}} style={{width:"100%",background:"transparent",position:"relative",zIndex:2,WebkitAppearance:"none",appearance:"none",height:24}} /></div></div>; })}
            <div style={{background:fgc.g,borderRadius:16,padding:"18px 20px",textAlign:"center",border:`1px solid ${fgc.c}33`,marginTop:22}}><div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginBottom:6}}><span style={{fontSize:28,filter:`drop-shadow(0 0 8px ${fgc.c})`,color:fgc.c}}>{fgc.i}</span><span style={{fontFamily:"'JetBrains Mono', monospace",fontWeight:700,fontSize:26,color:fgc.c,letterSpacing:3}}>{fg}</span><span style={{fontFamily:"'JetBrains Mono', monospace",fontWeight:600,fontSize:11,color:fgc.c,letterSpacing:2,opacity:0.8}}>{fgc.l}</span></div><div style={{fontSize:14,color:"rgba(255,255,255,0.4)"}}>{fgc.m}</div>{dp.length>0&&<div style={{fontSize:11,color:"rgba(255,255,255,0.2)",marginTop:6,fontFamily:"'JetBrains Mono', monospace"}}>Driven by: {dp.join(" + ")}</div>}</div>
          </Card>
          <SaveButton saved={cs} onClick={saveCheckin} label="Save Check-In" />
        </div>}

        {/* PRE-MARKET PREP TAB */}
        {tab === "prep" && <div style={{ animation: "fadeIn 0.3s ease" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}><SectionLabel text="Pre-Market Prep" /><span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:12, color:"rgba(255,255,255,0.2)" }}>{todayKey()}</span></div>

          {/* INSTRUMENT SELECTOR */}
          <Card style={{ marginBottom: 18 }}>
            <SectionLabel text="Instrument" color="rgba(255,255,255,0.25)" />
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
              <input type="text" value={instrument} onChange={e => { setInstrument(e.target.value.toUpperCase()); }} placeholder="NQ" style={{ flex:1, padding:"14px 16px", borderRadius:12, border:"1px solid rgba(255,255,255,0.08)", fontSize:18, fontFamily:"'JetBrains Mono', monospace", fontWeight:700, background:"rgba(255,255,255,0.04)", color:"rgba(255,255,255,0.7)", boxSizing:"border-box", outline:"none", textAlign:"center", letterSpacing:2 }} />
              <button onClick={() => switchInstrument(instrument)} style={{ padding:"14px 20px", borderRadius:12, border:"1px solid rgba(45,212,191,0.3)", background:"rgba(45,212,191,0.1)", color:"#2DD4BF", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'JetBrains Mono', monospace", letterSpacing:1, whiteSpace:"nowrap" }}>LOAD</button>
            </div>
            {savedInstruments.length > 1 && <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap" }}>
              {savedInstruments.map(inst => (
                <button key={inst} onClick={() => { setInstrument(inst); switchInstrument(inst); }} style={{ padding:"8px 14px", borderRadius:10, border: inst === instrument ? "1px solid rgba(45,212,191,0.4)" : "1px solid rgba(255,255,255,0.06)", background: inst === instrument ? "rgba(45,212,191,0.1)" : "rgba(255,255,255,0.03)", color: inst === instrument ? "#2DD4BF" : "rgba(255,255,255,0.35)", fontSize:12, fontFamily:"'JetBrains Mono', monospace", fontWeight: inst === instrument ? 700 : 500, cursor:"pointer" }}>{inst}</button>
              ))}
            </div>}
          </Card>

          {/* NEWS */}
          <Card style={{ marginBottom: 18 }}>
            <SectionLabel text="News / Data Releases" color="rgba(255,255,255,0.25)" />
            <textarea value={prep.news} onChange={e => up("news", e.target.value)} placeholder="Any scheduled news events, data releases, FOMC, CPI, Trump speaking..." rows={2} style={{ width:"100%", padding:14, borderRadius:14, border:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.04)", color:"rgba(255,255,255,0.7)", fontSize:15, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }} />
          </Card>

          {/* VOLATILITY */}
          <Card style={{ marginBottom: 18 }}>
            <SectionLabel text="Volatility" color="#F48C06" />
            <div style={{ display:"flex", gap:10, marginTop:14, marginBottom:14 }}>
              <div style={{ flex:1 }}>
                <label style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.4)", display:"block", marginBottom:8 }}>ADR {adrTrend && <span style={{ color: adrTrend === "↑" ? "#E94560" : adrTrend === "↓" ? "#10B981" : "rgba(255,255,255,0.3)", fontSize: 16 }}>{adrTrend}</span>}</label>
                <input type="number" value={prep.adr} onChange={e => up("adr", e.target.value)} placeholder="—" style={{ width:"100%", padding:"14px", borderRadius:12, border:"1px solid rgba(255,255,255,0.08)", fontSize:20, fontFamily:"'JetBrains Mono', monospace", fontWeight:700, background:"rgba(255,255,255,0.04)", color:"rgba(255,255,255,0.6)", boxSizing:"border-box", outline:"none", textAlign:"center" }} />
                {prevAdrs.length > 0 && <div style={{ fontSize:11, color:"rgba(255,255,255,0.2)", fontFamily:"'JetBrains Mono', monospace", marginTop:6, textAlign:"center" }}>
                  {prevAdrs.slice(0,3).map((a,i) => <span key={i}>{i>0?" · ":""}{a.adr}</span>)}
                </div>}
              </div>
              <div style={{ flex:1 }}>
                <label style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.4)", display:"block", marginBottom:8 }}>RVOL</label>
                <input type="number" step="1" value={prep.rvol} onChange={e => up("rvol", e.target.value)} placeholder="—" style={{ width:"100%", padding:"14px", borderRadius:12, border:`1px solid ${rvolR ? `${rvolR.border}` : "rgba(255,255,255,0.08)"}`, fontSize:20, fontFamily:"'JetBrains Mono', monospace", fontWeight:700, background: rvolR ? rvolR.bg : "rgba(255,255,255,0.04)", color: rvolR ? rvolR.color : "rgba(255,255,255,0.6)", boxSizing:"border-box", outline:"none", textAlign:"center" }} />
              </div>
              <div style={{ flex:1 }}>
                <label style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.4)", display:"block", marginBottom:8 }}>VIX</label>
                <input type="number" step="0.1" value={prep.vix} onChange={e => up("vix", e.target.value)} placeholder="—" style={{ width:"100%", padding:"14px", borderRadius:12, border:`1px solid ${vixR ? `${vixR.border}` : "rgba(255,255,255,0.08)"}`, fontSize:20, fontFamily:"'JetBrains Mono', monospace", fontWeight:700, background: vixR ? vixR.bg : "rgba(255,255,255,0.04)", color: vixR ? vixR.color : "rgba(255,255,255,0.6)", boxSizing:"border-box", outline:"none", textAlign:"center" }} />
              </div>
            </div>
            {/* VIX Regime */}
            {vixR && <div style={{ background:vixR.bg, borderRadius:12, padding:"12px 16px", marginBottom:10, display:"flex", alignItems:"center", justifyContent:"space-between", border:`1px solid ${vixR.border}` }}>
              <div><span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:11, fontWeight:700, color:vixR.color, letterSpacing:1.5 }}>VIX: {vixR.label}</span><span style={{ fontSize:13, color:"rgba(255,255,255,0.35)", marginLeft:12 }}>{vixR.desc}</span></div>
            </div>}
            {/* RVOL Regime */}
            {rvolR && <div style={{ background:rvolR.bg, borderRadius:12, padding:"12px 16px", marginBottom:10, display:"flex", alignItems:"center", justifyContent:"space-between", border:`1px solid ${rvolR.border}` }}>
              <div><span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:11, fontWeight:700, color:rvolR.color, letterSpacing:1.5 }}>RVOL: {rvolR.label}</span><span style={{ fontSize:13, color:"rgba(255,255,255,0.35)", marginLeft:12 }}>{rvolR.desc}</span></div>
            </div>}
            <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:12, padding:14, fontSize:11, color:"rgba(255,255,255,0.2)", lineHeight:1.9, fontFamily:"'JetBrains Mono', monospace" }}>
              <div style={{ marginBottom:4, fontWeight:600, color:"rgba(255,255,255,0.3)", letterSpacing:1 }}>VIX REGIMES</div>
              <div><span style={{color:"#38BDF8"}}>●</span> &lt;14 Ultra Low · compressed, watch for expansion</div>
              <div><span style={{color:"#10B981"}}>●</span> 14–20 Normal · standard conditions</div>
              <div><span style={{color:"#F48C06"}}>●</span> 20–25 Elevated · widen stops, reduce size</div>
              <div><span style={{color:"#E94560"}}>●</span> &gt;25 Stress · sit out or minimal size</div>
              <div style={{ marginTop:8, marginBottom:4, fontWeight:600, color:"rgba(255,255,255,0.3)", letterSpacing:1 }}>RVOL REGIMES</div>
              <div><span style={{color:"#8B95A8"}}>●</span> &lt;60 Dead · protect capital</div>
              <div><span style={{color:"#F48C06"}}>●</span> 60–85 Quiet · trade small and selective</div>
              <div><span style={{color:"#10B981"}}>●</span> 85–120 Active · run your playbook</div>
              <div><span style={{color:"#E94560"}}>●</span> &gt;120 Hot · A-setups only, adjust size</div>
              <div style={{ marginTop:10, paddingTop:8, borderTop:"1px solid rgba(255,255,255,0.04)", color:"rgba(255,255,255,0.25)", fontStyle:"italic", fontFamily:"inherit" }}>The market does not need high RVOL to grind all day. Low RVOL can still trend.</div>
            </div>
          </Card>

          {/* HTF CONTEXT - SPLIT INTO TREND + PRICE ACTION */}
          <Card style={{ marginBottom: 18 }}>
            <SectionLabel text="HTF / Context" color="#4361EE" />
            <div style={{ marginTop:12, marginBottom:6, fontFamily:"'JetBrains Mono', monospace", fontSize:10, letterSpacing:2, color:"rgba(255,255,255,0.3)", fontWeight:600 }}>TREND (EMAs)</div>
            <SelectField label="EMAs (Weekly)" value={prep.emasW} options={["Bullish","Bearish","Neutral"]} onChange={v => up("emasW", v)} />
            <SelectField label="EMAs (Daily)" value={prep.emasD} options={["Bullish","Bearish","Neutral"]} onChange={v => up("emasD", v)} />
            <div style={{ height:1, background:"rgba(255,255,255,0.06)", margin:"8px 0 16px" }} />
            <div style={{ marginBottom:6, fontFamily:"'JetBrains Mono', monospace", fontSize:10, letterSpacing:2, color:"rgba(255,255,255,0.3)", fontWeight:600 }}>PRICE ACTION</div>
            <SelectField label="Weekly Candle" value={prep.weeklyCandle} options={["Bullish","Bearish","Neutral"]} onChange={v => up("weeklyCandle", v)} />
            <SelectField label="Prior Daily Candle Close" value={prep.priorDaily} options={["Bullish","Bearish","Neutral"]} onChange={v => up("priorDaily", v)} />
          </Card>

          {/* VALUE & VOLUME */}
          <Card style={{ marginBottom: 18 }}>
            <SectionLabel text="Value & Volume" color="#A855F7" />
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", marginBottom: 16, lineHeight: 1.6 }}>Confirm each profile has been reviewed and levels marked.</p>
            <Checkbox label="Prior Day Profile reviewed" checked={prep.profilePriorDay} onChange={v => up("profilePriorDay", v)} color="#2DD4BF" />
            <Checkbox label="Developing Day Profile noted" checked={prep.profileDevDay} onChange={v => up("profileDevDay", v)} color="#2DD4BF" />
            <Checkbox label="Prior Week Profile reviewed" checked={prep.profilePriorWeek} onChange={v => up("profilePriorWeek", v)} color="#2DD4BF" />
            <Checkbox label="Developing Week Profile noted" checked={prep.profileDevWeek} onChange={v => up("profileDevWeek", v)} color="#2DD4BF" />
            <Checkbox label="Supply / Demand levels marked" checked={prep.sdLevels} onChange={v => up("sdLevels", v)} color="#2DD4BF" />
            <div style={{ height:1, background:"rgba(255,255,255,0.06)", margin:"16px 0" }} />
            <div style={{ marginBottom:6, fontFamily:"'JetBrains Mono', monospace", fontSize:10, letterSpacing:2, color:"rgba(255,255,255,0.3)", fontWeight:600 }}>AUCTION READ</div>
            <SelectField label="Where is price trying to go?" value={prep.auctionDirection} options={["Up","Down","Sideways"]} onChange={v => up("auctionDirection", v)} />
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", marginTop: -10, marginBottom: 14, paddingLeft: 2, fontStyle: "italic" }}>(Where is price not going? Tapers and rejections help frame this.)</div>
            <SelectField label="Is it doing a good job of getting there?" value={prep.auctionConviction} options={["Yes","No","Unclear"]} onChange={v => up("auctionConviction", v)} />
            <SelectField label="Where will market open vs yesterday's value?" value={prep.openVsValue} options={["Above Value","Inside Value","Below Value"]} onChange={v => up("openVsValue", v)} />
            <div style={{ marginTop: 10, background: "rgba(244,140,6,0.06)", borderRadius: 14, padding: 14, borderLeft: "3px solid rgba(244,140,6,0.4)" }}>
              <div style={{ fontSize: 13, color: "#F48C06", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>LIVE REMINDER</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>Reassess the developing volume profile as it builds throughout the session. Zones form live, not just pre-session.</div>
            </div>
          </Card>

          {/* INTRADAY */}
          <Card style={{ marginBottom: 18 }}>
            <SectionLabel text="Intraday" color="#2DD4BF" />
            <SelectField label="4H/1H 9EMA" value={prep.ema4h1h} options={["Bullish","Bearish","Neutral"]} onChange={v => up("ema4h1h", v)} />
            <SelectField label="4H/1H Price Action" value={prep.pa4h1h} options={["Bullish","Bearish","Neutral"]} onChange={v => up("pa4h1h", v)} />
            <SelectField label="Single Prints" value={prep.singlePrints} options={["Yes","No"]} onChange={v => up("singlePrints", v)} />
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 8 }}>Anomaly?</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["Poor High/Low","Excess","Naked POC","None"].map(o => {
                  const anomalies = Array.isArray(prep.anomaly) ? prep.anomaly : prep.anomaly ? [prep.anomaly] : [];
                  const isSelected = anomalies.includes(o);
                  const toggle = () => {
                    if (o === "None") { up("anomaly", isSelected ? [] : ["None"]); }
                    else {
                      let next = isSelected ? anomalies.filter(a => a !== o) : [...anomalies.filter(a => a !== "None"), o];
                      up("anomaly", next);
                    }
                  };
                  return <button key={o} onClick={toggle} style={{
                    flex: 1, minWidth: "22%", padding: "12px 8px", borderRadius: 12,
                    border: `1px solid ${isSelected ? (o === "None" ? "rgba(255,255,255,0.15)" : "rgba(244,140,6,0.4)") : "rgba(255,255,255,0.06)"}`,
                    background: isSelected ? (o === "None" ? "rgba(255,255,255,0.05)" : "rgba(244,140,6,0.1)") : "rgba(255,255,255,0.03)",
                    color: isSelected ? (o === "None" ? "rgba(255,255,255,0.6)" : "#F48C06") : "rgba(255,255,255,0.3)",
                    fontSize: 12, fontWeight: isSelected ? 700 : 500, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
                  }}>{o}</button>;
                })}
              </div>
            </div>
            <SelectField label="Session Rotation Factor" value={prep.rotationFactor} options={["Pushing Up","Pushing Down","Neutral"]} onChange={v => up("rotationFactor", v)} />
          </Card>

          {/* CONTEXT SUMMARY BAR */}
          {(() => {
            const combine = (a, b) => { if (a && b) return a === b ? a : "Mixed"; return a || b || null; };
            const dc = (v) => !v ? null : v === "Bullish" || v === "Up" || v === "Pushing Up" ? "#10B981" : v === "Bearish" || v === "Down" || v === "Pushing Down" ? "#E94560" : v === "Mixed" ? "#F48C06" : "rgba(255,255,255,0.4)";
            const dl = (v) => !v ? null : v === "Bullish" || v === "Up" || v === "Pushing Up" ? "▲" : v === "Bearish" || v === "Down" || v === "Pushing Down" ? "▼" : v === "Mixed" ? "◆" : "—";
            const wTrend = prep.emasW || null;
            const dCombined = combine(prep.emasD, prep.priorDaily);
            const intCombined = combine(prep.ema4h1h, prep.pa4h1h);
            const auc = prep.auctionDirection ? `${prep.auctionDirection}${prep.auctionConviction ? ` (${prep.auctionConviction})` : ""}` : null;
            const aucColor = prep.auctionDirection === "Up" ? "#10B981" : prep.auctionDirection === "Down" ? "#E94560" : prep.auctionDirection === "Sideways" ? "rgba(255,255,255,0.4)" : null;
            const hasData = vixR || rvolR || wTrend || dCombined || intCombined || auc;
            if (!hasData) return null;
            return (
              <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, padding: "14px 18px", marginBottom: 18, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, color: "rgba(255,255,255,0.25)", fontWeight: 600, marginBottom: 10 }}>SESSION CONTEXT</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 2 }}>
                  <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>{instrument}</span>
                  {vixR && <span style={{ color: vixR.color }}>VIX: {vixR.label}</span>}
                  {rvolR && <span style={{ color: rvolR.color }}>RVOL: {rvolR.label}</span>}
                  {wTrend && <span>W: <span style={{ color: dc(wTrend), fontWeight: 700 }}>{dl(wTrend)} {wTrend}</span></span>}
                  {dCombined && <span>D: <span style={{ color: dc(dCombined), fontWeight: 700 }}>{dl(dCombined)} {dCombined}</span></span>}
                  {intCombined && <span>Intra: <span style={{ color: dc(intCombined), fontWeight: 700 }}>{dl(intCombined)} {intCombined}</span></span>}
                  {auc && <span>Auction: <span style={{ color: aucColor, fontWeight: 700 }}>{auc}</span></span>}
                </div>
              </div>
            );
          })()}

          {/* SCENARIOS */}
          <Card style={{ marginBottom: 18 }}>
            <SectionLabel text="Session Plays" />
            {[["Bullish", "#10B981", [["bull1", "bull1Invalid", "Bullish Play 1"], ["bull2", "bull2Invalid", "Bullish Play 2"]]],
              ["Bearish", "#E94560", [["bear1", "bear1Invalid", "Bearish Play 1"], ["bear2", "bear2Invalid", "Bearish Play 2"]]]].map(([direction, color, plays]) => (
              <div key={direction} style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 1.5, color, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 12, height: 2, background: color, borderRadius: 1 }} />{direction.toUpperCase()}
                </div>
                {plays.map(([key, invalidKey, label]) => (
                  <div key={key} style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.35)", display: "block", marginBottom: 6 }}>{label}</label>
                    <textarea value={prep[key] || ""} onChange={e => up(key, e.target.value)} placeholder="Key levels, conditions, how to act..." rows={3} style={{ width:"100%", padding:14, borderRadius:14, border: prep[key] ? `1px solid ${color}22` : "1px solid rgba(255,255,255,0.08)", background: prep[key] ? `${color}04` : "rgba(255,255,255,0.04)", color:"rgba(255,255,255,0.7)", fontSize:15, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box", lineHeight: 1.7 }} />
                    <input type="text" value={prep[invalidKey] || ""} onChange={e => up(invalidKey, e.target.value)} placeholder="Invalidation:" style={{ width:"100%", padding:"10px 14px", borderRadius:10, border: prep[invalidKey] ? `1px solid ${color}15` : "1px solid rgba(255,255,255,0.06)", background: prep[invalidKey] ? `${color}03` : "rgba(255,255,255,0.02)", color:"rgba(255,255,255,0.5)", fontSize:13, fontFamily:"'JetBrains Mono', monospace", boxSizing:"border-box", marginTop:6 }} />
                  </div>
                ))}
              </div>
            ))}
            <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:12, padding:"12px 16px", border:"1px solid rgba(255,255,255,0.06)", fontSize:13, color:"rgba(255,255,255,0.3)", fontStyle:"italic", lineHeight:1.7 }}>My edge is at the extremes. No trades in the middle of the range, wait for price to reach my levels.</div>
          </Card>

          {/* PREVIOUS LESSONS */}
          {prevLessons && <div style={{ background: "rgba(16,185,129,0.06)", borderRadius: 16, padding: 18, marginBottom: 18, borderLeft: "3px solid rgba(16,185,129,0.4)" }}>
            <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "rgba(16,185,129,0.5)", letterSpacing: 1.5, fontWeight: 600, marginBottom: 10 }}>LESSONS FROM {formatDate(prevLessons.date).toUpperCase()}</div>
            {prevLessons.lesson && <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>LESSON</span>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginTop: 4 }}>{prevLessons.lesson}</div>
            </div>}
            {prevLessons.tomorrow && <div>
              <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>COMMITTED TO</span>
              <div style={{ fontSize: 14, color: "#10B981", lineHeight: 1.6, marginTop: 4 }}>{prevLessons.tomorrow}</div>
            </div>}
          </div>}

          {/* SESSION FOCUS */}
          <Card style={{ marginBottom: 18 }}>
            <SectionLabel text="Session Focus" color="#2DD4BF" />
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", marginBottom: 12, lineHeight: 1.6 }}>One thing to focus on this session. You'll rate yourself on this later.</p>
            {prevFocus && !prep.sessionFocus && <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.25)", letterSpacing: 1, marginBottom: 6 }}>PREVIOUS FOCUS</div>
              <div onClick={() => up("sessionFocus", prevFocus)} style={{ background: "rgba(45,212,191,0.06)", borderRadius: 12, padding: "12px 16px", border: "1px solid rgba(45,212,191,0.15)", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>{prevFocus}</span>
                <span style={{ fontSize: 11, color: "#2DD4BF", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, whiteSpace: "nowrap", marginLeft: 12 }}>USE →</span>
              </div>
            </div>}
            <textarea value={prep.sessionFocus} onChange={e => up("sessionFocus", e.target.value)} placeholder="e.g. Only take A+ setups at fresh HVNs..." rows={2} style={{ width:"100%", padding:14, borderRadius:14, border:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.04)", color:"rgba(255,255,255,0.7)", fontSize:15, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }} />
          </Card>

          {/* SYSTEM CHECKS */}
          <Card style={{ marginBottom: 18 }}>
            <SectionLabel text="System Checks" color="rgba(255,255,255,0.25)" />
            <Checkbox label="Sim Deactivated" checked={prep.simDeactivated} onChange={v => up("simDeactivated", v)} color="#2DD4BF" />
            <Checkbox label="Bracket Set" checked={prep.bracket} onChange={v => up("bracket", v)} color="#2DD4BF" />
            <Checkbox label="MINI / Micro Selected" checked={prep.miniMicro} onChange={v => up("miniMicro", v)} color="#2DD4BF" />
            <Checkbox label="Accounts Unlocked" checked={prep.accountsUnlocked} onChange={v => up("accountsUnlocked", v)} color="#2DD4BF" />
            <Checkbox label="Lag Check" checked={prep.lagCheck} onChange={v => up("lagCheck", v)} color="#2DD4BF" />
          </Card>

          <div style={{ marginTop: 8, marginBottom: 18, textAlign: "center" }}>
            <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 2, color: "rgba(255,255,255,0.2)", fontWeight: 600, marginBottom: 12 }}>RADICAL PERSONAL RESPONSIBILITY</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", lineHeight: 1.7, marginBottom: 20, maxWidth: 340, margin: "0 auto 20px" }}>My system works. My sole job is to follow it. My results are my responsibility. No excuses, no exceptions.</div>
          </div>
          <button onClick={savePrep} style={{ width: "100%", padding: 20, border: "none", borderRadius: 18, background: prepSaved ? "rgba(45,212,191,0.08)" : "linear-gradient(135deg, rgba(45,212,191,0.25), rgba(45,212,191,0.15))", color: prepSaved ? "rgba(45,212,191,0.5)" : "#2DD4BF", fontSize: 16, fontWeight: 700, cursor: prepSaved ? "default" : "pointer", fontFamily: "inherit", letterSpacing: 0.5, transition: "all 0.3s ease", border: prepSaved ? "1px solid rgba(45,212,191,0.15)" : "1px solid rgba(45,212,191,0.3)" }}>
            {prepSaved ? `✓ Committed & Saved (${instrument})` : `I Commit to Radical Personal Responsibility`}
          </button>

          {prepSaved && <div style={{ marginTop: 24, animation: "fadeIn 0.5s ease" }}>
            <div style={{ background: "linear-gradient(135deg, rgba(67,97,238,0.08), rgba(45,212,191,0.06))", borderRadius: 18, border: "1px solid rgba(67,97,238,0.15)", padding: "24px 22px" }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 3, color: "rgba(67,97,238,0.6)", fontWeight: 700, marginBottom: 14 }}>PRE-SESSION VISUALIZATION</div>
              <div style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", lineHeight: 1.8, marginBottom: 16 }}>Close your eyes for 2 minutes. Visualize today's primary play arriving at your key area. See yourself executing your entry model. Feel the fear rise as price pulls back. Watch yourself keep your hands off the stop loss. Breathe. Your system is managing risk. Watch the trade work.</div>
              <div style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", lineHeight: 1.8, marginBottom: 18 }}>Now visualize it stopping out. Feel that too. You followed the process. The loss is a cost of business. You are fine. Rehearse both outcomes so neither one surprises your nervous system.</div>
              <div style={{ background: "rgba(67,97,238,0.08)", borderRadius: 12, padding: "14px 16px", border: "1px solid rgba(67,97,238,0.12)" }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, color: "rgba(67,97,238,0.5)", fontWeight: 600, marginBottom: 8 }}>BOX BREATHING</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>4 counts in. 4 hold. 4 out. 4 hold. Two rounds. Then open your eyes and begin.</div>
              </div>
            </div>
          </div>}
        </div>}

        {/* SESSION REVIEW TAB */}
        {tab === "review" && <div style={{ animation: "fadeIn 0.3s ease" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}><SectionLabel text="Session Review" /><span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:12, color:"rgba(255,255,255,0.2)" }}>{todayKey()} · {instrument}</span></div>

          {/* SESSION FOCUS RATING */}
          <Card style={{ marginBottom: 18 }}>
            <SectionLabel text="Session Focus" color="#2DD4BF" />
            {(reviewPrepData?.sessionFocus || prep.sessionFocus) ? (
              <div style={{ background: "rgba(45,212,191,0.06)", borderRadius: 12, padding: "12px 16px", border: "1px solid rgba(45,212,191,0.15)", marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.25)", letterSpacing: 1, marginBottom: 4 }}>TODAY'S FOCUS</div>
                <div style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>{reviewPrepData?.sessionFocus || prep.sessionFocus}</div>
              </div>
            ) : <p style={{ fontSize: 13, color: "rgba(255,255,255,0.2)", marginBottom: 14 }}>No session focus set in prep.</p>}
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>How well did you stick to this focus?</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[1,2,3,4,5].map(n => { const color = n >= 4 ? "#10B981" : n >= 2 ? "#F48C06" : "#E94560"; return <button key={n} onClick={() => ur("focusRating", review.focusRating === n ? 0 : n)} style={{ flex:1, padding:"14px 0", borderRadius:12, border: review.focusRating === n ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.06)", background: review.focusRating === n ? `${color}15` : "rgba(255,255,255,0.03)", color: review.focusRating === n ? color : "rgba(255,255,255,0.3)", fontSize:18, fontWeight: review.focusRating === n ? 700 : 500, cursor:"pointer", fontFamily:"'JetBrains Mono', monospace" }}>{n}</button>; })}
            </div>
          </Card>

          {/* SCENARIO REVIEW */}
          <Card style={{ marginBottom: 18 }}>
            <SectionLabel text="Play Review" />
            {[["Bullish Play 1", "bull1", "bull1Invalid", "bull1Result", "bull1Traded", "bull1WhyNot", "#10B981"],
              ["Bullish Play 2", "bull2", "bull2Invalid", "bull2Result", "bull2Traded", "bull2WhyNot", "#10B981"],
              ["Bearish Play 1", "bear1", "bear1Invalid", "bear1Result", "bear1Traded", "bear1WhyNot", "#E94560"],
              ["Bearish Play 2", "bear2", "bear2Invalid", "bear2Result", "bear2Traded", "bear2WhyNot", "#E94560"]].map(([label, scenKey, invalidKey, resultKey, tradedKey, whyNotKey, color]) => {
              const scenario = reviewPrepData?.[scenKey] || prep[scenKey];
              const invalidation = reviewPrepData?.[invalidKey] || prep[invalidKey];
              if (!scenario) return null;
              return (
                <div key={label} style={{ marginBottom: 18, paddingBottom: 18, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 4, background: color, flexShrink: 0 }} />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: 0.5 }}>{label}</span>
                  </div>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, marginBottom: 6, marginLeft: 16 }}>{scenario}</div>
                  {invalidation && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono', monospace", marginBottom: 10, marginLeft: 16 }}>Invalidation: {invalidation}</div>}
                  <div style={{ marginLeft: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>Did this play out?</div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                      {["Played Out","Partially","Didn't Play Out"].map(o => <button key={o} onClick={() => ur(resultKey, review[resultKey] === o ? "" : o)} style={{ flex:1, padding:"10px 6px", borderRadius:10, border: `1px solid ${review[resultKey] === o ? (o === "Played Out" ? "rgba(16,185,129,0.4)" : o === "Partially" ? "rgba(244,140,6,0.4)" : "rgba(233,69,96,0.4)") : "rgba(255,255,255,0.06)"}`, background: review[resultKey] === o ? (o === "Played Out" ? "rgba(16,185,129,0.1)" : o === "Partially" ? "rgba(244,140,6,0.1)" : "rgba(233,69,96,0.1)") : "rgba(255,255,255,0.03)", color: review[resultKey] === o ? (o === "Played Out" ? "#10B981" : o === "Partially" ? "#F48C06" : "#E94560") : "rgba(255,255,255,0.3)", fontSize:11, fontWeight: review[resultKey] === o ? 700 : 500, cursor:"pointer", fontFamily:"inherit" }}>{o}</button>)}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>Did you trade it?</div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                      {["Yes","No","N/A"].map(o => <button key={o} onClick={() => ur(tradedKey, review[tradedKey] === o ? "" : o)} style={{ flex:1, padding:"10px 6px", borderRadius:10, border: `1px solid ${review[tradedKey] === o ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)"}`, background: review[tradedKey] === o ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)", color: review[tradedKey] === o ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.3)", fontSize:11, fontWeight: review[tradedKey] === o ? 700 : 500, cursor:"pointer", fontFamily:"inherit" }}>{o}</button>)}
                    </div>
                    {review[tradedKey] === "No" && <input type="text" value={review[whyNotKey] || ""} onChange={e => ur(whyNotKey, e.target.value)} placeholder="Why not?" style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:"1px solid rgba(255,255,255,0.06)", background:"rgba(255,255,255,0.03)", color:"rgba(255,255,255,0.5)", fontSize:13, fontFamily:"inherit", boxSizing:"border-box", marginTop:4 }} />}
                  </div>
                </div>
              );
            })}
          </Card>

          {/* POST-SESSION MENTAL CHECK */}
          <Card style={{ marginBottom: 18 }}>
            <SectionLabel text="Post-Session Mental Check" color="#A855F7" />
            {[["postEmotional", "Emotional Regulation", "How well did you manage stress and tilt?"],
              ["postDecision", "Decision Quality", "Were your decisions clear and process-driven?"],
              ["postPhysical", "Physical State", "Energy level and nervous system regulation?"]].map(([key, label, desc]) => {
              const v = review[key]; const color = v >= 4 ? "#10B981" : v >= 2 ? "#F48C06" : v > 0 ? "#E94560" : "rgba(255,255,255,0.15)";
              return <div key={key} style={{ marginBottom: 18 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                  <span style={{ fontSize:15, color:"rgba(255,255,255,0.6)", fontWeight:600 }}>{label}</span>
                  <span style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:22, color, width:36, textAlign:"center" }}>{v || "—"}</span>
                </div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.25)", marginBottom:10 }}>{desc}</div>
                <div style={{ display:"flex", gap:8 }}>
                  {[1,2,3,4,5].map(n => <button key={n} onClick={() => ur(key, review[key] === n ? 0 : n)} style={{
                    flex:1, padding:"12px 0", borderRadius:10, border: v === n ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.06)",
                    background: v === n ? `${color}15` : "rgba(255,255,255,0.03)", color: v === n ? color : "rgba(255,255,255,0.3)",
                    fontSize:16, fontWeight: v === n ? 700 : 500, cursor:"pointer", fontFamily:"'JetBrains Mono', monospace",
                  }}>{n}</button>)}
                </div>
              </div>;
            })}
          </Card>

          {/* RULE COMPLIANCE */}
          <Card style={{ marginBottom: 18 }}>
            <SectionLabel text="Rule Compliance" color="#4361EE" />
            {[["rulesTrend", "rulesTrendNote", "Traded with Trend / Tape"],
              ["rulesMarketCond", "rulesMarketCondNote", "Traded Inline with Market Condition (Rotational vs Imbalance)"],
              ["rulesTopBottom", "rulesTopBottomNote", "Avoided Picking Tops and Bottoms"],
              ["rulesPlays", "rulesPlaysNote", "Trades were from Pre Defined Plays"],
              ["rulesExecution", "rulesExecutionNote", "Execution Model Followed"],
              ["rulesFocus", "rulesFocusNote", "Stayed Focused and Avoided Distraction"],
              ["rulesConsol", "rulesConsolNote", "Avoided Entering During Consolidation"],
              ["rulesDLL", "rulesDLLNote", "DLL Respected"]].map(([key, noteKey, label]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>{label}</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {["Followed","Broke","N/A"].map(o => <button key={o} onClick={() => ur(key, review[key] === o ? "" : o)} style={{ flex:1, padding:"10px 6px", borderRadius:10, border: `1px solid ${review[key] === o ? (o === "Followed" ? "rgba(16,185,129,0.4)" : o === "Broke" ? "rgba(233,69,96,0.4)" : "rgba(255,255,255,0.15)") : "rgba(255,255,255,0.06)"}`, background: review[key] === o ? (o === "Followed" ? "rgba(16,185,129,0.1)" : o === "Broke" ? "rgba(233,69,96,0.1)" : "rgba(255,255,255,0.05)") : "rgba(255,255,255,0.03)", color: review[key] === o ? (o === "Followed" ? "#10B981" : o === "Broke" ? "#E94560" : "rgba(255,255,255,0.6)") : "rgba(255,255,255,0.3)", fontSize:12, fontWeight: review[key] === o ? 700 : 500, cursor:"pointer", fontFamily:"inherit" }}>{o}</button>)}
                </div>
                {review[key] === "Broke" && <input type="text" value={review[noteKey] || ""} onChange={e => ur(noteKey, e.target.value)} placeholder="What happened?" style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:"1px solid rgba(233,69,96,0.2)", background:"rgba(233,69,96,0.04)", color:"rgba(255,255,255,0.5)", fontSize:13, fontFamily:"inherit", boxSizing:"border-box", marginTop:6 }} />}
              </div>
            ))}
          </Card>

          {/* BIGGEST LESSON & TOMORROW */}
          <Card style={{ marginBottom: 18 }}>
            <SectionLabel text="Lessons" color="#10B981" />
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 8 }}>Biggest lesson from today</label>
              <textarea value={review.biggestLesson} onChange={e => ur("biggestLesson", e.target.value)} placeholder='e.g. "Today I was influenced by price and disregarded my plan and bias."' rows={2} style={{ width:"100%", padding:14, borderRadius:14, border:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.04)", color:"rgba(255,255,255,0.7)", fontSize:15, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box", lineHeight:1.7 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 8 }}>Tomorrow I will...</label>
              <textarea value={review.tomorrowWill} onChange={e => ur("tomorrowWill", e.target.value)} placeholder='e.g. "Have a clear invalidation to plan/bias and see price as opportunity until invalidation."' rows={2} style={{ width:"100%", padding:14, borderRadius:14, border:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.04)", color:"rgba(255,255,255,0.7)", fontSize:15, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box", lineHeight:1.7 }} />
            </div>
          </Card>

          {/* WIND DOWN */}
          <div style={{ background: "rgba(168,85,247,0.06)", borderRadius: 16, padding: 18, marginBottom: 18, borderLeft: "3px solid rgba(168,85,247,0.4)" }}>
            <div style={{ fontSize: 13, color: "#A855F7", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>WIND DOWN</div>
            <div style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", lineHeight: 1.8 }}>Step away from charts. 10 minutes meditation or a walk outside before reviewing P&L. Let the session settle before drawing conclusions.</div>
          </div>

          <SaveButton saved={reviewSaved} onClick={saveReview} label={`Save Review (${instrument})`} />
        </div>}

        {/* PREP LOG TAB */}
        {tab === "log" && <div style={{ animation: "fadeIn 0.3s ease" }}>
          <SectionLabel text="Prep History" />
          {prepLog.length === 0 ? <Card style={{ textAlign:"center", padding:52 }}><div style={{ fontSize:40, marginBottom:14, opacity:0.3 }}>◫</div><div style={{ color:"rgba(255,255,255,0.25)", fontSize:16 }}>No preps logged yet.</div></Card> : <>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:22 }}>
              {prepLog.map((entry, i) => <button key={i} onClick={() => loadLogEntry(entry)} style={{
                padding:"10px 16px", borderRadius:12, cursor:"pointer",
                border: logSelected?.key === entry.key ? "1px solid rgba(45,212,191,0.4)" : "1px solid rgba(255,255,255,0.06)",
                background: logSelected?.key === entry.key ? "rgba(45,212,191,0.1)" : "rgba(255,255,255,0.03)",
                fontSize:12, fontFamily:"'JetBrains Mono', monospace",
                fontWeight: logSelected?.key === entry.key ? 700 : 400,
                color: logSelected?.key === entry.key ? "#2DD4BF" : "rgba(255,255,255,0.35)",
              }}>{formatDate(entry.date)} <span style={{ color:"#2DD4BF", fontWeight:700, marginLeft:6 }}>{entry.instrument}</span></button>)}
            </div>

            {logSelected && !logData && <Card style={{ textAlign:"center", padding:30 }}><div style={{ color:"rgba(255,255,255,0.25)", fontFamily:"'JetBrains Mono', monospace", fontSize:12 }}>Loading...</div></Card>}

            {logSelected && logData && <div>
              {/* CHECK-IN */}
              {logData.checkin && <Card style={{ marginBottom:14 }}>
                <SectionLabel text="Check-In" color="#4361EE" />
                <div style={{ fontSize:15, color:"rgba(255,255,255,0.5)", lineHeight:2.2 }}>
                  {logData.checkin.whoopSleep && <div><strong style={{ color:"rgba(255,255,255,0.7)" }}>Whoop:</strong> Sleep {logData.checkin.whoopSleep}% · Recovery {logData.checkin.whoopRecovery}% {logData.checkin.whoopGate && <span style={{ color:gateColor(logData.checkin.whoopGate), fontFamily:"'JetBrains Mono', monospace", fontWeight:700, marginLeft:10 }}>{logData.checkin.whoopGate}</span>}</div>}
                  {logData.checkin.mentalScores && (logData.checkin.mentalScores[0] > 0 || logData.checkin.mentalScores[1] > 0) && <div><strong style={{ color:"rgba(255,255,255,0.7)" }}>Mental:</strong> Awareness {logData.checkin.mentalScores[0]}/5 · Connected {logData.checkin.mentalScores[1]}/5</div>}
                  {logData.checkin.otherChecks && <div><strong style={{ color:"rgba(255,255,255,0.7)" }}>Ready:</strong> {["Hydrated","Exercised","Meditated","Foundation"].filter((_, i) => logData.checkin.otherChecks[i]).join(", ") || "None"}</div>}
                  {logData.checkin.schemaScores && Math.max(...logData.checkin.schemaScores) > 0 && <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}><strong style={{ color:"rgba(255,255,255,0.7)" }}>Schema Scores:</strong>{logData.checkin.schemaScores.map((s,i) => <span key={i} style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, color:s>5?"#E94560":s>3?"#F48C06":"#10B981" }}>{s}</span>)}</div>}
                </div>
              </Card>}

              {/* PREP */}
              {logData.prep && <Card style={{ marginBottom:14 }}>
                <SectionLabel text="Prep" color="#2DD4BF" />
                <div style={{ fontSize:15, color:"rgba(255,255,255,0.5)", lineHeight:2.2 }}>
                  {logData.prep.vix && <div><strong style={{ color:"rgba(255,255,255,0.7)" }}>VIX:</strong> {logData.prep.vix} {VIX_REGIME(logData.prep.vix) && <span style={{ color:VIX_REGIME(logData.prep.vix).color, fontFamily:"'JetBrains Mono', monospace", fontWeight:700, marginLeft:10 }}>{VIX_REGIME(logData.prep.vix).label}</span>}</div>}
                  {logData.prep.rvol && <div><strong style={{ color:"rgba(255,255,255,0.7)" }}>RVOL:</strong> {logData.prep.rvol} {RVOL_REGIME(logData.prep.rvol) && <span style={{ color:RVOL_REGIME(logData.prep.rvol).color, fontFamily:"'JetBrains Mono', monospace", fontWeight:700, marginLeft:10 }}>{RVOL_REGIME(logData.prep.rvol).label}</span>}</div>}
                  {logData.prep.adr && <div><strong style={{ color:"rgba(255,255,255,0.7)" }}>ADR:</strong> {logData.prep.adr}</div>}
                  {logData.prep.emasW && <div><strong style={{ color:"rgba(255,255,255,0.7)" }}>Trend:</strong> W: {logData.prep.emasW} / D: {logData.prep.emasD || "—"}</div>}
                  {logData.prep.weeklyCandle && <div><strong style={{ color:"rgba(255,255,255,0.7)" }}>Price Action:</strong> W: {logData.prep.weeklyCandle} / D: {logData.prep.priorDaily || "—"}</div>}
                  {logData.prep.auctionDirection && <div><strong style={{ color:"rgba(255,255,255,0.7)" }}>Auction:</strong> {logData.prep.auctionDirection} {logData.prep.auctionConviction && `(${logData.prep.auctionConviction})`} {logData.prep.openVsValue && `· Open: ${logData.prep.openVsValue}`}</div>}
                  {logData.prep.sessionFocus && <div><strong style={{ color:"rgba(255,255,255,0.7)" }}>Focus:</strong> {logData.prep.sessionFocus}</div>}
                  {logData.prep.bull1 && <div style={{ marginTop:4 }}><span style={{ color:"#10B981", fontFamily:"'JetBrains Mono', monospace", fontSize:11, fontWeight:700 }}>Bull 1</span> <span style={{ color:"rgba(255,255,255,0.4)" }}>{logData.prep.bull1}</span></div>}
                  {logData.prep.bull2 && <div><span style={{ color:"#10B981", fontFamily:"'JetBrains Mono', monospace", fontSize:11, fontWeight:700 }}>Bull 2</span> <span style={{ color:"rgba(255,255,255,0.4)" }}>{logData.prep.bull2}</span></div>}
                  {logData.prep.bear1 && <div><span style={{ color:"#E94560", fontFamily:"'JetBrains Mono', monospace", fontSize:11, fontWeight:700 }}>Bear 1</span> <span style={{ color:"rgba(255,255,255,0.4)" }}>{logData.prep.bear1}</span></div>}
                  {logData.prep.bear2 && <div><span style={{ color:"#E94560", fontFamily:"'JetBrains Mono', monospace", fontSize:11, fontWeight:700 }}>Bear 2</span> <span style={{ color:"rgba(255,255,255,0.4)" }}>{logData.prep.bear2}</span></div>}
                </div>
              </Card>}

              {/* REVIEW */}
              {logData.review && <Card style={{ marginBottom:14 }}>
                <SectionLabel text="Review" color="#F48C06" />
                <div style={{ fontSize:15, color:"rgba(255,255,255,0.5)", lineHeight:2.2 }}>
                  {logData.review.focusRating > 0 && <div><strong style={{ color:"rgba(255,255,255,0.7)" }}>Focus Rating:</strong> <span style={{ color:logData.review.focusRating>=4?"#10B981":logData.review.focusRating>=2?"#F48C06":"#E94560", fontFamily:"'JetBrains Mono', monospace", fontWeight:700 }}>{logData.review.focusRating}/5</span></div>}
                  {(logData.review.postEmotional > 0 || logData.review.postDecision > 0 || logData.review.postPhysical > 0) && <div><strong style={{ color:"rgba(255,255,255,0.7)" }}>Post-Mental:</strong> Emotion {logData.review.postEmotional}/5 · Decision {logData.review.postDecision}/5 · Physical {logData.review.postPhysical}/5</div>}
                  {logData.review.biggestLesson && <div><strong style={{ color:"rgba(255,255,255,0.7)" }}>Lesson:</strong> {logData.review.biggestLesson}</div>}
                  {logData.review.tomorrowWill && <div><strong style={{ color:"#10B981" }}>Tomorrow:</strong> {logData.review.tomorrowWill}</div>}
                </div>
              </Card>}

              {!logData.prep && !logData.checkin && !logData.review && <Card style={{ textAlign:"center", padding:30 }}><div style={{ color:"rgba(255,255,255,0.25)", fontSize:14 }}>No data found for this date.</div></Card>}
            </div>}
          </>}
        </div>}
      </div>
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
  const [al, setAl] = useState({ time:"", happened:"", feeling:"", bodyLocation:"", urge:"", schema:"", interrupt:"", outcome:"" });
  const [sa, setSa] = useState([]); const [dl, setDl] = useState([]);
  const [ps, setPs] = useState({}); const [pss, setPss] = useState(false);
  const [wrev, setWrev] = useState({}); const [wrs, setWrs] = useState(false);
  const [hk, setHk] = useState([]); const [sh, setSh] = useState(null); const [hd, setHd] = useState(null);
  const [nn, setNn] = useState(false);
  const wg = getWhoopGate(ws, wr);

  useEffect(() => { (async () => {
    const k = todayKey();
    const [ch, sa_data, dl_data] = await Promise.all([
      loadData(`checkin-${k}`, null),
      loadData(`activations-${k}`, []),
      loadData(`dll-${k}`, []),
    ]);
    if (ch) { setWs(ch.whoopSleep||""); setWr(ch.whoopRecovery||""); setOc(ch.otherChecks||[false,false,false,false]); setSs(ch.schemaScores||[0,0,0,0,0]); setCs(true); }
    setSa(sa_data); setDl(dl_data);
    setLoading(false);
    // Load history keys in background
    try { const keys = await storage.list("checkin-"); if (keys?.keys) setHk(keys.keys.map(k=>k.replace("checkin-","")).sort().reverse()); } catch {}
  })(); }, []);

  const saveCheckin = async () => { await saveData(`checkin-${todayKey()}`, { whoopSleep:ws, whoopRecovery:wr, otherChecks:oc, schemaScores:ss, whoopGate:wg, timestamp:new Date().toISOString() }); setCs(true); };
  const saveAct = async () => { const u = [...sa, { ...al, timestamp:new Date().toISOString() }]; await saveData(`activations-${todayKey()}`, u); setSa(u); setAl({ time:"", happened:"", feeling:"", bodyLocation:"", urge:"", schema:"", interrupt:"", outcome:"" }); };
  const logDll = async (e) => { const u = [...dl, e]; await saveData(`dll-${todayKey()}`, u); setDl(u); };
  const savePost = async () => { await saveData(`post-${todayKey()}`, { ...ps, timestamp:new Date().toISOString() }); setPss(true); };
  const saveWeek = async () => { await saveData(`weekly-${weekKey()}`, { ...wrev, timestamp:new Date().toISOString() }); setWrs(true); };
  const loadHist = async (d) => { setSh(d); setHd({ checkin:await loadData(`checkin-${d}`,null), activations:await loadData(`activations-${d}`,[]), post:await loadData(`post-${d}`,null), dll:await loadData(`dll-${d}`,[]) }); };

  if (loading) return <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:"100vh", color:"rgba(255,255,255,0.3)" }}>Loading...</div>;

  const tabs = [{id:"schemas",label:"Schemas",icon:"☰"},{id:"activation",label:"Live",icon:"⚡"},{id:"dll",label:"DLL",icon:"⊘"},{id:"history",label:"Log",icon:"◫"}];

  const maxS = Math.max(...ss); const sg = maxS>5?"RED":maxS>3?"AMBER":"GREEN";
  const go = {GREEN:0,AMBER:1,RED:2}; const fg = !wg ? sg : go[wg]>go[sg] ? wg : sg;
  const gc = {GREEN:{c:"#10B981",g:"rgba(16,185,129,0.12)",l:"FULL SIZE",m:"Ready to hunt. Patience is the edge.",i:"●"},AMBER:{c:"#F48C06",g:"rgba(244,140,6,0.12)",l:"HALF SIZE",m:"A+ setups only. Reduced size.",i:"◐"},RED:{c:"#E94560",g:"rgba(233,69,96,0.12)",l:"NO TRADE",m:"Walk away. Protect capital & progress.",i:"○"}};
  const fgc = gc[fg]; const dp = []; if(wg&&wg!=="GREEN") dp.push(`Whoop: ${wg}`); if(sg!=="GREEN") dp.push(`Schemas: ${sg}`);

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ padding: "32px 24px 0" }}>
        <BackButton onClick={onBack} />
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 3, color: "rgba(45,212,191,0.5)", fontWeight: 600 }}>SCHEMA AWARENESS</div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, marginTop: 3, color: "rgba(255,255,255,0.7)" }}>Mental Game</div>
        </div>
        <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 4, position: "sticky", top: 0, zIndex: 100 }}>
          {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ flex:1, padding:"12px 4px", border:"none", borderRadius:13, cursor:"pointer", background:tab===t.id?(t.id==="dll"?"rgba(233,69,96,0.25)":"rgba(45,212,191,0.15)"):"transparent", color:tab===t.id?(t.id==="dll"?"#E94560":"#2DD4BF"):(t.id==="dll"?"rgba(233,69,96,0.4)":"rgba(255,255,255,0.25)"), fontFamily:"inherit", fontSize:12, fontWeight:tab===t.id?700:500, transition:"all 0.2s", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}><span style={{fontSize:16}}>{t.icon}</span>{t.label}</button>)}
        </div>
      </div>
      <div style={{ padding: "28px 20px 60px" }}>

        {tab === "schemas" && <div style={{ animation: "fadeIn 0.3s ease" }}>

          {/* FOUNDATION */}
          <div style={{ background: "linear-gradient(135deg, rgba(45,212,191,0.06), rgba(67,97,238,0.06))", borderRadius: 22, border: "1px solid rgba(45,212,191,0.12)", padding: "28px 24px", marginBottom: 28 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 4, color: "rgba(45,212,191,0.6)", fontWeight: 700, marginBottom: 16 }}>FOUNDATION</div>
            <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.5, color: "rgba(255,255,255,0.65)", marginBottom: 20 }}>I am building my freedom. Every session I follow my system, I move further from my old career, not closer to it.</div>
            <div style={{ fontSize: 15, color: "rgba(45,212,191,0.5)", lineHeight: 1.8, marginBottom: 18, fontStyle: "italic" }}>I trade for my partner, my family, and the future we are building together. This is bigger than any single session.</div>
            <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 0 18px" }} />
            <div style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.8, marginBottom: 16 }}>Fear is the common thread. Fear of loss makes me close winners early. Fear of being wrong makes me hesitate on A+ setups. Fear of failure keeps me watching P&L instead of trusting the process. But fear is lying. It treats every trade like the crypto loss, and they are not the same thing.</div>
            <div style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.8, marginBottom: 18 }}>The truth: I have a proven system backed by months of data. When I follow it, it works. I have always achieved what I put my mind to and I have the results to prove it. My savings are runway for executing with conviction, not a countdown clock for trading from fear.</div>
            <div style={{ background: "rgba(45,212,191,0.08)", borderRadius: 14, padding: "18px 20px", border: "1px solid rgba(45,212,191,0.15)" }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 3, color: "rgba(45,212,191,0.5)", fontWeight: 600, marginBottom: 10 }}>QUALIFIED RISK IS MY PROFESSION</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.8 }}>Risk taken through my system, at my key areas, with my execution framework and a stop loss in place is not gambling. That is my job. Hesitating on qualified setups costs more than any single loss. The only path back to the old career is abandoning my process. The process is the way out.</div>
            </div>
          </div>

          <p style={{ fontSize:15, color:"rgba(255,255,255,0.35)", lineHeight:1.7, marginBottom:22 }}>Your three core threat patterns. Tap to expand.</p>
          {Object.entries(SCHEMAS).map(([key, s]) => (
            <ExpandableCard key={key} item={{...s, iconColor: key==="standards"?"rgba(255,255,255,0.5)":"#fff"}} expanded={exp===key} onToggle={() => setExp(exp===key?null:key)} hideIcon>
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

        {tab === "activation" && <div style={{ animation:"fadeIn 0.3s ease" }}>
          <p style={{fontSize:15,color:"rgba(255,255,255,0.35)",lineHeight:1.7,marginBottom:22}}>Pausing to fill this in <em>is</em> the intervention.</p>
          <Card style={{marginBottom:18}}><SectionLabel text="New Activation" color="#E94560" />
            {[{key:"time",label:"Time",placeholder:"e.g. 10:32 AM"},{key:"happened",label:"What happened?",placeholder:"Price action, P&L change..."},{key:"feeling",label:"What am I feeling?",placeholder:"Fear, anger, urgency..."},{key:"bodyLocation",label:"Where in my body?",placeholder:"Chest, stomach, jaw..."},{key:"urge",label:"The urge?",placeholder:"Close, move SL, unlock DLL..."},{key:"schema",label:"Which schema fired?",type:"select",options:["Abandonment","Defectiveness","Unrelenting Standards"]},{key:"interrupt",label:"Pattern interrupt used",placeholder:"Write your phrase..."},{key:"outcome",label:"What did I do?",type:"select",options:["Followed plan","Deviated"]}].map(f => <InputField key={f.key} label={f.label} value={al[f.key]} onChange={v=>setAl({...al,[f.key]:v})} type={f.type} options={f.options} placeholder={f.placeholder} />)}
            <button onClick={saveAct} disabled={!al.feeling} style={{width:"100%",padding:18,border:"none",borderRadius:16,background:al.feeling?"linear-gradient(135deg, #E94560, #C62A47)":"rgba(255,255,255,0.05)",color:al.feeling?"#fff":"rgba(255,255,255,0.2)",fontSize:16,fontWeight:700,cursor:al.feeling?"pointer":"default",fontFamily:"inherit"}}>Log Activation</button>
          </Card>
          {sa.length>0&&<Card><SectionLabel text={`Today's Activations (${sa.length})`} color="#E94560" />{sa.map((a,i) => <div key={i} style={{padding:"16px 0",borderBottom:i<sa.length-1?"1px solid rgba(255,255,255,0.04)":"none",fontSize:15}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}><span style={{fontFamily:"'JetBrains Mono', monospace",fontWeight:600,fontSize:13,color:"rgba(255,255,255,0.6)"}}>{a.time||"—"}</span><span style={{fontSize:11,padding:"4px 12px",borderRadius:8,fontWeight:600,fontFamily:"'JetBrains Mono', monospace",background:a.outcome==="Followed plan"?"rgba(16,185,129,0.15)":"rgba(233,69,96,0.15)",color:a.outcome==="Followed plan"?"#10B981":"#E94560"}}>{a.outcome||"—"}</span></div><div style={{color:"rgba(255,255,255,0.5)"}}><strong style={{color:"rgba(255,255,255,0.7)"}}>{a.schema}</strong>: {a.feeling}</div>{a.cascadeFrom&&a.cascadeFrom!=="No, this was the first"&&<div style={{fontSize:12,color:"rgba(255,255,255,0.3)",marginTop:4,fontFamily:"'JetBrains Mono', monospace"}}>CASCADE: {a.cascadeFrom}</div>}{a.interrupt&&<div style={{color:"rgba(255,255,255,0.3)",fontStyle:"italic",marginTop:5,fontSize:14}}>"{a.interrupt}"</div>}</div>)}</Card>}
        </div>}

        {tab === "dll" && <div style={{ animation:"fadeIn 0.3s ease" }}>
          <div style={{textAlign:"center",marginBottom:28}}><div style={{fontFamily:"'JetBrains Mono', monospace",fontSize:11,letterSpacing:3,color:"#E94560",fontWeight:600,marginBottom:10}}>CIRCUIT BREAKER</div><div style={{fontSize:18,fontWeight:700,color:"rgba(255,255,255,0.7)"}}>DLL Unlock Protocol</div><div style={{fontSize:15,color:"rgba(255,255,255,0.3)",marginTop:8,lineHeight:1.6}}>Work through each step before making any decision.</div></div>
          <DLLBreaker onLog={logDll} />
          {dl.length>0&&<Card style={{marginTop:24}}><SectionLabel text={`Today's DLL Events (${dl.length})`} color="#E94560" />{dl.map((d,i) => <div key={i} style={{padding:"14px 0",borderBottom:i<dl.length-1?"1px solid rgba(255,255,255,0.04)":"none",fontSize:15}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{color:"rgba(255,255,255,0.5)"}}>{d.schema||"—"}</span><span style={{fontSize:11,padding:"4px 12px",borderRadius:8,fontWeight:600,fontFamily:"'JetBrains Mono', monospace",background:d.keptLocked?"rgba(16,185,129,0.15)":"rgba(233,69,96,0.15)",color:d.keptLocked?"#10B981":"#E94560"}}>{d.keptLocked?(d.changedMind?"CHANGED MIND":"KEPT LOCKED"):"UNLOCKED"}</span></div></div>)}</Card>}
        </div>}

        {tab === "history" && <div style={{animation:"fadeIn 0.3s ease"}}><SectionLabel text="Session History" />
          {hk.length===0?<Card style={{textAlign:"center",padding:52}}><div style={{fontSize:40,marginBottom:14,opacity:0.3}}>◫</div><div style={{color:"rgba(255,255,255,0.25)",fontSize:16}}>No sessions logged yet.</div></Card>:<>
            <div style={{display:"flex",flexWrap:"wrap",gap:10,marginBottom:22}}>{hk.map(d => <button key={d} onClick={()=>loadHist(d)} style={{padding:"10px 16px",borderRadius:12,cursor:"pointer",border:sh===d?"1px solid rgba(45,212,191,0.4)":"1px solid rgba(255,255,255,0.06)",background:sh===d?"rgba(45,212,191,0.1)":"rgba(255,255,255,0.03)",fontSize:13,fontFamily:"'JetBrains Mono', monospace",fontWeight:sh===d?700:400,color:sh===d?"#2DD4BF":"rgba(255,255,255,0.35)"}}>{formatDate(d)}</button>)}</div>
            {hd&&<div>
              {hd.checkin&&<Card style={{marginBottom:14}}><SectionLabel text="Pre-Session" color="#4361EE" /><div style={{fontSize:15,color:"rgba(255,255,255,0.5)",lineHeight:2.2}}>{hd.checkin.whoopSleep&&<div><strong style={{color:"rgba(255,255,255,0.7)"}}>Whoop:</strong> Sleep {hd.checkin.whoopSleep}% · Recovery {hd.checkin.whoopRecovery}%{hd.checkin.whoopGate&&<span style={{color:gateColor(hd.checkin.whoopGate),fontFamily:"'JetBrains Mono', monospace",fontWeight:700,marginLeft:10}}>{hd.checkin.whoopGate}</span>}</div>}<div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><strong style={{color:"rgba(255,255,255,0.7)"}}>Schema Scores:</strong>{hd.checkin.schemaScores?.map((s,i) => <span key={i} style={{fontFamily:"'JetBrains Mono', monospace",fontWeight:700,color:s>5?"#E94560":s>3?"#F48C06":"#10B981"}}>{s}</span>)}</div></div></Card>}
              {hd.activations?.length>0&&<Card style={{marginBottom:14}}><SectionLabel text={`Activations (${hd.activations.length})`} color="#E94560" />{hd.activations.map((a,i) => <div key={i} style={{padding:"12px 0",borderBottom:i<hd.activations.length-1?"1px solid rgba(255,255,255,0.04)":"none",fontSize:15}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontFamily:"'JetBrains Mono', monospace",fontSize:12,color:"rgba(255,255,255,0.4)"}}>{a.time}</span><span style={{fontSize:11,color:a.outcome==="Followed plan"?"#10B981":"#E94560",fontFamily:"'JetBrains Mono', monospace",fontWeight:600}}>{a.outcome}</span></div><div style={{color:"rgba(255,255,255,0.5)",marginTop:3}}><strong style={{color:"rgba(255,255,255,0.6)"}}>{a.schema}</strong>: {a.feeling}</div>{a.cascadeFrom&&a.cascadeFrom!=="No, this was the first"&&<div style={{fontSize:12,color:"rgba(255,255,255,0.25)",marginTop:3,fontFamily:"'JetBrains Mono', monospace"}}>CASCADE: {a.cascadeFrom}</div>}</div>)}</Card>}
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
      {page === "prep" && <MarketPrep onBack={() => setPage("landing")} />}
      {page === "playbook" && <Playbook onBack={() => setPage("landing")} />}
      {page === "review" && <WeeklyReview onBack={() => setPage("landing")} />}
      {page === "mental" && <MentalGameFramework onBack={() => setPage("landing")} />}
      {page === "fundamentals" && <MarketFundamentals onBack={() => setPage("landing")} />}
    </div>
  );
}
