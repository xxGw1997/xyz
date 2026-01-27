import { betterAuth } from "better-auth";
import { openAPI } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env, waitUntil } from "cloudflare:workers";
import { createDb } from "./db";
import * as schema from "./db/schema";
import { sendEmail } from "./resend";

export const auth = betterAuth({
  plugins: [openAPI()],
  database: drizzleAdapter(createDb(), {
    provider: "sqlite",
    schema,
  }),
  baseURL: env.BASE_URL,
  secret: env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }, _request) => {
      waitUntil(
        sendEmail({
          from: "xyz <no-reply@88boy.lol>",
          to: user.email,
          subject: "Verify your email address",
          text: `Click the link to verify your email: ${url}`,
        })
      );
    },
  },
});
