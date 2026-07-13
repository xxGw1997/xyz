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

/**
AI Chat API
- POST /api/ai/chats
  - 创建一个新的 AI 会话
  - 写入 aiChat
  - 绑定当前 user.id
  - 返回 chatId
- GET /api/ai/chats
  - 获取当前用户的会话列表
  - 查询 aiChat
  - 按 lastMessageAt 或 updatedAt 倒序
  - 用于侧边栏历史会话
- GET /api/ai/chats/:chatId
  - 获取单个会话元信息
  - 校验当前用户是否拥有该会话
  - 返回 title、model、status、systemPrompt 等
- GET /api/ai/chats/:chatId/messages
  - 获取该会话的历史消息
  - 校验权限
  - 查询 aiChatMessage
  - 转换为 UIMessage[] 返回给前端恢复聊天
- POST /api/ai/chats/:chatId/messages
  - 发送用户消息并流式返回 assistant 回复
  - 校验权限
  - 获取对应 Agent / Durable Object
  - 把请求转发给 Agent
  - Agent 内部调用 streamText()
  - 直接返回 result.toUIMessageStreamResponse()
  - onFinish 后保存最终 UIMessage[]
- PATCH /api/ai/chats/:chatId
  - 更新会话配置
  - 比如 title、model、systemPrompt、status
  - 校验权限
  - 更新 aiChat
- DELETE /api/ai/chats/:chatId
  - 删除或软删除会话
  - 推荐第一版做软删除：status = "deleted"
  - 校验权限 

 */

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
      },
    });

    return agent.fetch(c.req.raw);
  });
