import { createFileRoute } from "@tanstack/react-router";
import { MyExcalidraw } from "@/components/my-excalidraw";

export const Route = createFileRoute("/(common)/draw/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div style={{ height: "100vh" }}>
      <MyExcalidraw />
    </div>
  );
}
