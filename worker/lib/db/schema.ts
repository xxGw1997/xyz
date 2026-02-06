import { relations, sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
  primaryKey,
} from "drizzle-orm/sqlite-core";

/**
 * -----------------------------------
 *| BETTER-AUTH  GENERATE USER TABLES |
 * -----------------------------------
 */

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .default(false)
    .notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)]
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)]
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));


/**
 * -----------------------------------
 *|     CHAT ROOM MESSAGE TABLES      |
 * -----------------------------------
 */


/**
 *  CHAT ROOM
 */
export const room = sqliteTable("room", {
  id: text("id").primaryKey(),
  type: text("type", { enum: ["private", "group"] })
    .notNull()
    .default("group"),
  name: text("name"), // 群聊才有名字，私聊可以为空
  description: text("description"),
  avatar: text("avatar"),
  isPublic: integer("is_public", { mode: "boolean" }).default(false).notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
  lastMessageAt: integer("last_message_at", { mode: "timestamp_ms" }),
  lastMessageId: text("last_message_id"), // 方便排序和显示最后一条消息预览
});

/**
 * ROOM MEMBER
 */
export const roomMember = sqliteTable(
  "room_member",
  {
    roomId: text("room_id")
      .notNull()
      .references(() => room.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    joinedAt: integer("joined_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    role: text("role", { enum: ["member", "admin", "owner"] })
      .default("member")
      .notNull(),
    mutedUntil: integer("muted_until", { mode: "timestamp_ms" }), // 禁言到何时
  },
  (t) => [
    primaryKey({ columns: [t.roomId, t.userId] }),
    index("room_member_user_idx").on(t.userId),
  ]
);

/**
 * MESSAGE
 */

export const message = sqliteTable(
  "message",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id")
      .notNull()
      .references(() => room.id, { onDelete: "cascade" }),
    senderId: text("sender_id")
      .notNull()
      .references(() => user.id, { onDelete: "set null" }),
    content: text("content"),
    type: text("type", {
      enum: ["text", "image", "file", "system", "revoked"],
    })
      .notNull()
      .default("text"),
    replyToId: text("reply_to_id"),
    metadata: text("metadata"), // json string
    isEdited: integer("is_edited", { mode: "boolean" })
      .default(false)
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("message_room_created_idx").on(t.roomId, t.createdAt),
    index("message_sender_idx").on(t.senderId),
    index("message_reply_idx").on(t.replyToId),
  ]
);

export const roomsRelations = relations(room, ({ many, one }) => ({
  members: many(roomMember),
  messages: many(message),
  createdByUser: one(user, {
    fields: [room.createdBy],
    references: [user.id],
  }),
}));

export const roomMembersRelations = relations(roomMember, ({ one }) => ({
  room: one(room, {
    fields: [roomMember.roomId],
    references: [room.id],
  }),
  user: one(user, {
    fields: [roomMember.userId],
    references: [user.id],
  }),
}));

export const messagesRelations = relations(message, ({ one }) => ({
  room: one(room, {
    fields: [message.roomId],
    references: [room.id],
  }),
  sender: one(user, {
    fields: [message.senderId],
    references: [user.id],
  }),
  replyTo: one(message, {
    fields: [message.replyToId],
    references: [message.id],
  }),
}));
