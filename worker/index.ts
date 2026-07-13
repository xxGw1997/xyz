import { Hono } from "hono";

import genImageRoute from "./routes/gen-image";
import { roomRoute } from "./routes/room";
import { auth } from "./lib/auth";
import { chatAgentRoute } from "./routes/chat";

const app = new Hono<{
  Bindings: Env;
}>();

export const route = app
  .basePath("/api")
  .on(["POST", "GET"], "/auth/*", (c) => {
    return auth.handler(c.req.raw);
  })
  .route("/gen-image", genImageRoute)
  .route("/room", roomRoute)
  .route("/agent", chatAgentRoute);

export default app;

export { GenerateStorageImageWorkflow } from "./workflows/generate-storage-image-workflow";
export { Veet } from "./durable-objects/veet";
export { ChatRoom } from "./durable-objects/chat-room";
export { ChatAgent } from "./agents/chat-agent";
