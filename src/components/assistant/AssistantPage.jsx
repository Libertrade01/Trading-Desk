"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  LoginWithChatGPT,
  openLoginWithChatGPTConsentPopup,
} from "@opencoredev/loginwithchatgpt-react";
import WorkflowPageLayout from "../WorkflowPageLayout";
import styles from "./AssistantPage.module.css";

const PROMPTS = [
  { index: "01", type: "READINESS", text: "Compare my readiness scores with my best trading sessions." },
  { index: "02", type: "EXECUTION", text: "Where am I breaking my written plan most often?" },
  { index: "03", type: "PLAYBOOK", text: "Which setups are producing my strongest expectancy?" },
  { index: "04", type: "REVIEW", text: "Turn my last 10 journal entries into two priorities for next week." },
];

const DATA_SOURCES = [
  { key: "trades", label: "Trades", detail: "Imported and tagged" },
  { key: "checkIns", label: "Check-ins", detail: "Readiness and context" },
  { key: "plans", label: "Plans", detail: "Setups, levels, and risk" },
  { key: "journals", label: "Journals", detail: "Lessons and behavior" },
];

function getMessageText(message) {
  if (!message?.parts?.length) return "";
  return message.parts.filter((part) => part.type === "text").map((part) => part.text).join("");
}

function headerDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).toUpperCase();
}

function StatusMark() {
  return <span className={styles.statusMark}><i /><i /></span>;
}

function InlineMarkdown({ text }) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

function MarkdownAnswer({ text }) {
  const lines = String(text || "").replace(/\r/g, "").split("\n");
  const blocks = [];
  let paragraph = [];
  let list = [];
  let listType = null;

  function flushParagraph() {
    if (!paragraph.length) return;
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  }

  function flushList() {
    if (!list.length) return;
    blocks.push({ type: listType, items: list });
    list = [];
    listType = null;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    const unordered = line.match(/^[-*]\s+(.+)$/);
    const ordered = line.match(/^\d+[.)]\s+(.+)$/);

    if (!line) {
      flushParagraph();
      flushList();
    } else if (/^---+$/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push({ type: "rule" });
    } else if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
    } else if (unordered || ordered) {
      flushParagraph();
      const nextType = unordered ? "unordered" : "ordered";
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      list.push((unordered || ordered)[1]);
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();

  return (
    <div className={styles.markdownAnswer}>
      {blocks.map((block, index) => {
        if (block.type === "rule") return <hr key={index} />;
        if (block.type === "heading") {
          const Heading = block.level <= 2 ? "h3" : "h4";
          return <Heading key={index}><InlineMarkdown text={block.text} /></Heading>;
        }
        if (block.type === "unordered" || block.type === "ordered") {
          const List = block.type === "ordered" ? "ol" : "ul";
          return <List key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}><InlineMarkdown text={item} /></li>)}</List>;
        }
        return <p key={index}><InlineMarkdown text={block.text} /></p>;
      })}
    </div>
  );
}

function ConnectionSetup({ chatgpt, startLogin, codeCopied, copyUserCode }) {
  const pending = chatgpt.isConnecting || chatgpt.isPending;

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
        <button type="button" onClick={startLogin} disabled={pending}>
          {pending ? "Connecting…" : "Continue with ChatGPT"}<span>↗</span>
        </button>

        {chatgpt.isPending && chatgpt.userCode && (
          <div className={styles.pendingCode} aria-live="polite">
            <span>ENTER THIS CODE IN THE CHATGPT WINDOW</span>
            <div><code>{chatgpt.userCode}</code><button type="button" onClick={copyUserCode}>Copy</button></div>
            <p className={codeCopied ? styles.copiedMessage : ""}>
              {codeCopied ? "✓ Code copied to clipboard" : "Copy the code, then paste it into the connection window."}
            </p>
          </div>
        )}

        {chatgpt.error && <div className={styles.error} role="alert">{chatgpt.error}</div>}

        <div className={styles.privacyList}>
          <span><i>✓</i> Uses your own subscription</span>
          <span><i>✓</i> Disconnect at any time</span>
          <span><i>✓</i> No separate AI usage fee</span>
        </div>
      </section>
    </div>
  );
}

