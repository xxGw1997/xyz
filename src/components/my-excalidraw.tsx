import { lazy, Suspense } from "react";
import { Loader } from "lucide-react";
import "@excalidraw/excalidraw/index.css";

const Excalidraw = lazy(() =>
  import("@excalidraw/excalidraw").then((mod) => ({ default: mod.Excalidraw }))
);

export function MyExcalidraw() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex justify-center items-center">
          <Loader className="animate-spin" />
        </div>
      }
    >
      <Excalidraw langCode="zh-CN" />
    </Suspense>
  );
}
