import type { UIMessage } from "ai";
import type { AgentTools } from "./tools/types";

export type AgentDataTypes = {
  "chat-title": {
    chatId: string;
    title: string;
  };
};

export type AgentMessage = UIMessage<unknown, AgentDataTypes, AgentTools>;
