import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { and, asc, desc, eq, lt, sql } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../middlewares/auth.middleware";
import type { AuthVar } from "../types";
import { createDb } from "../lib/db";
import { message, room, roomMember, user } from "../lib/db/schema";

export const roomRoute = new Hono<{ Bindings: Env; Variables: AuthVar }>();

roomRoute.use(authMiddleware);

export const roomType = roomRoute
  .get("/connect", (c) => {
    const upgradeHeader = c.req.header("Upgrade");
    if (upgradeHeader !== "websocket") {
      return c.text("Expected Upgrade: websocket", 426);
    }
    const id = c.env.VEET.idFromName("room");
    const veet = c.env.VEET.get(id);

    return veet.fetch(c.req.raw);
  })
  .get("/gen-ice-servers", async (c) => {
    try {
      const name = c.req.query("name");
      if (name !== "zzw") return c.text("Room Not found", 404);
      const headers = {
        Authorization: `Bearer ${c.env.TURN_TOKEN}`,
        "Content-Type": "application/json",
      };
      const CLOUDFLARE_RTC_URL = `https://rtc.live.cloudflare.com/v1/turn/keys/${c.env.TURN_ID}/credentials/generate-ice-servers`;

      const body = JSON.stringify({ ttl: 86400 });

      const response = await fetch(CLOUDFLARE_RTC_URL, {
        method: "POST",
        headers: headers,
        body: body,
      });

      if (!response.ok) {
        throw new Error(
          `Cloudflare API 请求失败: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      return c.json({
        success: true,
        data: data,
      });
    } catch (error) {}
  })
  .get(
    "/chat/:roomId/join",
    async (c, next) => {
      // vertify whether the current user is a member of the room
      const db = createDb();
      const userId = c.get("user").id;
      const roomId = c.req.param("roomId");
      if (!userId || !roomId) {
        return c.json({ error: "Bad request" }, 401);
      }
      const { length } = await db
        .select({ exists: sql`1` })
        .from(roomMember)
        .where(
          and(eq(roomMember.userId, userId), eq(roomMember.roomId, roomId))
        )
        .limit(1);
      if (length === 0)
        return c.json({ error: "You are not the room member" }, 403);

      await next();
    },
    async (c) => {
      const upgradeHeader = c.req.header("Upgrade");
      if (upgradeHeader !== "websocket") {
        return c.text("Expected Upgrade: websocket", 426);
      }
      const userId = c.get("user").id;
      const roomId = c.req.param("roomId");
      if (!userId || !roomId) {
        return c.json({ error: "Bad request" }, 401);
      }

      const id = c.env.CHAT_ROOM.idFromName(roomId);
      const stub = c.env.CHAT_ROOM.get(id);
      await stub.setRoomId(roomId);

      const modifiedReq = new Request(c.req.url, {
        ...c.req.raw,
        headers: new Headers({
          ...Object.fromEntries(c.req.raw.headers),
          "X-AUTH-USER-ID": userId,
        }),
      });

      return stub.fetch(modifiedReq);
    }
  )
  .post(
    "/create",
    zValidator(
      "form",
      z.object({
        roomName: z.string(),
        description: z.string(),
      })
    ),
    async (c) => {
      const db = createDb();
      const validatedForm = c.req.valid("form");
      const userId = c.get("user").id;
      const curDate = new Date();
      const generatedRoomId = crypto.randomUUID();

      const insertRoom = db.insert(room).values({
        id: generatedRoomId,
        type: "private",
        name: validatedForm.roomName,
        description: validatedForm.description,
        createdBy: userId,
        createdAt: curDate,
        updatedAt: curDate,
      });

      const insertMember = db.insert(roomMember).values({
        roomId: generatedRoomId,
        userId: userId,
        joinedAt: curDate,
        role: "owner",
      });

      try {
        await db.batch([insertRoom, insertMember]);

        return c.json({ id: generatedRoomId });
      } catch (error) {
        throw new HTTPException(500, { message: "Create Room failed!" });
      }
    }
  )
  .get("/list", async (c) => {
    const userId = c.get("user").id;

    const db = createDb();

    try {
      const rooms = await db
        .select({
          id: room.id,
          type: room.type,
          name: room.name,
          avatar: room.avatar,
          description: room.description,
          roomOwner: room.createdBy,
          memberCount:
            sql<number>`(SELECT COUNT(*) FROM ${roomMember} WHERE ${eq(
              roomMember.roomId,
              room.id
            )})`.as("member_count"),
        })
        .from(roomMember)
        .innerJoin(room, eq(roomMember.roomId, room.id))
        .where(eq(roomMember.userId, userId))
        .orderBy(desc(room.lastMessageAt));

      return c.json({ rooms });
    } catch (error) {
      throw new HTTPException(500, { message: "Get room list failed!" });
    }
  })
  .post("/chat/:roomId/applyJoinRoom", async (c) => {
    const userId = c.get("user").id;
    const roomId = c.req.param("roomId");
    if (!userId || !roomId) {
      throw new HTTPException(401, {
        message: "Bad request",
      });
    }

    try {
      const db = createDb();

      const [roomExists] = await db
        .select()
        .from(room)
        .where(eq(room.id, roomId))
        .limit(1);

      if (!roomExists) {
        return c.json({
          success: false,
          message: "Room not found",
        });
      }

      const [alreadyInRoom] = await db
        .select()
        .from(roomMember)
        .where(
          and(eq(roomMember.roomId, roomId), eq(roomMember.userId, userId))
        )
        .limit(1);

      if (alreadyInRoom) {
        return c.json({
          success: false,
          message: "You are already in the room",
        });
      }

      const curDate = new Date();
      await db.insert(roomMember).values({
        roomId,
        userId,
        joinedAt: curDate,
        mutedUntil: null,
        role: "member",
      });
      return c.json({ success: true, message: "Join success~" });
    } catch (error) {
      throw new HTTPException(500, { message: "Join room failed!" });
    }
  })
  .get(
    "/members/list",
    zValidator(
      "query",
      z.object({
        roomId: z.string(),
      })
    ),
    async (c) => {
      const userId = c.get("user").id;
      const roomId = c.req.valid("query").roomId;

      const db = createDb();
      const { length } = await db
        .select({ exists: sql`1` })
        .from(roomMember)
        .where(
          and(eq(roomMember.roomId, roomId), eq(roomMember.userId, userId))
        )
        .limit(1);

      if (length === 0)
        return c.json({
          success: false,
          message: "You are not the room member",
        });

      const members = await db
        .select({
          userId: user.id,
          name: user.name,
          image: user.image,
          role: roomMember.role,
        })
        .from(roomMember)
        .innerJoin(user, eq(roomMember.userId, user.id))
        .where(eq(roomMember.roomId, roomId))
        .orderBy(asc(roomMember.joinedAt));

      return c.json({
        success: true,
        message: "Get room members",
        members,
      });
    }
  )
  .get(
    "/chat/:roomId/history",
    zValidator(
      "query",
      z.object({
        beforeCreatedAt: z.string().datetime().optional(),
        limit: z.string(),
      })
    ),
    async (c) => {
      const userId = c.get("user").id;
      const roomId = c.req.param("roomId");
      const beforeCreatedAt = c.req.valid("query").beforeCreatedAt;
      const limit = c.req.valid("query").limit;

      const db = createDb();
      const { length } = await db
        .select({ exists: sql`1` })
        .from(roomMember)
        .where(
          and(eq(roomMember.roomId, roomId), eq(roomMember.userId, userId))
        )
        .limit(1);

      if (length === 0)
        return c.json({
          success: false,
          message: "You are not the room member",
        });

      let messages = await db
        .select({
          sendTime: message.createdAt,
          content: message.content,
          senderId: message.senderId,
          senderName: user.name,
          meta: message.metadata,
        })
        .from(message)
        .innerJoin(user, eq(message.senderId, user.id))
        .where(
          and(
            eq(message.roomId, roomId),
            beforeCreatedAt
              ? lt(message.createdAt, new Date(beforeCreatedAt))
              : undefined
          )
        )
        .orderBy(desc(message.createdAt))
        .limit(Number(limit))
        .all();

      return c.json({
        success: true,
        messages: messages.reverse(),
      });
    }
  );
