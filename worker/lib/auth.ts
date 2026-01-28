import { betterAuth } from "better-auth";
import { magicLink, openAPI } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env, waitUntil } from "cloudflare:workers";
import { createDb } from "./db";
import * as schema from "./db/schema";
import { sendEmail } from "./resend";

export const auth = betterAuth({
  database: drizzleAdapter(createDb(), {
    provider: "sqlite",
    schema,
  }),
  baseURL: env.BASE_URL,
  secret: env.BETTER_AUTH_SECRET,
  plugins: [
    magicLink({
      async sendMagicLink({ email, url }, _ctx) {
        waitUntil(
          sendEmail({
            from: "xyz <no-reply@88boy.lol>",
            to: email,
            subject: "Verify your email address",
            html: `
              <h2>点击下方链接登录</h2>
              <p>此链接 10 分钟内有效：</p>
              <a href="${url}" style="padding:12px 24px;background:#000;color:white;border-radius:6px;text-decoration:none;display:inline-block">
                立即登录
              </a>
              <p>如果不是你操作，请忽略此邮件。</p>
            `,
          })
        );
      },
      expiresIn: 10 * 60, //10 mins
      rateLimit: {
        max: 3,
        window: 60,
      },
    }),
    openAPI(),
  ],
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 30 * 60, // 30 mins
    },
  },
});
