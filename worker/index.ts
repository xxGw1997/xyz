import { Hono } from "hono";

import genImageRoute from "./routes/gen-image";
import roomRoute from "./routes/room";
import { auth } from "./lib/auth";

const app = new Hono<{
  Bindings: Env;
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>().basePath("/api");

app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    c.set("user", null);
    c.set("session", null);
    await next();
    return;
  }

  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});

app.on(["POST", "GET"], "/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

app.route("/gen-image", genImageRoute);

app.route("/room", roomRoute);

export default app;

export { GenerateStorageImageWorkflow } from "./workflows/generate-storage-image-workflow";
export { Veet } from "./durable-objects/veet";
