import type { RoomType } from "../../worker/types";
import { hc } from "hono/client";

export const roomClient = hc<RoomType>(`${import.meta.env.VITE_BASE_URL}/api/room`);
