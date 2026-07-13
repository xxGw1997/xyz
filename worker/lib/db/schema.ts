import { relations, sql } from "drizzle-orm";
import type { UIMessage } from "ai";
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



/**
 * -----------------------------------
 *|        AI AGENT TABLES           |
 * -----------------------------------
 */

/**
 * AI CHAT
 */
export const aiChat = sqliteTable(
  "ai_chat",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title"),
    model: text("model").notNull(),
    systemPrompt: text("system_prompt"),
    status: text("status", {
      enum: ["active", "archived", "deleted"],
    })
      .notNull()
      .default("active"),
    visibility: text("visibility", {
      enum: ["private", "shared"],
    })
      .notNull()
      .default("private"),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown> | null>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
    lastMessageAt: integer("last_message_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("ai_chat_user_idx").on(t.userId),
    index("ai_chat_user_status_updated_idx").on(t.userId, t.status, t.updatedAt),
    index("ai_chat_last_message_idx").on(t.lastMessageAt),
  ]
);

/**
 * AI CHAT MESSAGE
 */
export const aiChatMessage = sqliteTable(
  "ai_chat_message",
  {
    id: text("id").primaryKey(),
    chatId: text("chat_id")
      .notNull()
      .references(() => aiChat.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    role: text("role")
      .$type<UIMessage["role"]>()
      .notNull(),
    parts: text("parts", { mode: "json" })
      .$type<UIMessage["parts"]>()
      .notNull(),
    metadata: text("metadata", { mode: "json" }).$type<UIMessage["metadata"] | null>(),
    status: text("status", {
      enum: ["submitted", "streaming", "ready", "error"],
    })
      .notNull()
      .default("ready"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("ai_chat_message_chat_created_idx").on(t.chatId, t.createdAt),
    index("ai_chat_message_user_idx").on(t.userId),
    index("ai_chat_message_role_idx").on(t.role),
  ]
);

/**
 * AI CHAT GENERATION
 */
export const aiChatGeneration = sqliteTable(
  "ai_chat_generation",
  {
    id: text("id").primaryKey(),
    chatId: text("chat_id")
      .notNull()
      .references(() => aiChat.id, { onDelete: "cascade" }),
    userMessageId: text("user_message_id").references(() => aiChatMessage.id, {
      onDelete: "set null",
    }),
    assistantMessageId: text("assistant_message_id").references(
      () => aiChatMessage.id,
      { onDelete: "set null" }
    ),
    model: text("model").notNull(),
    status: text("status", {
      enum: ["streaming", "completed", "failed", "cancelled"],
    }).notNull(),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    totalTokens: integer("total_tokens"),
    finishReason: text("finish_reason"),
    errorMessage: text("error_message"),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("ai_chat_generation_chat_idx").on(t.chatId),
    index("ai_chat_generation_status_idx").on(t.status),
    index("ai_chat_generation_user_message_idx").on(t.userMessageId),
  ]
);

export const aiChatRelations = relations(aiChat, ({ one, many }) => ({
  user: one(user, {
    fields: [aiChat.userId],
    references: [user.id],
  }),
  messages: many(aiChatMessage),
  generations: many(aiChatGeneration),
}));

export const aiChatMessageRelations = relations(aiChatMessage, ({ one }) => ({
  chat: one(aiChat, {
    fields: [aiChatMessage.chatId],
    references: [aiChat.id],
  }),
  user: one(user, {
    fields: [aiChatMessage.userId],
    references: [user.id],
  }),
}));

export const aiChatGenerationRelations = relations(
  aiChatGeneration,
  ({ one }) => ({
    chat: one(aiChat, {
      fields: [aiChatGeneration.chatId],
      references: [aiChat.id],
    }),
    userMessage: one(aiChatMessage, {
      fields: [aiChatGeneration.userMessageId],
      references: [aiChatMessage.id],
    }),
    assistantMessage: one(aiChatMessage, {
      fields: [aiChatGeneration.assistantMessageId],
      references: [aiChatMessage.id],
    }),
  })
);
