"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useOrg } from "@/lib/org-context";
import { api, ApiError, ConversationMessage, ConversationSummary } from "@/lib/api";

export default function AIChatPage() {
  const { token } = useAuth();
  const { currentOrg } = useOrg();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function loadConversations() {
    if (!token || !currentOrg) return;
    try {
      setConversations(await api.listConversations(currentOrg.id, token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load conversations");
    }
  }

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentOrg?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function openConversation(conversationId: string) {
    if (!token || !currentOrg) return;
    setError(null);
    try {
      const detail = await api.getConversation(currentOrg.id, conversationId, token);
      setActiveConversationId(detail.id);
      setMessages(detail.messages);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load conversation");
    }
  }

  function startNewConversation() {
    setActiveConversationId(null);
    setMessages([]);
    setError(null);
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!token || !currentOrg || !input.trim()) return;

    const userMessage: ConversationMessage = {
      role: "user",
      content: input,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);
    setError(null);

    try {
      const result = await api.sendChatMessage(
        currentOrg.id,
        { conversation_id: activeConversationId ?? undefined, message: userMessage.content },
        token
      );
      setActiveConversationId(result.conversation_id);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.message, created_at: new Date().toISOString() },
      ]);
      await loadConversations();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send message");
    } finally {
      setIsSending(false);
    }
  }

  if (!currentOrg) return null;

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      <aside className="w-64 flex-shrink-0 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="border-b border-gray-200 p-3 dark:border-gray-800">
          <button
            onClick={startNewConversation}
            className="w-full rounded-md bg-brand-600 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            New conversation
          </button>
        </div>
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {conversations.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => openConversation(c.id)}
                className={`block w-full px-3 py-2 text-left text-sm ${
                  c.id === activeConversationId
                    ? "bg-brand-50 dark:bg-brand-500/10"
                    : "hover:bg-gray-50 dark:hover:bg-gray-900"
                }`}
              >
                <p className="truncate font-medium text-gray-900 dark:text-gray-100">{c.customer_identifier}</p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {c.last_message_preview ?? "No messages yet"}
                </p>
              </button>
            </li>
          ))}
          {conversations.length === 0 && (
            <li className="p-3 text-sm text-gray-500 dark:text-gray-400">No conversations yet.</li>
          )}
        </ul>
      </aside>

      <div className="flex flex-1 flex-col rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="border-b border-gray-200 p-4 dark:border-gray-800">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">AI Sales Agent - Test Chat</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Try conversations here before going live on any channel.
          </p>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-lg rounded-lg px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Send a message to start testing the AI Sales Agent.
            </p>
          )}
          <div ref={messagesEndRef} />
        </div>

        {error && <p className="border-t border-gray-200 px-4 py-2 text-sm text-red-600 dark:border-gray-800">{error}</p>}

        <form onSubmit={handleSend} className="flex gap-2 border-t border-gray-200 p-4 dark:border-gray-800">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about a product, shipping, returns..."
            disabled={isSending}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {isSending ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
