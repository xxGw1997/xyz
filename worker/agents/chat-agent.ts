import { Agent } from "agents";
import { eq } from "drizzle-orm";
import {
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createDb } from "../lib/db";
import { SYSTEM_PROMPT } from "./prompts";
import { aiChat, aiChatMessage } from "../lib/db/schema";

type ChatAgentProps = {
  chatId?: string;
  userId?: string;
};

type ChatAgentRequestBody = {
  message?: string;
  chatId?: string;
  userId?: string;
};

export class ChatAgent extends Agent<Env, unknown, ChatAgentProps> {
  private chatId: string = "";
  private userId: string = "";

  async onStart(props?: ChatAgentProps) {
    this.setChatContext(props);
  }

  private setChatContext(props?: ChatAgentProps) {
    if (props?.chatId) this.chatId = props.chatId;
    if (props?.userId) this.userId = props.userId;
  }

  async onRequest(request: Request): Promise<Response> {
    const body = await request.json<ChatAgentRequestBody>();
    this.setChatContext(body);

    if (!body.message?.trim()) {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    if (!this.chatId || !this.userId) {
      console.error("ChatAgent missing context", {
        chatId: this.chatId,
        userId: this.userId,
      });
      return Response.json(
        { error: "Chat context is missing" },
        { status: 400 },
      );
    }

    return this.handleMessages(body.message, this.userId);
  }
  private async handleMessages(
    userInput: string,
    userId: string,
  ): Promise<Response> {
    const history = await this.prepareMessages();
    const userMessage: UIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      parts: [{ type: "text", text: userInput }],
    };

    await this.appendMessages(this.chatId, userId, [userMessage]);

    const originalMessages = [...history, userMessage];

    const provider = createOpenAI({
      apiKey: this.env.AI_API_KEY,
      baseURL: this.env.AI_BASE_URL,
    });
    const llmModel = provider(this.env.AI_MODEL);
    const result = streamText({
      model: llmModel,
      instructions: SYSTEM_PROMPT,
      messages: await convertToModelMessages(originalMessages),
      // tools:
      stopWhen: isStepCount(5),
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        originalMessages,
        generateMessageId: createIdGenerator({
          prefix: "msg",
          size: 16,
        }),
        onEnd: async ({ messages }) => {
          await this.appendMessages(
            this.chatId,
            userId,
            (messages as UIMessage[]).filter(
              (message) => message.role === "assistant",
            ),
          );
        },
      }),
    });
  }

  private async prepareMessages(): Promise<UIMessage[]> {
    const db = createDb();
    const rows = await db
      .select()
      .from(aiChatMessage)
      .where(eq(aiChatMessage.chatId, this.chatId))
      .orderBy(aiChatMessage.createdAt);

    return rows.flatMap((item) => {
      if (
        item.role !== "system" &&
        item.role !== "user" &&
        item.role !== "assistant"
      )
        return [];

      return [
        {
          id: item.id,
          role: item.role,
          content: item.parts
            .filter(
              (p): p is { type: "text"; text: string } => p.type === "text",
            )
            .map((p) => p.text)
            .join(""),
          parts: item.parts,
        },
      ];
    });
  }

  private async appendMessages(
    chatId: string,
    userId: string,
    messages: UIMessage[],
  ) {
    if (!chatId || !userId) {
      console.error("Skip saving AI chat messages: missing context", {
        chatId,
        userId,
      });
      return;
    }

    const db = createDb();
    const now = Date.now();

    try {
      if (messages.length) {
        await db
          .insert(aiChatMessage)
          .values(
            messages.map((msg, index) => ({
              id: msg.id,
              chatId,
              userId,
              role: msg.role,
              parts: msg.parts,
              metadata: msg.metadata ?? null,
              status: "ready" as const,
              createdAt: new Date(now + index),
              updatedAt: new Date(now + index),
            })),
          )
          .onConflictDoNothing({ target: aiChatMessage.id });
      }

      await db
        .update(aiChat)
        .set({ updatedAt: new Date(now), lastMessageAt: new Date(now) })
        .where(eq(aiChat.id, chatId));
    } catch (error) {
      console.error("Failed to save AI chat messages", error);
      throw error;
    }
  }
}
