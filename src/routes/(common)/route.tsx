import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DefaultLayout } from "@/components/default-layout";

export const Route = createFileRoute("/(common)")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <DefaultLayout>
      <Outlet />
    </DefaultLayout>
  );
}
