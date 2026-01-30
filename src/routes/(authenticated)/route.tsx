import { LoginDialog } from "@/components/auth-actions";
import { useAuthContext } from "@/components/providers/auth-provider";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(authenticated)")({
  component: RouteComponent,
});

function RouteComponent() {
  const userInfo = useAuthContext();
  if (!userInfo.session.data) {
    return <LoginDialog defaultOpen />;
  }

  return <Outlet />;
}
