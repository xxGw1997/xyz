import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/real-good")({
  component: About,
});

function About() {
  const [imageUrl, setImageUrl] = useState("https://r2.88boy.lol/pipi.jpg");
  const intervalRef = useRef<null | NodeJS.Timeout>(null);
  const [loading, setLoading] = useState(false);

  const handlePick = async (type: "h" | "z") => {
    setLoading(true);
    const res = await fetch(`/api/generate-good-img?type=${type}`);
    const data = await res.json();
    if (data.status === "success") {
      getImageStatus(data.request_id as string);
      intervalRef.current = setInterval(() => {
        getImageStatus(data.request_id as string);
      }, 10000);
    }
  };

  const getImageStatus = async (request_id: string) => {
    const res = await fetch(
      `/api/get-good-img-status?request_id=${request_id}`
    );
    const data = await res.json();
    setLoading(false);
    if (data.status === "success") {
      const outcome = data?.outcome?.thumbnail_image_url;
      if (outcome) {
        setImageUrl(outcome);
        intervalRef.current && clearInterval(intervalRef.current);
      }
    }
  };

  return (
    <div className="flex h-full flex-col justify-center items-center gap-y-10">
      <div className="flex justify-center items-center w-4/5 h-2/3 max-w-xl">
        {loading ? (
          <Skeleton className="w-full h-full" />
        ) : (
          <img className="w-full h-full object-contain" src={imageUrl} />
        )}
      </div>

      <div className="flex justify-center items-center gap-x-44">
        <Button
          variant={"ghost"}
          className="text-5xl h-full flex justify-center items-center p-3"
          disabled={loading}
          onClick={() => handlePick("z")}
        >
          🧻
        </Button>
        <Button
          variant={"ghost"}
          className="text-5xl  h-full flex justify-center items-center p-3"
          disabled={loading}
          onClick={() => handlePick("h")}
        >
          🥕
        </Button>
      </div>
    </div>
  );
}
