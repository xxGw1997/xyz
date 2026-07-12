import { Hono } from "hono";
import { agentsMiddleware } from "hono-agents";
import { authMiddleware } from "../middlewares/auth.middleware";

const chatAgentRoute = new Hono<{ Bindings: Env }>();

chatAgentRoute.use(authMiddleware).use("*", agentsMiddleware());

export default chatAgentRoute;
