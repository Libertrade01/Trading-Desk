"use client";
import { useState, useEffect, useCallback } from "react";
import { storage } from "@/lib/supabase";

const SCHEMAS = {
  abandonment: {
    name: "Abandonment",
    subtitle: "Grab It Before It's Gone",
    color: "#E94560",
    gradient: "linear-gradient(135deg, #E94560 0%, #C62A47 100%)",
    bg: "rgba(233,69,96,0.06)",
    icon: "⚡",
    trigger: "Unrealised profit on an open position. A winner that starts to pull back.",
    belief: "Good things get taken away. The $500K crypto loss encoded this at a survival level.",
    body: "Chest tightness, urgency, restless hands hovering over close button.",
    interrupts: [
      "This is not the crypto trade. I have a stop loss. My system is managing risk.",
      "Grabbing profit early is my fear talking, not my system.",
      "Every time I cut a winner early, I make the abandonment story come true.",
      "Let the market do the heavy lifting. I am capable of receiving this.",
    ],
    reset: "Hands off keyboard. Three slow breaths. Feel your feet on the floor. You are safe.",
  },
  defectiveness: {
    name: "Defectiveness",
    subtitle: "I Have to Prove Myself",
    color: "#4361EE",
    gradient: "linear-gradient(135deg, #4361EE 0%, #3A0CA3 100%)",
    bg: "rgba(67,97,238,0.06)",
    icon: "🛡",
    trigger: "A loss, multiple losses, hitting DLL. Feeling like you made a mistake.",
    belief: "Losses confirm I'm not adequate. This fires in relationships too — when unappreciated.",
    body: "Heat in face/chest, jaw tightening, compulsive drive to re-enter immediately.",
    interrupts: [
      "A loss is a cost of business, not evidence of who I am.",
      "The DLL exists to protect me. Respecting it IS the professional move.",
      "Revenge trading has never once made me feel better.",
      "Walking away right now is the strongest thing I can do.",
    ],
    reset: "Stand up. Walk away for 5 minutes. Splash cold water on your face.",
  },
  standards: {
    name: "Unrelenting Standards",
    subtitle: "It Has to Be Perfect",
    color: "#F48C06",
    gradient: "linear-gradient(135deg, #F48C06 0%, #DC6C02 100%)",
    bg: "rgba(244,140,6,0.06)",
    icon: "△",
    trigger: "A solid A+ setup that isn't at the exact top or bottom.",
    belief: "Anything less than perfect isn't good enough. This extends beyond trading.",
    body: "Dissatisfaction after profitable trades, inability to step away from charts.",
    interrupts: [
      "A+ is the standard. Not perfect. A+ builds accounts.",
      "Picking tops & bottoms is picking a fight I'm likely to lose.",
      "A good entry with proper management beats a perfect entry I never took.",
      "Conserve mental capital. Perform better. Be selective.",
    ],
    reset: "Close the 1-minute chart. Zoom out. Look at the higher timeframe trend.",
  },
};

const CHECKIN_QUESTIONS = [
  { q: "Anxiety about losing money today?", schema: "ABANDON" },
  { q: "Need to 'prove' something today?", schema: "DEFECT" },
  { q: "Fixated on making today 'perfect'?", schema: "STANDARD" },
  { q: "Something personal activating me?", schema: "ALL" },
  { q: "Trading to recover yesterday?", schema: "DEFECT" },
];

const POST_SESSION_FIELDS = [
  { key: "preScores", label: "Pre-session schema scores" },
  { key: "gateColor", label: "Decision gate colour", type: "select", options: ["GREEN", "AMBER", "RED"] },
  { key: "activations", label: "Times activated" },
  { key: "dominantSchema", label: "Schema that fired most", type: "select", options: ["Abandonment", "Defectiveness", "Standards", "None"] },
  { key: "cascadePattern", label: "Most common cascade pattern" },
  { key: "dllUrges", label: "DLL unlock urges today", type: "select", options: ["0", "1", "2", "3+"] },
  { key: "dllOutcome", label: "DLL outcome", type: "select", options: ["No urges", "Used breaker — stayed locked", "Unlocked", "N/A"] },
  { key: "usedInterrupts", label: "Used pattern interrupts?", type: "select", options: ["Yes", "No", "Partially"] },
  { key: "interruptsWorked", label: "Did they work?", type: "select", options: ["Yes", "No", "Partially", "N/A"] },
  { key: "deviated", label: "Deviated from CSTE?", type: "select", options: ["Yes", "No"] },
  { key: "deviationSchema", label: "If deviated, which schema?" },
  { key: "bestMoment", label: "Best moment" },
  { key: "worstMoment", label: "Worst moment" },
  { key: "reflection", label: "Key insight", type: "textarea" },
];

const WEEKLY_QUESTIONS = [
  "Which schema was most active this week?",
  "Most common cascade pattern this week?",
  "How many DLL urges? Did the circuit breaker help?",
  "On my worst day, what was my pre-session emotional state?",
  "Sessions where I was activated but followed plan? (These are wins)",
  "P&L on GREEN vs AMBER vs RED days?",
  "Patterns activating me outside of trading?",
  "One thing I'll change next week?",
];

