// ==========================================
// Customer Portal — Chat Page (AI Assistant)
// ==========================================

import React, { useState, useRef, useEffect } from "react";
import { sendChatMessage } from "../hooks/useCustomerApi";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! 👋 I'm your DWIP Service Assistant. I can help you check your vehicle status, service history, estimated completion times, and invoices. What would you like to know?",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || loading) return;

    const userMsg: Message = {
      role: "user",
      content: msg,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await sendChatMessage(msg);
      const assistantMsg: Message = {
        role: "assistant",
        content: res.response || "Sorry, I couldn't process that.",
        timestamp: res.timestamp || new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm having trouble connecting. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    "Where is my vehicle?",
    "Service history",
    "When will it be ready?",
  ];

  return (
    <div style={s.container}>
      {/* Messages Area */}
      <div ref={scrollRef} style={s.messagesArea}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              ...s.messageBubbleWrap,
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            {msg.role === "assistant" && (
              <div style={s.assistantAvatar}>🤖</div>
            )}
            <div
              style={{
                ...s.bubble,
                ...(msg.role === "user" ? s.userBubble : s.assistantBubble),
              }}
            >
              <p style={s.bubbleText}>{msg.content}</p>
              <span style={s.bubbleTime}>
                {new Date(msg.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ ...s.messageBubbleWrap, justifyContent: "flex-start" }}>
            <div style={s.assistantAvatar}>🤖</div>
            <div style={{ ...s.bubble, ...s.assistantBubble }}>
              <div style={s.typingDots}>
                <span style={{ ...s.dot, animationDelay: "0s" }}>●</span>
                <span style={{ ...s.dot, animationDelay: "0.2s" }}>●</span>
                <span style={{ ...s.dot, animationDelay: "0.4s" }}>●</span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions (shown when few messages) */}
        {messages.length <= 1 && !loading && (
          <div style={s.quickActions}>
            <p style={s.quickLabel}>Quick Actions:</p>
            {quickActions.map((action) => (
              <button
                key={action}
                style={s.quickBtn}
                onClick={() => {
                  setInput(action);
                  setTimeout(() => {
                    setInput(action);
                    handleSend();
                  }, 100);
                }}
              >
                {action}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={s.inputArea}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Ask about your vehicle..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          style={s.input}
          maxLength={500}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            ...s.sendBtn,
            opacity: loading || !input.trim() ? 0.5 : 1,
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "calc(100vh - 140px)", // account for header + tab bar
    marginTop: -16,
    marginLeft: -16,
    marginRight: -16,
  },
  messagesArea: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    paddingBottom: 8,
  },
  messageBubbleWrap: {
    display: "flex",
    alignItems: "flex-end",
    gap: 6,
    marginBottom: 10,
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    flexShrink: 0,
  },
  bubble: {
    maxWidth: "78%",
    padding: "10px 14px",
    borderRadius: 16,
    fontSize: 14,
    lineHeight: 1.5,
  },
  userBubble: {
    background: "linear-gradient(135deg, #1e3a5f, #2d5a8e)",
    color: "#ffffff",
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    background: "#ffffff",
    color: "#1a1a2e",
    border: "1px solid #e2e8f0",
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    margin: 0,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  bubbleTime: {
    display: "block",
    fontSize: 10,
    opacity: 0.6,
    marginTop: 4,
    textAlign: "right",
  },
  typingDots: {
    display: "flex",
    gap: 4,
    padding: "4px 0",
  },
  dot: {
    fontSize: 12,
    color: "#94a3b8",
    animation: "pulse 1s infinite",
  },
  quickActions: {
    marginTop: 12,
    textAlign: "center",
  },
  quickLabel: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 8,
  },
  quickBtn: {
    display: "inline-block",
    margin: "4px",
    padding: "8px 14px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
    color: "#1e3a5f",
    cursor: "pointer",
    transition: "background 0.15s",
  },
  inputArea: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 16px",
    background: "#ffffff",
    borderTop: "1px solid #e2e8f0",
  },
  input: {
    flex: 1,
    padding: "10px 14px",
    border: "1.5px solid #d1d5db",
    borderRadius: 22,
    fontSize: 14,
    outline: "none",
    background: "#fafaf9",
    transition: "border-color 0.2s",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #1e3a5f, #2d5a8e)",
    color: "#ffffff",
    border: "none",
    fontSize: 16,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxShadow: "0 2px 8px rgba(30,58,95,0.3)",
    transition: "opacity 0.15s",
  },
};
