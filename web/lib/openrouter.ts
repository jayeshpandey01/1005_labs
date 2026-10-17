/**
 * OpenRouter API Client for PJP-GraphRAG
 * Provides model-agnostic LLM inference for:
 * 1. Cypher generation with schema context
 * 2. Conversational reasoning and natural language answer grounding
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function callOpenRouter(
  messages: ChatMessage[],
  temperature = 0.1,
  max_tokens = 400
): Promise<string | null> {
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY.trim() === "") {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout

    const res = await fetch(OPENROUTER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://pjp-sales-copilot.vercel.app",
        "X-Title": "PJP Sales Optimization Copilot",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages,
        temperature,
        max_tokens,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[OpenRouter] Request returned HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.warn("[OpenRouter] API call failed or timed out:", err);
    return null;
  }
}