const DLL_STEPS = [
  { title: "STOP", subtitle: "Do not touch the DLL yet.", prompt: "What just happened that made me want to unlock?", key: "whatHappened", type: "text" },
  { title: "FEEL", subtitle: "Name what's happening inside you.", prompt: "What am I feeling right now?", key: "feeling", type: "select", options: ["Anger at a loss", "Need to prove myself", "Frustration — I know I'm better than this", "Desperation to recover", "Numbness — I've stopped caring", "Other"] },
  { title: "IDENTIFY", subtitle: "Which schema is driving this?", prompt: "This urge is being driven by:", key: "schema", type: "select", options: ["Defectiveness — I need to prove I'm not a failure", "Abandonment — I need to get back what was taken", "Standards — I can't accept ending the day like this"] },
  { title: "REMEMBER", subtitle: "These are your own words.", prompt: null, key: "remember", type: "affirmations" },
  { title: "DECIDE", subtitle: "Make a conscious choice.", prompt: "Having read all of this, I choose to:", key: "decision", type: "select", options: ["Keep DLL locked — walk away and protect my dreams", "Keep DLL locked — I'll come back tomorrow stronger", "Unlock DLL — I acknowledge I am breaking my own rules"] },
];

const DLL_AFFIRMATIONS = [
  "Disrespecting and unlocking DLL means I am intentionally breaking my own dreams.",
  "The DLL exists to protect me from this exact moment.",
  "Revenge trading has never once made me feel better. It has only ever made the day worse.",
  "Walking away right now is the strongest thing I can do.",
  "My large drawdown days come from this exact decision.",
  "Not following my system means I'm not following my dreams.",
];

async function loadData(key, fallback) {
  try { const r = await storage.get(key); return r ? JSON.parse(r.value) : fallback; } catch { return fallback; }
}
async function saveData(key, value) {
  try { await storage.set(key, JSON.stringify(value)); } catch (e) { console.error("Save:", e); }
}
function todayKey() { return new Date().toISOString().split("T")[0]; }
function weekKey() { const d = new Date(); const s = new Date(d); s.setDate(d.getDate() - d.getDay() + 1); return `week-${s.toISOString().split("T")[0]}`; }
function formatDate(d) { const parts = d.split("-"); const dt = new Date(parts[0], parts[1]-1, parts[2]); return dt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }); }

function getWhoopGate(sleep, recovery) {
  const s = parseFloat(sleep); const r = parseFloat(recovery);
  if (isNaN(s) || isNaN(r)) return null;
  if (s < 70 || r < 55) return "RED";
  if (s >= 80 && r >= 70) return "GREEN";
  return "AMBER";
}
function getWhoopGateColor(gate) {
  if (gate === "GREEN") return "#10B981";
  if (gate === "AMBER") return "#F48C06";
  if (gate === "RED") return "#E94560";
  return "rgba(255,255,255,0.2)";
}

function Card({ children, style }) {
  return (<div style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)", borderRadius: 22, padding: 28, border: "1px solid rgba(255,255,255,0.06)", ...style }}>{children}</div>);
}