function ConnectedWorkspace({ chatgpt, messages, status, error, input, setInput, handleSend, scrollRef, dataCounts }) {
  const isStreaming = status === "streaming" || status === "submitted";

  return (
    <div className={styles.workspace}>
      <section className={styles.chatPanel}>
        <header className={styles.panelHead}>
          <div><p>PROCESS INTELLIGENCE</p><h2>Ask your trading data.</h2></div>
          <div className={styles.connectedBadge}><StatusMark /><span>ChatGPT connected</span></div>
        </header>

        <div className={styles.messageArea} ref={scrollRef}>
          {messages.length === 0 ? (
            <div className={styles.chatEmpty}>
              <span className={styles.orbitMark} aria-hidden="true"><i /><i /><i /></span>
              <p className={styles.chatEyebrow}>YOUR PROCESS, IN CONTEXT</p>
              <h3>What do you want<br />to understand?</h3>
              <p>Ask about a session, compare patterns across weeks, or turn your journal into a specific next action.</p>
            </div>
          ) : (
            <div className={styles.messages}>
              {messages.map((message) => {
                const text = getMessageText(message);
                if (!text && message.role !== "assistant") return null;
                return (
                  <article className={`${styles.message} ${message.role === "user" ? styles.userMessage : styles.assistantMessage}`} key={message.id}>
                    <span>{message.role === "user" ? "YOU" : "ASSISTANT"}</span>
                    {message.role === "assistant"
                      ? <MarkdownAnswer text={text || (isStreaming ? "Thinking…" : "")} />
                      : <p>{text}</p>}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {error && <div className={styles.error} role="alert">{error.message || "Something went wrong. Try again."}</div>}

        <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); void handleSend(); }}>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Ask a question about your process…"
            rows={3}
            disabled={isStreaming}
          />
          <div className={styles.composerFoot}>
            <small>Relevant account data is added automatically · Ctrl+Enter to send</small>
            <button type="submit" disabled={isStreaming || !input.trim()}>{isStreaming ? "Thinking…" : "Ask assistant"}<b>↗</b></button>
          </div>
        </form>
      </section>

      <aside className={styles.insightRail}>
        <section className={styles.promptSection}>
          <div className={styles.railHead}><p>START WITH A QUESTION</p><span>04 prompts</span></div>
          <div className={styles.promptList}>
            {PROMPTS.map((prompt) => (
              <button type="button" key={prompt.index} onClick={() => void handleSend(prompt.text)} disabled={isStreaming}>
                <span>{prompt.index}</span><div><small>{prompt.type}</small><strong>{prompt.text}</strong></div><b>↗</b>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.dataSection}>
          <div className={styles.railHead}><p>DATA AVAILABLE</p><span>LIVE</span></div>
          <div className={styles.dataList}>
            {DATA_SOURCES.map((source) => (
              <div key={source.key}>
                <span>{source.label}</span>
                <strong>{dataCounts?.[source.key] ?? "—"}</strong>
                <small>{dataCounts ? `${source.detail} · entries available` : "Loading entries…"}</small>
              </div>
            ))}
          </div>
        </section>

        <div className={styles.accountStrip}>
          <span>{chatgpt.user?.email || "CHATGPT ACCOUNT"}</span>
          <button type="button" onClick={() => void chatgpt.logout()}>Disconnect</button>
        </div>
      </aside>
    </div>
  );
}

function AssistantChat({ chatgpt }) {
  const [input, setInput] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);
  const [dataCounts, setDataCounts] = useState(null);
  const scrollRef = useRef(null);
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/assistant" }), []);
  const { messages, sendMessage, status, error, clearError } = useChat({ transport });
  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (!chatgpt.isPending || !chatgpt.userCode) {
      setCodeCopied(false);
      return undefined;
    }

    let active = true;
    navigator.clipboard?.writeText(chatgpt.userCode).then(() => {
      if (active) setCodeCopied(true);
    }).catch(() => {
      if (active) setCodeCopied(false);
    });
    return () => { active = false; };
  }, [chatgpt.isPending, chatgpt.userCode]);

  useEffect(() => {
    if (!chatgpt.isAuthenticated) {
      setDataCounts(null);
      return undefined;
    }

    const controller = new AbortController();
    fetch("/api/assistant/counts", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Count request failed")))
      .then((counts) => setDataCounts(counts))
      .catch((error) => {
        if (error.name !== "AbortError") setDataCounts(null);
      });
    return () => controller.abort();
  }, [chatgpt.isAuthenticated]);

  async function copyUserCode() {
    if (!chatgpt.userCode) return;
    try {
      await navigator.clipboard.writeText(chatgpt.userCode);
      setCodeCopied(true);
    } catch {
      setCodeCopied(false);
    }
  }

  async function handleSend(text) {
    const trimmed = (text ?? input).trim();
    if (!trimmed || !chatgpt.isAuthenticated || isStreaming) return;
    clearError();
    setInput("");
    await sendMessage({ text: trimmed });
  }

  function startLogin() {
    const popup = openLoginWithChatGPTConsentPopup({ appName: "Libertrade Loop", login: chatgpt.login });
    if (!popup) void chatgpt.login();
  }

  if (!chatgpt.isAuthenticated) {
    return <ConnectionSetup chatgpt={chatgpt} startLogin={startLogin} codeCopied={codeCopied} copyUserCode={copyUserCode} />;
  }

  return (
    <ConnectedWorkspace
      chatgpt={chatgpt}
      messages={messages}
      status={status}
      error={error}
      input={input}
      setInput={setInput}
      handleSend={handleSend}
      scrollRef={scrollRef}
      dataCounts={dataCounts}
    />
  );
}

export default function AssistantPage() {
  return (
    <WorkflowPageLayout>
      <div className={styles.page}>
        <header className={styles.header}>
          <p>{headerDate()}</p>
          <h1 className="hybrid-page-title">AI Assistant<span className="hybrid-page-title-stop" aria-hidden="true" /></h1>
          <div className={styles.headerBottom}>
            <p>Ask questions about the process behind your results.</p>
            <span>YOUR DATA · YOUR CHATGPT</span>
          </div>
        </header>

        <LoginWithChatGPT consent={{ appName: "Libertrade Loop" }}>
          {(chatgpt) => <AssistantChat chatgpt={chatgpt} />}
        </LoginWithChatGPT>
      </div>
    </WorkflowPageLayout>
  );
}
