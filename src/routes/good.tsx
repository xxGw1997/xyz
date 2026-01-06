import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";

export const Route = createFileRoute("/good")({
  component: About,
});

function About() {
  const [request_id, setRequestId] = useState<null | string>(null);
  const intervalRef = useRef<null | NodeJS.Timeout>(null);

  const handlePick = async (type: "h" | "z") => {
    const res = await fetch(`/api/generate-good-img?type=${type}`);
    const data = await res.json();
    if (data.status === "success") {
      setRequestId(data.request_id);
      intervalRef.current = setInterval(() => {
        getImageStatus();
      }, 3000);
    }
  };

  const getImageStatus = async () => {
    const res = await fetch(
      `/api/get-good-img-status?request_id=5d8907a9-1ba3-4b0b-a719-64022e1f0a11`
    );
    const data = await res.json();
    console.log(data);
  };

  return (
    <div className="">
      <Button onClick={getImageStatus}>Test</Button>
      <div className="flex justify-center items-center">
        <img
          className="size-1/5 object-contain"
          src="https://r2.88boy.lol/pipi.jpg"
        />
      </div>

      <div className="flex justify-center items-center gap-x-44">
        <Button
          variant={"ghost"}
          className="text-5xl h-full flex justify-center items-center p-3"
          onClick={() => handlePick("z")}
        >
          🧻
        </Button>
        <Button
          variant={"ghost"}
          className="text-5xl  h-full flex justify-center items-center p-3"
          onClick={() => handlePick("h")}
        >
          🥕
        </Button>
      </div>
    </div>
  );
}
