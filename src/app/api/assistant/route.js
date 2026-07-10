import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { createChatGPTProxyProvider } from "@opencoredev/loginwithchatgpt-ai";
import { NextResponse } from "next/server";
import { ASSISTANT_SYSTEM_PROMPT, createAssistantTools } from "@/lib/assistant/tools";
import {
  chatgptAuth,
  createChatGptRequestFetch,
  pickChatGptModel,
} from "@/lib/chatgpt-handler";
import { createClient } from "@/lib/supabase/server";

export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chatgptSession = await chatgptAuth.getSession(request);
  if (chatgptSession.status !== "authenticated") {
    return NextResponse.json({ error: "ChatGPT not connected" }, { status: 401 });
  }

  const models = await chatgptAuth.getModels(request);
  const model = pickChatGptModel(models);
  if (!model) {
    return NextResponse.json({ error: "No ChatGPT model available for this account" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { messages } = body ?? {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages array is required" }, { status: 400 });
  }

  const chatgpt = createChatGPTProxyProvider({
    fetch: createChatGptRequestFetch(request),
  });

  const startedAt = Date.now();
  const result = streamText({
    model: chatgpt(model),
    system: ASSISTANT_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: createAssistantTools(supabase, user.id),
    stopWhen: stepCountIs(6),
    onFinish: ({ finishReason }) => {
      console.info("assistant/stream", {
        userId: user.id,
        model,
        finishReason,
        durationMs: Date.now() - startedAt,
      });
    },
  });

  return result.toUIMessageStreamResponse();
}
