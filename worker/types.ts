import z from "zod";
import type { auth } from "./lib/auth";
import type { roomType } from "./routes/room";

export type RoomType = typeof roomType;

export type AuthVar = {
  user: typeof auth.$Infer.Session.user;
  session: typeof auth.$Infer.Session.session;
};

const SystemMessageTypeEnum = z.enum(["member_join", "member_leave"]);

export const SystemMessageSchema = z.object({
  type: z.literal("system"),
  systemType: SystemMessageTypeEnum,
  userId: z.string(),
  onlineUsers: z.array(z.string()).default(() => []),
  createTime: z
    .string()
    .datetime()
    .optional()
    .default(() => new Date().toISOString()),
});

export const MessageMetaSchema = z.object({
  isRead: z.boolean().default(false),
  messageType: z.enum(["text", "image", "file"]).default("text"),
  attachmentUrl: z.string().url().nullable().default(null),
  tag: z.string().optional(),
});

export type MessageMeta = z.infer<typeof MessageMetaSchema>;

export const UserMessageSchema = z.object({
  type: z.literal("user"),
  sendTime: z.string().datetime(),
  content: z
    .string()
    .min(1, "消息内容不能为空")
    .max(1000, "消息内容不能超过 1000 字"),
  senderId: z.string(),
  senderName: z.string().min(1, "用户名不能为空"),
  meta: MessageMetaSchema.optional(),
});

export const MessageSchema = z.discriminatedUnion("type", [
  SystemMessageSchema,
  UserMessageSchema,
]);

export type Message = z.infer<typeof MessageSchema>;
export type SystemMessage = z.infer<typeof SystemMessageSchema>;
export type UserMessage = z.infer<typeof UserMessageSchema>;
