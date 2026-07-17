// The one deliberate client-side exception to lib/api.ts's "everything
// fetches server-side" rule: a chat widget has to call the API directly
// from the browser, so this uses NEXT_PUBLIC_API_URL (browser-reachable),
// not the internal API_INTERNAL_URL used by server components.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatTurnResult {
  conversation_id: string;
  message: string;
}

export async function sendChatMessage(
  merchantSlug: string,
  message: string,
  conversationId: string | null
): Promise<ChatTurnResult> {
  const res = await fetch(`${API_URL}/api/public/${merchantSlug}/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, conversation_id: conversationId ?? undefined }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? "Could not reach the AI Sales Agent");
  }

  return res.json();
}
