import { LoginDialog } from "@/components/auth-actions";
import { useAuthContext } from "@/components/providers/auth-provider";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(authenticated)")({
  component: RouteComponent,
});

function RouteComponent() {
  const userInfo = useAuthContext();
  if (!userInfo.session.data) {
    return (
      <div className="w-full h-screen flex justify-center items-center">
        <LoginDialog defaultOpen />
      </div>
    );
  }

  return <Outlet />;
}