function SchemaCard({ schema, expanded, onToggle }) {
  const s = SCHEMAS[schema];
  return (
    <div style={{ background: expanded ? s.bg : "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)", borderRadius: 22, border: `1px solid ${expanded ? `${s.color}33` : "rgba(255,255,255,0.06)"}`, marginBottom: 14, overflow: "hidden", transition: "all 0.3s ease" }}>
      <div onClick={onToggle} style={{ padding: "20px 22px", cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 46, height: 46, borderRadius: 13, background: s.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, boxShadow: expanded ? `0 4px 16px ${s.color}40` : "none", transition: "box-shadow 0.3s", color: schema === "standards" ? "rgba(255,255,255,0.5)" : "#fff", fontWeight: 300 }}>{s.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, letterSpacing: 2, color: s.color, textTransform: "uppercase" }}>{s.name}</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>{s.subtitle}</div>
        </div>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s ease", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>▼</div>
      </div>
      {expanded && (
        <div style={{ padding: "0 22px 22px", fontSize: 15, lineHeight: 1.8, color: "rgba(255,255,255,0.65)", animation: "fadeIn 0.25s ease" }}>
          <div style={{ height: 1, background: `${s.color}22`, marginBottom: 18 }} />
          {[{ label: "Trigger", value: s.trigger }, { label: "Core Belief", value: s.belief }, { label: "Body Sensation", value: s.body }].map(({ label, value }) => (
            <div key={label} style={{ marginBottom: 16 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 1.5, color: s.color, fontWeight: 600, textTransform: "uppercase" }}>{label}</span>
              <div style={{ marginTop: 5 }}>{value}</div>
            </div>
          ))}
          <div style={{ marginTop: 14, marginBottom: 14 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, color: s.color, fontWeight: 700, marginBottom: 14, opacity: 0.8, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 16, height: 2, background: s.color, borderRadius: 1, opacity: 0.6 }}></span>
              PATTERN INTERRUPTS
              <span style={{ width: 16, height: 2, background: s.color, borderRadius: 1, opacity: 0.6 }}></span>
            </div>
            {s.interrupts.map((int, i) => (
              <div key={i} style={{ padding: "14px 18px", marginBottom: 6, background: `${s.color}0A`, borderRadius: 14, borderLeft: `2px solid ${s.color}50`, color: "rgba(255,255,255,0.7)", fontSize: 15, lineHeight: 1.6 }}>"{int}"</div>
            ))}
          </div>
          <div style={{ background: `${s.color}15`, borderRadius: 14, padding: "16px 18px", fontSize: 15, border: `1px solid ${s.color}25` }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, color: s.color, fontWeight: 700, marginBottom: 8 }}>⟐ PHYSICAL RESET</div>
            <div style={{ color: "rgba(255,255,255,0.85)", fontWeight: 600, lineHeight: 1.7 }}>{s.reset}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function RangeSlider({ value, onChange, label, schema }) {
  const color = value > 5 ? "#E94560" : value > 3 ? "#F48C06" : "#10B981";
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", flex: 1 }}>{label}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "rgba(255,255,255,0.2)", marginRight: 14, letterSpacing: 1 }}>{schema}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 22, color, width: 40, textAlign: "center", textShadow: value > 5 ? `0 0 20px ${color}60` : "none", transition: "all 0.2s" }}>{value}</span>
      </div>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", transform: "translateY(-50%)" }} />
        <div style={{ position: "absolute", top: "50%", left: 0, width: `${value * 10}%`, height: 5, borderRadius: 3, background: color, transform: "translateY(-50%)", transition: "all 0.15s" }} />
        <input type="range" min={0} max={10} value={value} onChange={(e) => onChange(parseInt(e.target.value))}
          style={{ width: "100%", background: "transparent", position: "relative", zIndex: 2, WebkitAppearance: "none", appearance: "none", height: 24 }} />
      </div>
    </div>
  );
}

function GateDisplay({ whoopGate, schemaScores }) {
  const maxSchema = Math.max(...schemaScores);
  const schemaGate = maxSchema > 5 ? "RED" : maxSchema > 3 ? "AMBER" : "GREEN";
  const gateOrder = { GREEN: 0, AMBER: 1, RED: 2 };
  const finalGate = !whoopGate ? schemaGate : gateOrder[whoopGate] > gateOrder[schemaGate] ? whoopGate : schemaGate;
  const config = {
    GREEN: { color: "#10B981", glow: "rgba(16,185,129,0.12)", label: "FULL SIZE", msg: "All systems go. Execute CSTE plan.", icon: "●" },
    AMBER: { color: "#F48C06", glow: "rgba(244,140,6,0.12)", label: "HALF SIZE", msg: "A+ setups only. Reduced size.", icon: "◐" },
    RED: { color: "#E94560", glow: "rgba(233,69,96,0.12)", label: "NO TRADE", msg: "Walk away. Protect capital & progress.", icon: "○" },
  };
  const c = config[finalGate];
  const parts = [];
  if (whoopGate && whoopGate !== "GREEN") parts.push(`Whoop: ${whoopGate}`);
  if (schemaGate !== "GREEN") parts.push(`Schemas: ${schemaGate}`);
  return (
    <div style={{ background: c.glow, borderRadius: 18, padding: 28, textAlign: "center", border: `1px solid ${c.color}33`, marginTop: 28 }}>
      <div style={{ fontSize: 40, marginBottom: 6, filter: `drop-shadow(0 0 12px ${c.color})`, color: c.color }}>{c.icon}</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 36, color: c.color, letterSpacing: 4, textShadow: `0 0 30px ${c.color}40` }}>{finalGate}</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 12, color: c.color, marginTop: 6, letterSpacing: 2, opacity: 0.8 }}>{c.label}</div>
      <div style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", marginTop: 12 }}>{c.msg}</div>
      {parts.length > 0 && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginTop: 10, fontFamily: "'JetBrains Mono', monospace" }}>Driven by: {parts.join(" + ")}</div>}
    </div>
  );
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
  return (
    <button onClick={onClick} style={{
      width: "100%", padding: 18,
      background: saved ? "rgba(16,185,129,0.15)" : "linear-gradient(135deg, #E94560, #C62A47)",
      color: saved ? "#10B981" : "#fff",
      border: saved ? "1px solid rgba(16,185,129,0.3)" : "none",
      borderRadius: 16, fontSize: 16, fontWeight: 700, cursor: "pointer",
      fontFamily: "inherit", transition: "all 0.3s", letterSpacing: 0.5,
      boxShadow: saved ? "none" : "0 4px 20px rgba(233,69,96,0.3)",
    }}>{saved ? "✓ Saved" : label}</button>
  );
}

function SectionLabel({ text, color }) {
  return (<div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 2.5, color: color || "rgba(255,255,255,0.25)", fontWeight: 600, marginBottom: 18, textTransform: "uppercase" }}>{text}</div>);
}

