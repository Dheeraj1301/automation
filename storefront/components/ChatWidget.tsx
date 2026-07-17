"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ChatMessage, sendChatMessage } from "@/lib/chat-client";

function storageKey(merchantSlug: string, suffix: string) {
  return `profitpilot_chat_${merchantSlug}_${suffix}`;
}

export function ChatWidget({ merchantSlug, organizationName }: { merchantSlug: string; organizationName: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedId = localStorage.getItem(storageKey(merchantSlug, "id"));
    const storedMessages = localStorage.getItem(storageKey(merchantSlug, "messages"));
    if (storedId) setConversationId(storedId);
    if (storedMessages) {
      try {
        setMessages(JSON.parse(storedMessages));
      } catch {
        // Corrupt cache - ignore and start fresh.
      }
    }
  }, [merchantSlug]);

  useEffect(() => {
    if (isOpen) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  function persist(nextMessages: ChatMessage[], nextConversationId: string) {
    localStorage.setItem(storageKey(merchantSlug, "messages"), JSON.stringify(nextMessages));
    localStorage.setItem(storageKey(merchantSlug, "id"), nextConversationId);
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    const userMessage: ChatMessage = { role: "user", content: input };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);
    setError(null);

    try {
      const result = await sendChatMessage(merchantSlug, userMessage.content, conversationId);
      const withReply: ChatMessage[] = [...nextMessages, { role: "assistant", content: result.message }];
      setMessages(withReply);
      setConversationId(result.conversation_id);
      persist(withReply, result.conversation_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen && (
        <div className="mb-3 flex h-96 w-80 flex-col overflow-hidden rounded-theme border border-black/10 bg-surface shadow-xl dark:border-white/10">
          <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10">
            <p className="text-sm font-medium">Chat with {organizationName}</p>
            <button onClick={() => setIsOpen(false)} aria-label="Close chat" className="text-muted hover:text-brand">
              Close
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {messages.length === 0 && (
              <p className="text-sm text-muted">Ask about products, shipping, or anything else.</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-theme px-3 py-2 text-sm ${
                    m.role === "user" ? "bg-brand text-white" : "bg-black/5 dark:bg-white/10"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {error && (
            <p className="border-t border-black/10 px-3 py-1 text-xs text-red-600 dark:border-white/10">{error}</p>
          )}

          <form onSubmit={handleSend} className="flex gap-2 border-t border-black/10 p-3 dark:border-white/10">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              disabled={isSending}
              className="flex-1 rounded-theme border border-black/10 px-2 py-1.5 text-sm outline-none dark:border-white/10 dark:bg-transparent"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="rounded-theme bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {isSending ? "..." : "Send"}
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Toggle chat"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg hover:bg-brand-dark"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8-1.06 0-2.077-.163-3.02-.462L3 21l1.5-4.5C3.55 15.163 3 13.634 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </button>
    </div>
  );
}
