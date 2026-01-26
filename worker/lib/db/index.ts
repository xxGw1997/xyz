import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";

export const createDb = () => drizzle(env.DB);
