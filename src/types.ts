import type { UIMessage } from "ai";
import type { AgentTools } from "../worker/types";

export type AgentMessage = UIMessage<unknown, never, AgentTools>;