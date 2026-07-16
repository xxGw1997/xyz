import type { RoomType, ChatAgentType } from "../../worker/types";
import { hc } from "hono/client";

export const roomClient = hc<RoomType>(`${import.meta.env.VITE_BASE_URL}/api/room`);

export const chatAgentClient = hc<ChatAgentType>(`${import.meta.env.VITE_BASE_URL}/api/agent`)