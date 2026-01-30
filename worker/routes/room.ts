import { Hono } from "hono";
import { authMiddleware } from "../middlewares/auth.middleware";
import type { AuthVar } from "../types";

const roomRoute = new Hono<{ Bindings: Env; Variables: AuthVar }>();

roomRoute.use(authMiddleware);

roomRoute.get("/connect", (c) => {
  const upgradeHeader = c.req.header("Upgrade");
  if (upgradeHeader !== "websocket") {
    return c.text("Expected Upgrade: websocket", 426);
  }
  const id = c.env.VEET.idFromName("room");
  const veet = c.env.VEET.get(id);

  return veet.fetch(c.req.raw);
});

roomRoute.get("/gen-ice-servers", async (c) => {
  try {
    const name = c.req.query("name");
    if (name !== "zzw") return c.text("Room Not found", 404);
    const headers = {
      Authorization: `Bearer ${c.env.TURN_TOKEN}`,
      "Content-Type": "application/json",
    };
    const CLOUDFLARE_RTC_URL = `https://rtc.live.cloudflare.com/v1/turn/keys/${c.env.TURN_ID}/credentials/generate-ice-servers`;

    const body = JSON.stringify({ ttl: 86400 });

    const response = await fetch(CLOUDFLARE_RTC_URL, {
      method: "POST",
      headers: headers,
      body: body,
    });

    if (!response.ok) {
      throw new Error(
        `Cloudflare API 请求失败: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    return c.json({
      success: true,
      data: data,
    });
  } catch (error) {}
});

roomRoute.get("/chat/:toId/join", async (c) => {
  const upgradeHeader = c.req.header("Upgrade");
  if (upgradeHeader !== "websocket") {
    return c.text("Expected Upgrade: websocket", 426);
  }
  const userId = c.get("user").id;
  const toId = c.req.param("toId");
  if (!userId || !toId) {
    return c.json({ error: "Bad request" }, 401);
  }

  const id = c.env.CHAT_ROOM.idFromName("zzw");
  const stub = c.env.CHAT_ROOM.get(id);

  return stub.fetch(c.req.raw);
});

export default roomRoute;
