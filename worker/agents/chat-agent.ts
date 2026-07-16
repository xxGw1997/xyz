import { Agent } from "agents";
import { eq, sql } from "drizzle-orm";
import {
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createDb } from "../lib/db";
import { SYSTEM_PROMPT } from "./prompts";
import { aiChat, aiChatMessage } from "../lib/db/schema";
import { mergeApprovalStates, prepareModelContext } from "./message-utils";
import { tools } from "./tools";

type ChatAgentProps = {
  chatId?: string;
  userId?: string;
};

type ChatAgentRequestBody = {
  message?: UIMessage;
  messages?: UIMessage[];
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

    if (!body.message && !body.messages?.length) {
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

    return this.handleMessages(body, this.userId);
  }

  private async handleMessages(
    body: ChatAgentRequestBody,
    userId: string,
  ): Promise<Response> {
    const isToolApprovalFlow = Boolean(body.messages?.length);
    const messagesFromDb = await this.getMessagesByChatId();
    let originalMessages: UIMessage[];

    if (isToolApprovalFlow && body.messages) {
      originalMessages = mergeApprovalStates(messagesFromDb, body.messages);
    } else if (body.message?.role === "user") {
      await this.appendMessages(this.chatId, userId, [body.message]);
      originalMessages = [...messagesFromDb, body.message];
    } else {
      return Response.json(
        { error: "A user message is required" },
        { status: 400 },
      );
    }

    const deepseek = createDeepSeek({
      apiKey: this.env.AI_API_KEY,
      baseURL: this.env.AI_BASE_URL,
    });

    const modelContextMessages = prepareModelContext(originalMessages);

    const result = streamText({
      model: deepseek(this.env.AI_MODEL),
      instructions: SYSTEM_PROMPT,
      messages: await convertToModelMessages(modelContextMessages),
      tools: tools,
      toolApproval: {
        getWeather: "user-approval",
      },
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
            messages as UIMessage[],
          );
        },
      }),
    });
  }

  private async getMessagesByChatId(): Promise<UIMessage[]> {
    const db = createDb();
    const rows = await db
      .select()
      .from(aiChatMessage)
      .where(eq(aiChatMessage.chatId, this.chatId))
      .orderBy(aiChatMessage.createdAt);

    return rows.map((item) => ({
      id: item.id,
      role: item.role,
      parts: item.parts,
      ...(item.metadata ? { metadata: item.metadata } : {}),
    }));
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
          .onConflictDoUpdate({
            target: aiChatMessage.id,
            set: {
              parts: sql`excluded.parts`,
              metadata: sql`excluded.metadata`,
              status: sql`excluded.status`,
              updatedAt: sql`excluded.updated_at`,
            },
          });
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
