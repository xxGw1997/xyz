import { Hono } from "hono";
import type { UIMessage } from "ai";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { createDb } from "../lib/db";
import { aiChat, aiChatMessage } from "../lib/db/schema";
import { authMiddleware } from "../middlewares/auth.middleware";
import type { AuthVar } from "../types";
import { getAgentByName } from "agents";

export const chatAgentRoute = new Hono<{ Bindings: Env; Variables: AuthVar }>();

chatAgentRoute.use(authMiddleware);

export const chatAgentType = chatAgentRoute
  .post("/chats", async (c) => {
    const db = createDb();
    const userId = c.get("user").id;
    const now = new Date();
    const chatId = crypto.randomUUID();

    await db.insert(aiChat).values({
      id: chatId,
      userId,
      title: "New Chat",
      model: "deepseek-v4-pro",
      systemPrompt: "SYSTEM_PROMPT",
      createdAt: now,
      updatedAt: now,
    });

    return c.json({ chatId });
  })
  .get("/chats", async (c) => {
    const db = createDb();
    const userId = c.get("user").id;

    const chatList = await db
      .select({
        id: aiChat.id,
        title: aiChat.title,
      })
      .from(aiChat)
      .where(and(eq(aiChat.userId, userId), eq(aiChat.status, "active")))
      .orderBy(desc(aiChat.updatedAt));

    return c.json({ chats: chatList });
  })
  .get("/chats/:chatId", async (c) => {
    const db = createDb();
    const chatId = c.req.param("chatId");
    const userId = c.get("user").id;

    const condition = and(
      ne(aiChat.status, "deleted"),
      eq(aiChat.id, chatId),
      eq(aiChat.userId, userId),
    );

    const [chatDetail] = await db
      .select()
      .from(aiChat)
      .where(condition)
      .limit(1);

    return c.json({
      chatDetail,
    });
  })
  .get("/chats/:chatId/messages", async (c) => {
    const db = createDb();
    const chatId = c.req.param("chatId");
    const userId = c.get("user").id;

    const [chat] = await db
      .select({ id: aiChat.id })
      .from(aiChat)
      .where(
        and(
          eq(aiChat.id, chatId),
          eq(aiChat.userId, userId),
          ne(aiChat.status, "deleted"),
        ),
      )
      .limit(1);

    if (!chat) {
      return c.json({ error: "Chat not found" }, 404);
    }

    const rows = await db
      .select({
        id: aiChatMessage.id,
        role: aiChatMessage.role,
        parts: aiChatMessage.parts,
        metadata: aiChatMessage.metadata,
      })
      .from(aiChatMessage)
      .where(eq(aiChatMessage.chatId, chatId))
      .orderBy(asc(aiChatMessage.createdAt));

    const messages: UIMessage[] = rows.map((row) => ({
      id: row.id,
      role: row.role,
      content: row.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join(""),
      parts: row.parts,
      ...(row.metadata ? { metadata: row.metadata } : {}),
    }));

    return c.json({ messages });
  })
  .patch("/chats/:chatId", async (c) => {
    const db = createDb();
    const chatId = c.req.param("chatId");
    const userId = c.get("user").id;

    const [chat] = await db
      .select({ id: aiChat.id })
      .from(aiChat)
      .where(
        and(
          eq(aiChat.id, chatId),
          eq(aiChat.userId, userId),
          ne(aiChat.status, "deleted"),
        ),
      )
      .limit(1);

    if (!chat) {
      return c.json({ error: "Chat not found" }, 404);
    }

    const body = await c.req.json<{
      title?: string;
      model?: string;
      systemPrompt?: string;
      status?: "active" | "archived";
      visibility?: "private" | "shared";
    }>();

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.model !== undefined) updateData.model = body.model;
    if (body.systemPrompt !== undefined)
      updateData.systemPrompt = body.systemPrompt;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.visibility !== undefined) updateData.visibility = body.visibility;

    await db.update(aiChat).set(updateData).where(eq(aiChat.id, chatId));

    const [updated] = await db
      .select()
      .from(aiChat)
      .where(eq(aiChat.id, chatId))
      .limit(1);

    return c.json({ chat: updated });
  })
  .delete("/chats/:chatId", async (c) => {
    const db = createDb();
    const chatId = c.req.param("chatId");
    const userId = c.get("user").id;

    const [chat] = await db
      .select({ id: aiChat.id })
      .from(aiChat)
      .where(
        and(
          eq(aiChat.id, chatId),
          eq(aiChat.userId, userId),
          ne(aiChat.status, "deleted"),
        ),
      )
      .limit(1);

    if (!chat) {
      return c.json({ error: "Chat not found" }, 404);
    }

    await db
      .update(aiChat)
      .set({ status: "deleted", updatedAt: new Date() })
      .where(eq(aiChat.id, chatId));

    return c.json({ success: true });
  })
  .post("/chats/:chatId/messages", async (c) => {
    const chatId = c.req.param("chatId");
    const userId = c.get("user").id;
    const db = createDb();

    const [isCurrentUserMessage] = await db
      .select()
      .from(aiChat)
      .where(and(eq(aiChat.id, chatId), eq(aiChat.userId, userId)))
      .limit(1);

    if (!isCurrentUserMessage) return c.json({ error: "Forbidden" }, 403);

    const agent = await getAgentByName(c.env.CHAT_AGENT, chatId, {
      props: {
        chatId,
        userId,
      },
    });

    const body = await c.req.json<{
      message?: UIMessage;
      messages?: UIMessage[];
    }>();
    const headers = new Headers(c.req.raw.headers);
    headers.set("content-type", "application/json");
    headers.delete("content-length");

    return agent.fetch(
      new Request(c.req.raw.url, {
        method: c.req.raw.method,
        body: JSON.stringify({
          ...body,
          chatId,
          userId,
        }),
        headers,
      }),
    );
  });
