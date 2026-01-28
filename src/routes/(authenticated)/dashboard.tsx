import { useAuthContext } from "@/components/providers/auth-provider";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(authenticated)/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = useAuthContext();

  return (
    <div>
      Hello "/(authenticated)/dashboard"!
      {user?.email}
    </div>
  );
}
