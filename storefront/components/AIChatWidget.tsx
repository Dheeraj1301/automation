"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { sendChatMessage } from "@/lib/api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const STORAGE_CONVERSATION_KEY = "profitpilot_chat_conversation_id";
const STORAGE_CUSTOMER_KEY = "profitpilot_chat_customer_id";
const STORAGE_HISTORY_KEY = "profitpilot_chat_history";

function getOrCreateCustomerId(): string {
  let id = localStorage.getItem(STORAGE_CUSTOMER_KEY);
  if (!id) {
    id = `visitor-${crypto.randomUUID()}`;
    localStorage.setItem(STORAGE_CUSTOMER_KEY, id);
  }
  return id;
}

export function AIChatWidget({
  organizationName,
  organizationSlug,
}: {
  organizationName: string;
  organizationSlug: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_HISTORY_KEY);
    if (stored) {
      try {
        setMessages(JSON.parse(stored));
      } catch {
        // ignore malformed local history
      }
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isOpen]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    setError(null);
    setInput("");
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setIsSending(true);

    try {
      const conversationId = localStorage.getItem(STORAGE_CONVERSATION_KEY);
      const customerId = getOrCreateCustomerId();
      const response = await sendChatMessage(organizationSlug, text, conversationId, customerId);
      localStorage.setItem(STORAGE_CONVERSATION_KEY, response.conversation_id);
      const withReply: ChatMessage[] = [...nextMessages, { role: "assistant", content: response.message }];
      setMessages(withReply);
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(withReply));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="fixed bottom-5 left-5 z-40">
      {isOpen && (
        <div className="mb-3 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-theme-lg border border-border bg-surface shadow-theme">
          <div className="flex items-center justify-between border-b border-border bg-primary px-4 py-3 text-on-primary">
            <p className="text-sm font-semibold">Chat with {organizationName}</p>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Close chat" className="opacity-90 hover:opacity-100">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <p className="text-sm text-muted">
                Ask about products, pricing, or anything else — I&apos;m here to help.
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-theme px-3 py-2 text-sm ${
                    msg.role === "user" ? "bg-primary text-on-primary" : "bg-surface-alt text-text"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isSending && <div className="text-sm text-muted">Typing...</div>}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-theme border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="rounded-theme bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Open chat"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-theme transition-transform hover:scale-105"
      >
        {isOpen ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
            <path d="M12 2C6.48 2 2 6.03 2 11c0 2.42 1.09 4.61 2.86 6.24-.1.94-.44 2.28-1.36 3.5a.5.5 0 0 0 .49.76c1.98-.29 3.5-1.13 4.44-1.79A11.4 11.4 0 0 0 12 20c5.52 0 10-4.03 10-9s-4.48-9-10-9Z" />
          </svg>
        )}
      </button>
    </div>
  );
}
