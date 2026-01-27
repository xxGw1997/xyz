import type { Config } from "drizzle-kit";
import "dotenv/config";

const { LOCAL_DB_PATH } = process.env;

const baseConfig = {
  schema: "./worker/lib/db/schema.ts",
  out: "./migrations",
  dialect: "sqlite",
  verbose: true,
  strict: true,
} satisfies Partial<Config>;

const config: Config = LOCAL_DB_PATH
  ? {
      ...baseConfig,
      dbCredentials: {
        url: LOCAL_DB_PATH,
      },
    }
  : {
      ...baseConfig,
      driver: "d1-http",
      dbCredentials: {
        databaseId: process.env.DATABASE_ID!,
        token: process.env.CLOUDFLARE_API_TOKEN!,
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
      },
    };

export default config;
