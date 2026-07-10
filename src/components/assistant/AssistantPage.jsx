"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  LoginWithChatGPT,
  openLoginWithChatGPTConsentPopup,
} from "@opencoredev/loginwithchatgpt-react";
import WorkflowPageLayout from "../WorkflowPageLayout";

const SUGGESTIONS = [
  "How was my readiness this week?",
  "Summarize my last 10 trades.",
  "What patterns show up in my post-market journals?",
  "Which days had stand-down readiness flags?",
];

function getMessageText(message) {
  if (!message?.parts?.length) return "";
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function headerDate() {
  return new Date()
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();
}

function AssistantChat({ chatgpt }) {
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/assistant" }),
    []
  );

  const { messages, sendMessage, status, error, clearError } = useChat({
    transport,
  });

  const isStreaming = status === "streaming" || status === "submitted";
  const canChat = chatgpt.isAuthenticated;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  async function handleSend(text) {
    const trimmed = (text ?? input).trim();
    if (!trimmed || !canChat || isStreaming) return;
    clearError();
    setInput("");
    await sendMessage({ text: trimmed });
  }

  function startLogin() {
    const popup = openLoginWithChatGPTConsentPopup({
      appName: "Libertrade Loop",
      login: chatgpt.login,
    });
    if (!popup) void chatgpt.login();
  }

  return (
    <div className="assistant-glass-shell">
      <div className="assistant-panel-head">
        <div>
          <h2 className="assistant-panel-title">Trading data chat</h2>
          <p className="assistant-panel-desc">
            {canChat
              ? "Connected to ChatGPT. Ask about any session in your Libertrade history."
              : "Connect ChatGPT to start querying your Libertrade data."}
          </p>
        </div>
        {canChat && (
          <div className="assistant-panel-actions">
            {chatgpt.user?.email && (
              <span className="assistant-panel-meta hybrid-label-sm">{chatgpt.user.email}</span>
            )}
            <button
              type="button"
              className="assistant-disconnect-btn"
              onClick={() => void chatgpt.logout()}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {!canChat ? (
        <div className="assistant-connect-panel">
          <div className="assistant-connect-copy">
            <div className="hybrid-label">Bring your own ChatGPT</div>
            <p>
              Sign in with your ChatGPT account so inference is billed to your subscription, not
              Libertrade. Your tokens never leave the server.
            </p>
          </div>
          <button
            type="button"
            className="assistant-login-btn"
            onClick={startLogin}
            disabled={chatgpt.isConnecting || chatgpt.isPending}
          >
            {chatgpt.isConnecting || chatgpt.isPending ? "Connecting…" : "Login with ChatGPT"}
          </button>
          {chatgpt.isPending && chatgpt.userCode && (
            <div className="assistant-pending-code">
              <span className="hybrid-label-sm">Enter this code in the OpenAI window</span>
              <code>{chatgpt.userCode}</code>
            </div>
          )}
          {chatgpt.error && <div className="assistant-error">{chatgpt.error}</div>}
        </div>
      ) : (
        <>
          <div className="assistant-messages" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="assistant-empty">
                <div className="assistant-empty-title">Ask about your process</div>
                <p className="assistant-empty-desc">
                  The assistant can pull trades, readiness check-ins, session plans, and close-the-loop
                  journals from your account.
                </p>
                <div className="assistant-suggestions">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="assistant-suggestion"
                      onClick={() => handleSend(suggestion)}
                      disabled={isStreaming}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => {
                const text = getMessageText(message);
                if (!text && message.role !== "assistant") return null;
                return (
                  <div
                    key={message.id}
                    className={`assistant-message assistant-message--${message.role}`}
                  >
                    <div className="assistant-message-label">
                      {message.role === "user" ? "You" : "Assistant"}
                    </div>
                    <div
                      className={`assistant-message-body${
                        !text && isStreaming ? " assistant-message-body--pending" : ""
                      }`}
                    >
                      {text || (isStreaming ? "Thinking…" : "")}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {error && (
            <div className="assistant-error" role="alert">
              {error.message || "Something went wrong. Try again."}
            </div>
          )}

          <form
            className="assistant-composer"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSend();
            }}
          >
            <textarea
              className="assistant-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Ask about your trades, readiness, or journal…"
              rows={3}
              disabled={isStreaming}
            />
            <div className="assistant-composer-actions">
              <span className="assistant-composer-hint">Ctrl+Enter to send</span>
              <button
                type="submit"
                className="assistant-send-btn"
                disabled={isStreaming || !input.trim()}
              >
                {isStreaming ? "Streaming…" : "Send"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

export default function AssistantPage() {
  return (
    <WorkflowPageLayout>
      <div className="assistant-page">
        <header className="assistant-header">
          <div className="hybrid-eyebrow">{headerDate()}</div>
          <h1 className="hybrid-page-title">
            AI Assistant<span className="hybrid-page-title-stop" aria-hidden="true" />
          </h1>
          <p className="assistant-header-desc">
            Ask questions about your trades, readiness, plans, and journals. Answers run on your own
            ChatGPT subscription.
          </p>
        </header>

        <LoginWithChatGPT consent={{ appName: "Libertrade Loop" }}>
          {(chatgpt) => <AssistantChat chatgpt={chatgpt} />}
        </LoginWithChatGPT>
      </div>
    </WorkflowPageLayout>
  );
}
