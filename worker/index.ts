import { Hono } from "hono";

import genImageRoute from "./routes/gen-image";
import roomRoute from "./routes/room";
import { auth } from "./lib/auth";

const app = new Hono<{
  Bindings: Env;
}>();

app
  .basePath("/api")
  .on(["POST", "GET"], "/auth/*", (c) => {
    return auth.handler(c.req.raw);
  })
  .route("/gen-image", genImageRoute)
  .route("/room", roomRoute);

export default app;

export { GenerateStorageImageWorkflow } from "./workflows/generate-storage-image-workflow";
export { Veet } from "./durable-objects/veet";
export { ChatRoom } from "./durable-objects/chat-room";