function WhoopInput({ label, value, onChange, unit, gate }) {
  const gateColor = getWhoopGateColor(gate);
  return (
    <div style={{ flex: 1 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 8 }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input type="number" min={0} max={100} value={value} onChange={(e) => onChange(e.target.value)} placeholder="—"
          style={{ width: "100%", padding: "16px 44px 16px 16px", borderRadius: 14, border: `1px solid ${value ? `${gateColor}44` : "rgba(255,255,255,0.08)"}`, fontSize: 26, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, background: value ? `${gateColor}08` : "rgba(255,255,255,0.04)", color: value ? gateColor : "rgba(255,255,255,0.3)", boxSizing: "border-box", outline: "none", textAlign: "center", transition: "all 0.2s" }} />
        <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono', monospace" }}>{unit}</span>
      </div>
    </div>
  );
}

function DLLBreaker({ onLog }) {
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState({});
  const [completed, setCompleted] = useState(false);
  const [coolingDown, setCoolingDown] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  const currentStep = DLL_STEPS[step];
  const isLast = step === DLL_STEPS.length - 1;
  const canAdvance = currentStep.type === "affirmations" || responses[currentStep.key];

  const handleNext = () => {
    if (isLast) {
      const decision = responses.decision || "";
      if (decision.startsWith("Unlock")) { setCoolingDown(true); setCooldownLeft(30); }
      else { setCompleted(true); onLog({ ...responses, timestamp: new Date().toISOString(), keptLocked: true }); }
    } else { setStep(step + 1); }
  };

  useEffect(() => {
    if (!coolingDown) return;
    if (cooldownLeft <= 0) { setCompleted(true); onLog({ ...responses, timestamp: new Date().toISOString(), keptLocked: false }); return; }
    const timer = setTimeout(() => setCooldownLeft(cooldownLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [coolingDown, cooldownLeft]);

  const reset = () => { setStep(0); setResponses({}); setCompleted(false); setCoolingDown(false); setCooldownLeft(0); };

  if (completed) {
    const keptLocked = responses.decision && !responses.decision.startsWith("Unlock");
    return (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        <Card style={{ textAlign: "center", border: `1px solid ${keptLocked ? "rgba(16,185,129,0.3)" : "rgba(233,69,96,0.3)"}` }}>
          <div style={{ fontSize: 52, marginBottom: 18 }}>{keptLocked ? "✓" : "⚠"}</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700, color: keptLocked ? "#10B981" : "#E94560", letterSpacing: 2, marginBottom: 10 }}>{keptLocked ? "DLL PROTECTED" : "DLL UNLOCKED"}</div>
          <div style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 24 }}>{keptLocked ? "You chose to protect your dreams. This moment of strength is logged." : "This decision has been logged. Review it in your post-session."}</div>
          <button onClick={reset} style={{ padding: "14px 28px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Reset</button>
        </Card>
      </div>
    );
  }

  if (coolingDown) {
    return (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        <Card style={{ textAlign: "center", border: "1px solid rgba(233,69,96,0.3)" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 3, color: "#E94560", fontWeight: 600, marginBottom: 18 }}>COOLING DOWN</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 64, fontWeight: 700, color: "#E94560", textShadow: "0 0 40px rgba(233,69,96,0.4)", marginBottom: 14 }}>{cooldownLeft}</div>
          <div style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 18 }}>You chose to unlock. Sit with this decision for {cooldownLeft} seconds.</div>
          <div style={{ fontSize: 15, color: "rgba(255,255,255,0.3)", fontStyle: "italic", lineHeight: 1.8 }}>Every second is a chance to change your mind. Close this tab and walk away — the DLL stays locked and you protect everything you're building.</div>
          <button onClick={() => { setCompleted(true); onLog({ ...responses, timestamp: new Date().toISOString(), keptLocked: true, changedMind: true }); }}
            style={{ marginTop: 24, padding: "16px 28px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #10B981, #059669)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 16px rgba(16,185,129,0.3)" }}>I changed my mind — Keep DLL Locked</button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", gap: 5, marginBottom: 28 }}>
        {DLL_STEPS.map((_, i) => (<div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? "#E94560" : "rgba(255,255,255,0.06)", transition: "all 0.3s" }} />))}
      </div>
      <Card style={{ border: "1px solid rgba(233,69,96,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #E94560, #C62A47)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700, color: "#fff" }}>{step + 1}</div>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, letterSpacing: 2, color: "#E94560" }}>{currentStep.title}</div>
            <div style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>{currentStep.subtitle}</div>
          </div>
        </div>
        {currentStep.type === "affirmations" ? (
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.3)", marginBottom: 18 }}>READ EACH ONE CAREFULLY</div>
            {DLL_AFFIRMATIONS.map((a, i) => (
              <div key={i} style={{ padding: "16px 18px", marginBottom: 10, background: "rgba(233,69,96,0.06)", borderRadius: 14, border: "1px solid rgba(233,69,96,0.1)", fontSize: 16, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, fontWeight: 500 }}>{a}</div>
            ))}
          </div>
        ) : (
          <div>
            <label style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 12 }}>{currentStep.prompt}</label>
            {currentStep.type === "select" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {currentStep.options.map(opt => (
                  <button key={opt} onClick={() => setResponses({ ...responses, [currentStep.key]: opt })}
                    style={{ padding: "16px 18px", borderRadius: 14, textAlign: "left", border: responses[currentStep.key] === opt ? "1px solid rgba(233,69,96,0.5)" : "1px solid rgba(255,255,255,0.06)", background: responses[currentStep.key] === opt ? "rgba(233,69,96,0.1)" : "rgba(255,255,255,0.03)", color: responses[currentStep.key] === opt ? "#E94560" : "rgba(255,255,255,0.55)", fontSize: 15, fontWeight: responses[currentStep.key] === opt ? 600 : 400, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>{opt}</button>
                ))}
              </div>
            ) : (
              <textarea value={responses[currentStep.key] || ""} onChange={(e) => setResponses({ ...responses, [currentStep.key]: e.target.value })}
                rows={3} placeholder="Be honest with yourself..."
                style={{ width: "100%", padding: "14px 16px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", fontSize: 16, fontFamily: "inherit", background: "rgba(255,255,255,0.04)", color: "#fff", boxSizing: "border-box", outline: "none", resize: "vertical" }} />
            )}
          </div>
        )}
        <div style={{ display: "flex", gap: 14, marginTop: 28 }}>
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} style={{ padding: "16px 22px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Back</button>
          )}
          <button onClick={handleNext} disabled={!canAdvance}
            style={{ flex: 1, padding: 16, borderRadius: 14, border: "none", background: canAdvance ? (isLast ? "linear-gradient(135deg, #E94560, #C62A47)" : "rgba(255,255,255,0.08)") : "rgba(255,255,255,0.03)", color: canAdvance ? (isLast ? "#fff" : "rgba(255,255,255,0.7)") : "rgba(255,255,255,0.15)", fontSize: 16, fontWeight: 700, cursor: canAdvance ? "pointer" : "default", fontFamily: "inherit", transition: "all 0.2s", boxShadow: isLast && canAdvance ? "0 4px 16px rgba(233,69,96,0.3)" : "none" }}>
            {isLast ? "Submit Decision" : "Continue →"}
          </button>
        </div>
      </Card>
    </div>
  );
}

