import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env } from 'cloudflare:workers'
import { createDb } from "./db";

export const auth = betterAuth({
  database: drizzleAdapter(createDb(), {
    provider: "sqlite",
  }),
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
});
