import { createChatGPTHandler } from "@opencoredev/loginwithchatgpt-server";
import {
  supabaseChatgptKvStore,
  supabaseSessionStore,
} from "@/lib/chatgpt-session-store";

export const ALLOWED_CHATGPT_MODELS = ["gpt-5.5", "gpt-5.4", "gpt-5.4-mini"];

export const chatgptAuth = createChatGPTHandler({
  secret: process.env.LWC_SECRET,
  sessionStore: supabaseSessionStore,
  responsesProxy: {
    allowedModels: ALLOWED_CHATGPT_MODELS,
    rateLimit: {
      limit: 30,
      windowMs: 60_000,
      store: supabaseChatgptKvStore,
    },
  },
});

export function pickChatGptModel(models) {
  if (!models?.length) return null;
  return ALLOWED_CHATGPT_MODELS.find((model) => models.includes(model)) ?? models[0];
}

/**
 * Server-side proxy provider fetch that forwards the browser session cookie
 * to the mounted /api/chatgpt handler.
 */
export function createChatGptRequestFetch(request) {
  return (input, init = {}) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const resolved = url.startsWith("http") ? url : new URL(url, request.url).toString();
    const headers = new Headers(init.headers);
    const cookie = request.headers.get("cookie");
    if (cookie) headers.set("cookie", cookie);
    return fetch(resolved, { ...init, headers, signal: init.signal ?? request.signal });
  };
}
