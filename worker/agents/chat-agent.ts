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
import { createDb } from "../lib/db";
import { SYSTEM_PROMPT } from "./prompts";
import { aiChat, aiChatMessage } from "../lib/db/schema";

export class ChatAgent extends Agent<Env> {
  private chatId: string = "";
  async onStart(props: { chatId: string }) {
    this.chatId = props.chatId;
  }
  async onRequest(request: Request): Promise<Response> {
    const body = await request.json<{ message: string; userId: string }>();
    return this.handleMessages(body.message, body.userId);
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

    const originalMessages = [...history, userMessage];

    const result = streamText({
      model: "alibaba/qwen-3-14b",
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
          await this.replaceMessages(
            this.chatId,
            userId,
            messages as UIMessage[],
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

  private async replaceMessages(
    chatId: string,
    userId: string,
    messages: UIMessage[],
  ) {
    const db = createDb();
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx.delete(aiChatMessage).where(eq(aiChatMessage.chatId, chatId));

      if (messages.length) {
        await tx.insert(aiChatMessage).values(
          messages.map((msg) => ({
            id: msg.id,
            chatId,
            userId,
            role: msg.role,
            parts: msg.parts,
            metadata: msg.metadata ?? null,
            status: "ready" as const,
            createdAt: now,
            updatedAt: now,
          })),
        );
      }

      await tx
        .update(aiChat)
        .set({ updatedAt: now, lastMessageAt: now })
        .where(eq(aiChat.id, chatId));
    });
  }
}
