import { Hono } from "hono";
import type { Veet } from "../durable-objects/veet";

interface Bindings {
  VEET: DurableObjectNamespace<Veet>;
}

const doCallRoute = new Hono<{ Bindings: Bindings }>();

doCallRoute.get("/connect", (c) => {
  const upgradeHeader = c.req.header("Upgrade");
  if (upgradeHeader !== "websocket") {
    return c.text("Expected Upgrade: websocket", 426);
  }
  const name = c.req.query("name") || "xxgw";
  const id = c.env.VEET.idFromName(name);
  const veet = c.env.VEET.get(id);

  return veet.fetch(c.req.raw);
});

export default doCallRoute;
