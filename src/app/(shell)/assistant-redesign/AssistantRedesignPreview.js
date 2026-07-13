"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./assistant-redesign.module.css";

const prompts = [
  { index: "01", type: "READINESS", text: "Compare my readiness scores with my best trading sessions." },
  { index: "02", type: "EXECUTION", text: "Where am I breaking my written plan most often?" },
  { index: "03", type: "PLAYBOOK", text: "Which setups are producing my strongest expectancy?" },
  { index: "04", type: "REVIEW", text: "Turn my last 10 journal entries into two priorities for next week." },
];

const dataSources = [
  ["Trades", "132", "Imported and tagged"],
  ["Check-ins", "18", "Readiness and context"],
  ["Plans", "12", "Setups, levels, and risk"],
  ["Journals", "16", "Lessons and behavior"],
];

function StatusMark() {
  return <span className={styles.statusMark}><i /><i /></span>;
}

function ConnectedState() {
  const [input, setInput] = useState("");

  return (
    <div className={styles.workspace}>
      <section className={styles.chatPanel}>
        <header className={styles.panelHead}>
          <div><p>PROCESS INTELLIGENCE</p><h2>Ask your trading data.</h2></div>
          <div className={styles.connectedBadge}><StatusMark /><span>ChatGPT connected</span></div>
        </header>

        <div className={styles.chatEmpty}>
          <span className={styles.orbitMark} aria-hidden="true"><i /><i /><i /></span>
          <p className={styles.chatEyebrow}>YOUR PROCESS, IN CONTEXT</p>
          <h3>What do you want<br />to understand?</h3>
          <p>Ask about a session, compare patterns across weeks, or turn your journal into a specific next action.</p>
        </div>

        <form className={styles.composer} onSubmit={(event) => event.preventDefault()}>
          <div className={styles.contextChips}><span>TRADES</span><span>CHECK-INS</span><span>PLANS</span><span>JOURNALS</span></div>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask a question about your process…" rows={3} />
          <div className={styles.composerFoot}><small>Relevant account data is added automatically</small><button type="submit" disabled={!input.trim()}>Ask assistant <b>↗</b></button></div>
        </form>
      </section>

      <aside className={styles.insightRail}>
        <section className={styles.promptSection}>
          <div className={styles.railHead}><p>START WITH A QUESTION</p><span>04 prompts</span></div>
          <div className={styles.promptList}>
            {prompts.map((prompt) => (
              <button type="button" key={prompt.index} onClick={() => setInput(prompt.text)}>
                <span>{prompt.index}</span><div><small>{prompt.type}</small><strong>{prompt.text}</strong></div><b>↗</b>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.dataSection}>
          <div className={styles.railHead}><p>DATA AVAILABLE</p><span>LIVE</span></div>
          <div className={styles.dataList}>
            {dataSources.map(([label, count, detail]) => <div key={label}><span>{label}</span><strong>{count}</strong><small>{detail}</small></div>)}
          </div>
        </section>

        <div className={styles.accountStrip}><span>MIKELOW92@GMAIL.COM</span><button type="button">Disconnect</button></div>
      </aside>
    </div>
  );
}

function DisconnectedState() {
  return (
    <div className={styles.connectWorkspace}>
      <section className={styles.connectStory}>
        <p className={styles.connectEyebrow}>BRING YOUR OWN CHATGPT</p>
        <h2>Your process.<br />Your data.<br /><span>Your assistant.</span></h2>
        <p className={styles.connectLead}>Connect your ChatGPT subscription and ask questions grounded in your Libertrade history.</p>
        <ol>
          <li><span>01</span><div><strong>Connect ChatGPT</strong><p>Use your own ChatGPT subscription.</p></div></li>
          <li><span>02</span><div><strong>Ask about your process</strong><p>Trades, readiness, plans, and journals become the context.</p></div></li>
          <li><span>03</span><div><strong>Get a focused answer</strong><p>Turn stored data into patterns and next actions.</p></div></li>
        </ol>
      </section>

      <section className={styles.connectCard}>
        <div className={styles.connectGraphic} aria-hidden="true"><i /><i /><span>∞</span></div>
        <p>PRIVATE CONNECTION</p>
        <h3>Connect your ChatGPT subscription.</h3>
        <p>Inference runs through your account. Libertrade supplies the relevant trading context for the question you ask.</p>
        <button type="button">Continue with ChatGPT <span>↗</span></button>
        <div className={styles.privacyList}>
          <span><i>✓</i> Uses your own subscription</span>
          <span><i>✓</i> Disconnect at any time</span>
          <span><i>✓</i> No separate AI usage fee</span>
        </div>
      </section>
    </div>
  );
}

export default function AssistantRedesignPreview() {
  const [connected, setConnected] = useState(true);

  return (
    <div className={styles.page}>
      <div className={styles.previewBar}>
        <span><i /> Design preview</span>
        <div className={styles.stateSwitch}>
          <button className={connected ? styles.activeState : ""} type="button" onClick={() => setConnected(true)}>Connected</button>
          <button className={!connected ? styles.activeState : ""} type="button" onClick={() => setConnected(false)}>Before connection</button>
        </div>
        <Link href="/assistant">View current page ↗</Link>
      </div>

      <header className={styles.header}>
        <p>MONDAY, JUL 13, 2026</p>
        <h1>AI Assistant<span /></h1>
        <div className={styles.headerBottom}>
          <p>Ask better questions about the process behind your results.</p>
          <span>{connected ? "CONNECTED WORKSPACE" : "CONNECTION SETUP"}</span>
        </div>
      </header>

      {connected ? <ConnectedState /> : <DisconnectedState />}
    </div>
  );
}
