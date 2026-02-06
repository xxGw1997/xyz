import { DurableObject } from "cloudflare:workers";
import { createDb } from "../lib/db";
import { message } from "../lib/db/schema";
import {
  SystemMessageSchema,
  UserMessageSchema,
  type SystemMessage,
} from "../types";

export class ChatRoom extends DurableObject<Env> {
  private roomId: string = "";
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      this.roomId = (await this.ctx.storage.get("roomId")) || "";
    });
  }

  async setRoomId(roomId: string): Promise<void> {
    this.roomId = roomId;
  }

  async getOnlineUsers(): Promise<string[]> {
    const onlineUsers: string[] = [];
    this.ctx.getWebSockets().forEach((ws) => {
      const userId = ws.deserializeAttachment().id;
      if (userId) {
        onlineUsers.push(userId);
      }
    });
    return onlineUsers;
  }

  async fetch(request: Request) {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);

    const userId = request.headers.get("X-AUTH-USER-ID")!;

    server.serializeAttachment({ id: userId });

    if (this.roomId) {
      this.ctx.storage.put("roomId", this.roomId);
    }

    // USER JOIN ROOM SYSTEM MESSAGE
    this.systemMessage(userId, "member_join");

    return new Response(null, { status: 101, webSocket: client });
  }

  async systemMessage(userId: string, type: "member_join" | "member_leave") {
    const onlineUsers: string[] = await this.getOnlineUsers();

    for (const ws of this.ctx.getWebSockets()) {
      ws.send(
        JSON.stringify(
          SystemMessageSchema.parse({
            type: "system",
            systemType: type,
            userId,
            onlineUsers: onlineUsers,
          } as SystemMessage)
        )
      );
    }
  }

  webSocketMessage(ws: WebSocket, message: string): void | Promise<void> {
    const attachment = ws.deserializeAttachment();

    this.broadcast(ws, message, attachment.id);
  }

  broadcast(sender: WebSocket, message: string, userId: string) {
    const data = UserMessageSchema.parse({
      ...JSON.parse(message),
      sendTime: new Date().toISOString(),
    });
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === sender) continue;
      ws.send(JSON.stringify(data));
    }
    this.ctx.waitUntil(this.saveMessageToDb(data.content, userId));
  }

  async saveMessageToDb(content: string, senderId: string) {
    const db = createDb();
    const messageId = crypto.randomUUID();
    try {
      await db.insert(message).values({
        id: messageId,
        roomId: this.roomId,
        senderId,
        content,
        type: "text",
        replyToId: null,
        metadata: null,
        isEdited: false,
      });
    } catch (error) {
      console.error(error);
    }
  }

  webSocketClose(ws: WebSocket): void | Promise<void> {
    this.close(ws);
  }

  webSocketError(ws: WebSocket): void | Promise<void> {
    this.close(ws);
  }

  close(ws: WebSocket) {
    const userId = ws.deserializeAttachment().id;
    // SEND USER LEFT MESSAGE
    this.systemMessage(userId, "member_leave");
  }
}
