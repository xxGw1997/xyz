import { Agent } from "agents";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createDb } from "../lib/db";
import { SYSTEM_PROMPT } from "./prompts";
import { aiChatMessage } from "../lib/db/schema";
import { eq } from "drizzle-orm";

export class ChatAgent extends Agent<Env> {
  // async onRequest(request: Request): Promise<Response> {
  //   const url = new URL(request.url);
  //   if (request.method === "POST" && url.pathname === "/messages") {
  //     return this.handleMessages(request);
  //   }
  //   return Response.json({ error: "Not found" }, { status: 404 });
  // }
  // private async handleMessages(request: Request): Promise<Response> {
  //   const body = await request.json<{chatId: string}>()
    
  //   const history = await this.prepareMessages()

  // }

  // private async prepareMessages(chatId: string) {
  //   const db = createDb();
  //   const rows = await db
  //     .select()
  //     .from(aiChatMessage)
  //     .where(eq(aiChatMessage.chatId, chatId))
  //     .orderBy(aiChatMessage.createdAt);

  //   return rows.flatMap((item) => {
  //     if (
  //       item.role !== "system" &&
  //       item.role !== "user" &&
  //       item.role !== "assistant"
  //     )
  //       return [];

  //     return [
  //       {
  //         id: item.id,
  //         role: item.role,
  //         parts: item.parts,
  //       },
  //     ];
  //   });
  // }
}
