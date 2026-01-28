import type { User } from "better-auth";
import { authClient } from "@/lib/auth-client";
import { type ReactNode, useContext, createContext } from "react";

export type AuthContextType = {
  session: ReturnType<typeof authClient.useSession>;
  user?: {
    id: string;
  } & User;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const session = authClient.useSession();
  const user = session.data?.user;

  return { session, user };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const userInfo = useAuth();

  return (
    <AuthContext.Provider value={userInfo}>{children}</AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextType {
  const userInfo = useContext(AuthContext);
  if (!userInfo)
    throw new Error("useAuthContext must be used within an AuthProvider");

  return userInfo;
}