export default function SchemaFramework() {
  const [tab, setTab] = useState("schemas");
  const [expandedSchema, setExpandedSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [whoopSleep, setWhoopSleep] = useState("");
  const [whoopRecovery, setWhoopRecovery] = useState("");
  const [otherChecks, setOtherChecks] = useState([false, false]);
  const [schemaScores, setSchemaScores] = useState([0, 0, 0, 0, 0]);
  const [checkinSaved, setCheckinSaved] = useState(false);
  const [activationLog, setActivationLog] = useState({ time: "", happened: "", feeling: "", bodyLocation: "", urge: "", schema: "", cascadeFrom: "", howOld: "", interrupt: "", outcome: "" });
  const [savedActivations, setSavedActivations] = useState([]);
  const [dllLogs, setDllLogs] = useState([]);
  const [postSession, setPostSession] = useState({});
  const [postSaved, setPostSaved] = useState(false);
  const [weeklyReview, setWeeklyReview] = useState({});
  const [weeklySaved, setWeeklySaved] = useState(false);
  const [historyKeys, setHistoryKeys] = useState([]);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [nnOpen, setNnOpen] = useState(false);

  const whoopGate = getWhoopGate(whoopSleep, whoopRecovery);

  useEffect(() => {
    async function load() {
      const key = todayKey();
      const checks = await loadData(`checkin-${key}`, null);
      if (checks) { setWhoopSleep(checks.whoopSleep || ""); setWhoopRecovery(checks.whoopRecovery || ""); setOtherChecks(checks.otherChecks || [false, false]); setSchemaScores(checks.schemaScores || [0,0,0,0,0]); setCheckinSaved(true); }
      setSavedActivations(await loadData(`activations-${key}`, []));
      setDllLogs(await loadData(`dll-${key}`, []));
      const post = await loadData(`post-${key}`, null);
      if (post) { setPostSession(post); setPostSaved(true); }
      const weekly = await loadData(`weekly-${weekKey()}`, null);
      if (weekly) { setWeeklyReview(weekly); setWeeklySaved(true); }
      try { const allKeys = await storage.list("checkin-"); if (allKeys?.keys) setHistoryKeys(allKeys.keys.map(k => k.replace("checkin-","")).sort().reverse()); } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const saveCheckin = useCallback(async () => { await saveData(`checkin-${todayKey()}`, { whoopSleep, whoopRecovery, otherChecks, schemaScores, whoopGate, timestamp: new Date().toISOString() }); setCheckinSaved(true); }, [whoopSleep, whoopRecovery, otherChecks, schemaScores, whoopGate]);
  const saveActivation = useCallback(async () => {
    const updated = [...savedActivations, { ...activationLog, timestamp: new Date().toISOString() }];
    await saveData(`activations-${todayKey()}`, updated); setSavedActivations(updated);
    setActivationLog({ time: "", happened: "", feeling: "", bodyLocation: "", urge: "", schema: "", cascadeFrom: "", howOld: "", interrupt: "", outcome: "" });
  }, [activationLog, savedActivations]);
  const logDll = useCallback(async (entry) => { const updated = [...dllLogs, entry]; await saveData(`dll-${todayKey()}`, updated); setDllLogs(updated); }, [dllLogs]);
  const savePostSession = useCallback(async () => { await saveData(`post-${todayKey()}`, { ...postSession, timestamp: new Date().toISOString() }); setPostSaved(true); }, [postSession]);
  const saveWeekly = useCallback(async () => { await saveData(`weekly-${weekKey()}`, { ...weeklyReview, timestamp: new Date().toISOString() }); setWeeklySaved(true); }, [weeklyReview]);
  const loadHistory = useCallback(async (date) => {
    setSelectedHistory(date);
    setHistoryData({ checkin: await loadData(`checkin-${date}`, null), activations: await loadData(`activations-${date}`, []), post: await loadData(`post-${date}`, null), dll: await loadData(`dll-${date}`, []) });
  }, []);

  if (loading) return (<div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#0A0A0F", color: "rgba(255,255,255,0.3)", fontSize: 16 }}>Loading...</div>);

  const tabs = [
    { id: "schemas", label: "Schemas", icon: "☰" },
    { id: "checkin", label: "Check-In", icon: "◉" },
    { id: "activation", label: "Live", icon: "⚡" },
    { id: "dll", label: "DLL", icon: "⊘" },
    { id: "post", label: "Review", icon: "◈" },
    { id: "weekly", label: "Weekly", icon: "▣" },
    { id: "history", label: "Log", icon: "◫" },
  ];

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", background: "#0A0A0F", minHeight: "100vh", width: "100%", maxWidth: 768, margin: "0 auto", color: "#fff" }}>
      {/* Header */}
      <div style={{ padding: "32px 24px 0", position: "sticky", top: 0, zIndex: 100, background: "linear-gradient(180deg, #0A0A0F 85%, transparent)" }}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 3, color: "rgba(45,212,191,0.5)", fontWeight: 600 }}>SCHEMA AWARENESS</div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, marginTop: 3, color: "rgba(255,255,255,0.7)" }}>Mental Game Framework</div>
        </div>
        <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 4 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: "12px 4px", border: "none", borderRadius: 13, cursor: "pointer",
              background: tab === t.id ? (t.id === "dll" ? "rgba(233,69,96,0.25)" : "rgba(45,212,191,0.15)") : "transparent",
              color: tab === t.id ? (t.id === "dll" ? "#E94560" : "#2DD4BF") : (t.id === "dll" ? "rgba(233,69,96,0.4)" : "rgba(255,255,255,0.25)"),
              fontFamily: "inherit", fontSize: 12, fontWeight: tab === t.id ? 700 : 500,
              transition: "all 0.2s", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            }}>
              <span style={{ fontSize: 16 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "28px 20px 60px" }}>

        {/* SCHEMAS */}
        {tab === "schemas" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.35)", lineHeight: 1.7, marginBottom: 22 }}>Your three core threat patterns. Tap to expand triggers, beliefs, and pattern interrupts.</p>
            {Object.keys(SCHEMAS).map(key => (
              <SchemaCard key={key} schema={key} expanded={expandedSchema === key} onToggle={() => setExpandedSchema(expandedSchema === key ? null : key)} />
            ))}
            <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 22, padding: 32, textAlign: "center", border: "1px solid rgba(255,255,255,0.04)", marginTop: 28, marginBottom: 18 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,0.5)", fontWeight: 600, marginBottom: 16 }}>THE CRITICAL QUESTION</div>
              <div style={{ fontSize: 17, fontWeight: 600, fontStyle: "italic", lineHeight: 1.7, color: "rgba(255,255,255,0.65)" }}>"What am I actually feeling right now, and how old does this feeling feel?"</div>
            </div>
            <div onClick={() => setNnOpen(!nnOpen)} style={{
              background: nnOpen ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.03)",
              borderRadius: 22, border: nnOpen ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(255,255,255,0.08)",
              borderLeft: `3px solid ${nnOpen ? "#2DD4BF" : "rgba(45,212,191,0.4)"}`,
              marginBottom: 16, overflow: "hidden", cursor: "pointer", transition: "all 0.3s ease",
            }}>
              <div style={{ padding: "20px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, letterSpacing: 2, color: "rgba(255,255,255,0.6)" }}>MY NON-NEGOTIABLES</div>
                  {!nnOpen && <div style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", marginTop: 4, fontWeight: 500 }}>The truths that protect my dreams</div>}
                </div>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", transform: nnOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s ease", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>▼</div>
              </div>
              {nnOpen && (
                <div style={{ padding: "0 22px 22px", animation: "fadeIn 0.25s ease" }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 18 }} />
                  {[
                    "Breaking my rules means I am intentionally breaking my own dreams.",
                    "Not following my system means I'm not following my dreams.",
                    "Picking tops & bottoms is picking a fight I'm likely to lose.",
                    "Moving to BE out of fear is choosing comfort over conviction.",
                    "Distractions while trading rob me of my progress.",
                    "Trading my PnL means long term Probably Lose.",
                  ].map((rule, i) => (
                    <div key={i} style={{ padding: "14px 0", borderBottom: i < 5 ? "1px solid rgba(255,255,255,0.04)" : "none", fontSize: 16, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, fontWeight: 500 }}>{rule}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CHECK-IN */}
        {tab === "checkin" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <SectionLabel text="Pre-Session Check-In" />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "rgba(255,255,255,0.2)" }}>{todayKey()}</span>
            </div>
            <Card style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <SectionLabel text="Whoop Scores" color="#10B981" />
                {whoopGate && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, padding: "5px 12px", borderRadius: 8, background: `${getWhoopGateColor(whoopGate)}15`, color: getWhoopGateColor(whoopGate), border: `1px solid ${getWhoopGateColor(whoopGate)}33` }}>{whoopGate}</span>}
              </div>
              <div style={{ display: "flex", gap: 14, marginBottom: 18 }}>
                <WhoopInput label="Sleep Score" value={whoopSleep} onChange={(v) => { setWhoopSleep(v); setCheckinSaved(false); }} unit="%" gate={whoopGate} />
                <WhoopInput label="Recovery Score" value={whoopRecovery} onChange={(v) => { setWhoopRecovery(v); setCheckinSaved(false); }} unit="%" gate={whoopGate} />
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 14, fontSize: 12, color: "rgba(255,255,255,0.25)", lineHeight: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                <div><span style={{ color: "#10B981" }}>●</span> Sleep ≥80% + Recovery ≥70% → Full Size</div>
                <div><span style={{ color: "#F48C06" }}>●</span> Sleep 70–79% or Recovery 55–69% → Half Size</div>
                <div><span style={{ color: "#E94560" }}>●</span> Sleep &lt;70% or Recovery &lt;55% → No Trade</div>
              </div>
            </Card>
            <Card style={{ marginBottom: 18 }}>
              <SectionLabel text="Readiness" color="rgba(255,255,255,0.25)" />
              {["Eaten properly & hydrated", "Exercised or moved today"].map((item, i) => (
                <div key={i} onClick={() => { const n = [...otherChecks]; n[i] = !n[i]; setOtherChecks(n); setCheckinSaved(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0", borderBottom: i === 0 ? "1px solid rgba(255,255,255,0.04)" : "none", cursor: "pointer", fontSize: 16, color: otherChecks[i] ? "#10B981" : "rgba(255,255,255,0.5)", transition: "color 0.2s", userSelect: "none" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 9, flexShrink: 0, border: otherChecks[i] ? "none" : "2px solid rgba(255,255,255,0.12)", background: otherChecks[i] ? "linear-gradient(135deg, #10B981, #059669)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", fontSize: 16, color: "#fff", boxShadow: otherChecks[i] ? "0 2px 8px rgba(16,185,129,0.3)" : "none" }}>{otherChecks[i] ? "✓" : ""}</div>
                  {item}
                </div>
              ))}
            </Card>
            <Card style={{ marginBottom: 18 }}>
              <SectionLabel text="Emotional Baseline" color="#4361EE" />
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.25)", marginBottom: 22, lineHeight: 1.6 }}>Score ≥5 means significantly lower threshold for schema activation.</p>
              {CHECKIN_QUESTIONS.map((item, i) => (
                <RangeSlider key={i} value={schemaScores[i]} onChange={(v) => { const n = [...schemaScores]; n[i] = v; setSchemaScores(n); setCheckinSaved(false); }} label={item.q} schema={item.schema} />
              ))}
              <GateDisplay whoopGate={whoopGate} schemaScores={schemaScores} />
            </Card>
            <SaveButton saved={checkinSaved} onClick={saveCheckin} label="Save Check-In" />
          </div>
        )}

        {/* LIVE LOG */}
        {tab === "activation" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.35)", lineHeight: 1.7, marginBottom: 22 }}>Pausing to fill this in <em>is</em> the intervention.</p>
            <Card style={{ marginBottom: 18 }}>
              <SectionLabel text="New Activation" color="#E94560" />
              {[
                { key: "time", label: "Time", placeholder: "e.g. 10:32 AM" },
                { key: "happened", label: "What happened?", placeholder: "Price action, P&L change..." },
                { key: "feeling", label: "What am I feeling?", placeholder: "Fear, anger, urgency..." },
                { key: "bodyLocation", label: "Where in my body?", placeholder: "Chest, stomach, jaw..." },
                { key: "urge", label: "The urge?", placeholder: "Close, move SL, unlock DLL..." },
                { key: "schema", label: "Which schema fired?", type: "select", options: ["Abandonment", "Defectiveness", "Unrelenting Standards"] },
                { key: "cascadeFrom", label: "Did another schema fire first?", type: "select", options: ["No — this was the first", "Abandonment triggered it", "Defectiveness triggered it", "Standards triggered it"] },
                { key: "howOld", label: "How old does this feel?", placeholder: "This trade, or deeper?" },
                { key: "interrupt", label: "Pattern interrupt used", placeholder: "Write your phrase..." },
                { key: "outcome", label: "What did I do?", type: "select", options: ["Followed plan", "Deviated"] },
              ].map(f => (
                <InputField key={f.key} label={f.label} value={activationLog[f.key]}
                  onChange={(v) => setActivationLog({...activationLog, [f.key]: v})}
                  type={f.type} options={f.options} placeholder={f.placeholder} />
              ))}
              <button onClick={saveActivation} disabled={!activationLog.feeling} style={{
                width: "100%", padding: 18, border: "none", borderRadius: 16,
                background: activationLog.feeling ? "linear-gradient(135deg, #E94560, #C62A47)" : "rgba(255,255,255,0.05)",
                color: activationLog.feeling ? "#fff" : "rgba(255,255,255,0.2)",
                fontSize: 16, fontWeight: 700, cursor: activationLog.feeling ? "pointer" : "default",
                fontFamily: "inherit", transition: "all 0.3s",
                boxShadow: activationLog.feeling ? "0 4px 20px rgba(233,69,96,0.3)" : "none",
              }}>Log Activation</button>
            </Card>
            {savedActivations.length > 0 && (
              <Card>
                <SectionLabel text={`Today's Activations (${savedActivations.length})`} color="#E94560" />
                {savedActivations.map((a, i) => (
                  <div key={i} style={{ padding: "16px 0", borderBottom: i < savedActivations.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", fontSize: 15 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{a.time || "—"}</span>
                      <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 8, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", background: a.outcome === "Followed plan" ? "rgba(16,185,129,0.15)" : "rgba(233,69,96,0.15)", color: a.outcome === "Followed plan" ? "#10B981" : "#E94560" }}>{a.outcome || "—"}</span>
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.5)" }}><strong style={{ color: "rgba(255,255,255,0.7)" }}>{a.schema}</strong> — {a.feeling}</div>
                    {a.cascadeFrom && a.cascadeFrom !== "No — this was the first" && (
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>CASCADE: {a.cascadeFrom}</div>
                    )}
                    {a.interrupt && <div style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic", marginTop: 5, fontSize: 14 }}>"{a.interrupt}"</div>}
                  </div>
                ))}
              </Card>
            )}
          </div>
        )}

        {/* DLL */}
        {tab === "dll" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 3, color: "#E94560", fontWeight: 600, marginBottom: 10 }}>CIRCUIT BREAKER</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>DLL Unlock Protocol</div>
              <div style={{ fontSize: 15, color: "rgba(255,255,255,0.3)", marginTop: 8, lineHeight: 1.6 }}>If you're here, something triggered you. Work through each step before making any decision about the DLL.</div>
            </div>
            <DLLBreaker onLog={logDll} />
            {dllLogs.length > 0 && (
              <Card style={{ marginTop: 24 }}>
                <SectionLabel text={`Today's DLL Events (${dllLogs.length})`} color="#E94560" />
                {dllLogs.map((d, i) => (
                  <div key={i} style={{ padding: "14px 0", borderBottom: i < dllLogs.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", fontSize: 15 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "rgba(255,255,255,0.5)" }}>{d.schema || "—"}</span>
                      <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 8, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", background: d.keptLocked ? "rgba(16,185,129,0.15)" : "rgba(233,69,96,0.15)", color: d.keptLocked ? "#10B981" : "#E94560" }}>{d.keptLocked ? (d.changedMind ? "CHANGED MIND" : "KEPT LOCKED") : "UNLOCKED"}</span>
                    </div>
                    {d.feeling && <div style={{ color: "rgba(255,255,255,0.35)", marginTop: 5 }}>{d.feeling}</div>}
                  </div>
                ))}
              </Card>
            )}
          </div>
        )}

        {/* POST-SESSION */}
        {tab === "post" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <SectionLabel text="Post-Session Review" />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "rgba(255,255,255,0.2)" }}>{todayKey()}</span>
            </div>
            <Card>
              {POST_SESSION_FIELDS.map(f => (
                <InputField key={f.key} label={f.label} value={postSession[f.key]}
                  onChange={(v) => { setPostSession({...postSession, [f.key]: v}); setPostSaved(false); }}
                  type={f.type} options={f.options} />
              ))}
              <SaveButton saved={postSaved} onClick={savePostSession} label="Save Review" />
            </Card>
          </div>
        )}

        {/* WEEKLY */}
        {tab === "weekly" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <SectionLabel text="Weekly Reflection" />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "rgba(255,255,255,0.2)" }}>{weekKey()}</span>
            </div>
            <Card>
              {WEEKLY_QUESTIONS.map((q, i) => (
                <InputField key={i} label={q} value={weeklyReview[`q${i}`]} type="textarea" rows={2}
                  onChange={(v) => { setWeeklyReview({...weeklyReview, [`q${i}`]: v}); setWeeklySaved(false); }} />
              ))}
              <SaveButton saved={weeklySaved} onClick={saveWeekly} label="Save Weekly Reflection" />
            </Card>
          </div>
        )}

        {/* HISTORY */}
        {tab === "history" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <SectionLabel text="Session History" />
            {historyKeys.length === 0 ? (
              <Card style={{ textAlign: "center", padding: 52 }}>
                <div style={{ fontSize: 40, marginBottom: 14, opacity: 0.3 }}>◫</div>
                <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 16 }}>No sessions logged yet.</div>
              </Card>
            ) : (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 22 }}>
                  {historyKeys.map(date => (
                    <button key={date} onClick={() => loadHistory(date)} style={{
                      padding: "10px 16px", borderRadius: 12, cursor: "pointer",
                      border: selectedHistory === date ? "1px solid rgba(45,212,191,0.4)" : "1px solid rgba(255,255,255,0.06)",
                      background: selectedHistory === date ? "rgba(45,212,191,0.1)" : "rgba(255,255,255,0.03)",
                      fontSize: 13, fontFamily: "'JetBrains Mono', monospace", fontWeight: selectedHistory === date ? 700 : 400,
                      color: selectedHistory === date ? "#2DD4BF" : "rgba(255,255,255,0.35)", transition: "all 0.2s",
                    }}>{formatDate(date)}</button>
                  ))}
                </div>
                {historyData && (
                  <div>
                    {historyData.checkin && (
                      <Card style={{ marginBottom: 14 }}>
                        <SectionLabel text="Pre-Session" color="#4361EE" />
                        <div style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 2.2 }}>
                          {historyData.checkin.whoopSleep && (
                            <div><strong style={{color:"rgba(255,255,255,0.7)"}}>Whoop:</strong> Sleep {historyData.checkin.whoopSleep}% · Recovery {historyData.checkin.whoopRecovery}%
                              {historyData.checkin.whoopGate && <span style={{ color: getWhoopGateColor(historyData.checkin.whoopGate), fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, marginLeft: 10 }}>{historyData.checkin.whoopGate}</span>}
                            </div>
                          )}
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <strong style={{color:"rgba(255,255,255,0.7)"}}>Schema Scores:</strong>
                            {historyData.checkin.schemaScores?.map((s, i) => (
                              <span key={i} style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: s > 5 ? "#E94560" : s > 3 ? "#F48C06" : "#10B981" }}>{s}</span>
                            ))}
                          </div>
                        </div>
                      </Card>
                    )}
                    {historyData.activations?.length > 0 && (
                      <Card style={{ marginBottom: 14 }}>
                        <SectionLabel text={`Activations (${historyData.activations.length})`} color="#E94560" />
                        {historyData.activations.map((a, i) => (
                          <div key={i} style={{ padding: "12px 0", borderBottom: i < historyData.activations.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", fontSize: 15 }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{a.time}</span>
                              <span style={{ fontSize: 11, color: a.outcome === "Followed plan" ? "#10B981" : "#E94560", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{a.outcome}</span>
                            </div>
                            <div style={{ color: "rgba(255,255,255,0.5)", marginTop: 3 }}><strong style={{color:"rgba(255,255,255,0.6)"}}>{a.schema}</strong> — {a.feeling}</div>
                            {a.cascadeFrom && a.cascadeFrom !== "No — this was the first" && (
                              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginTop: 3, fontFamily: "'JetBrains Mono', monospace" }}>CASCADE: {a.cascadeFrom}</div>
                            )}
                          </div>
                        ))}
                      </Card>
                    )}
                    {historyData.dll?.length > 0 && (
                      <Card style={{ marginBottom: 14 }}>
                        <SectionLabel text={`DLL Events (${historyData.dll.length})`} color="#E94560" />
                        {historyData.dll.map((d, i) => (
                          <div key={i} style={{ padding: "12px 0", borderBottom: i < historyData.dll.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", fontSize: 15 }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "rgba(255,255,255,0.5)" }}>{d.schema || "—"}</span>
                              <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: d.keptLocked ? "#10B981" : "#E94560" }}>{d.keptLocked ? "LOCKED" : "UNLOCKED"}</span>
                            </div>
                          </div>
                        ))}
                      </Card>
                    )}
                    {historyData.post && (
                      <Card>
                        <SectionLabel text="Post-Session" color="#F48C06" />
                        {POST_SESSION_FIELDS.filter(f => historyData.post[f.key]).map(f => (
                          <div key={f.key} style={{ marginBottom: 12, fontSize: 15 }}>
                            <span style={{ color: "rgba(255,255,255,0.4)" }}>{f.label}: </span>
                            <span style={{ color: "rgba(255,255,255,0.65)" }}>{historyData.post[f.key]}</span>
                          </div>
                        ))}
                      </Card>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
