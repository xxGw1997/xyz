import type { auth } from "./lib/auth";

export type AuthVar = {
  user: typeof auth.$Infer.Session.user;
  session: typeof auth.$Infer.Session.session;
};
