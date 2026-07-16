import { Agent } from "agents";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import {
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStream,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type LanguageModel,
} from "ai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createDb } from "../lib/db";
import { SYSTEM_PROMPT } from "./prompts";
import { aiChat, aiChatMessage } from "../lib/db/schema";
import { mergeApprovalStates, prepareModelContext } from "./message-utils";
import { tools } from "./tools";
import {
  findFirstUserMessageText,
  generateChatTitle,
  isMissingChatTitle,
} from "./chat-title";
import type { AgentMessage } from "./types";

type ChatAgentProps = {
  chatId?: string;
  userId?: string;
};

type ChatAgentRequestBody = {
  message?: AgentMessage;
  messages?: AgentMessage[];
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
    let originalMessages: AgentMessage[];

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
    const model = deepseek(this.env.AI_MODEL);
    const titlePromise =
      !isToolApprovalFlow && body.message?.role === "user"
        ? this.generateAndSaveMissingTitle(model, originalMessages).catch(
            (error: unknown) => {
              console.error("Failed to generate AI chat title", error);
              return null;
            },
          )
        : null;

    const modelContextMessages = prepareModelContext(originalMessages);
    const modelMessages = await convertToModelMessages(modelContextMessages);

    const stream = createUIMessageStream<AgentMessage>({
      originalMessages,
      execute: async ({ writer }) => {
        const result = streamText({
          model,
          instructions: SYSTEM_PROMPT,
          messages: modelMessages,
          tools: tools,
          toolApproval: {
            getWeather: "user-approval",
          },
          stopWhen: isStepCount(5),
        });

        writer.merge(toUIMessageStream({ stream: result.stream }));

        if (titlePromise) {
          const title = await titlePromise;

          if (title) {
            writer.write({
              type: "data-chat-title",
              data: {
                chatId: this.chatId,
                title,
              },
              transient: true,
            });
          }
        }
      },
      generateId: createIdGenerator({
        prefix: "msg",
        size: 16,
      }),
      onEnd: async ({ messages }) => {
        await this.appendMessages(this.chatId, userId, messages);
      },
      onError: (error) => {
        console.error("AI message stream failed", error);
        return "An error occurred while generating the response.";
      },
    });

    return createUIMessageStreamResponse({
      stream,
    });
  }

  private async generateAndSaveMissingTitle(
    model: LanguageModel,
    messages: AgentMessage[],
  ): Promise<string | null> {
    const db = createDb();
    const [chat] = await db
      .select({ title: aiChat.title })
      .from(aiChat)
      .where(
        and(eq(aiChat.id, this.chatId), eq(aiChat.userId, this.userId)),
      )
      .limit(1);

    if (!chat || !isMissingChatTitle(chat.title)) return null;

    const firstUserMessage = findFirstUserMessageText(messages);
    if (!firstUserMessage) return null;

    const title = await generateChatTitle({
      model,
      message: firstUserMessage,
    });
    if (!title) return null;

    const updatedRows = await db
      .update(aiChat)
      .set({
        title,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(aiChat.id, this.chatId),
          eq(aiChat.userId, this.userId),
          or(
            isNull(aiChat.title),
            eq(sql<string>`trim(${aiChat.title})`, ""),
            eq(sql<string>`trim(${aiChat.title})`, "New Chat"),
          ),
        ),
      )
      .returning({ title: aiChat.title });

    return updatedRows[0]?.title ?? null;
  }

  private async getMessagesByChatId(): Promise<AgentMessage[]> {
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
    messages: AgentMessage[],
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
