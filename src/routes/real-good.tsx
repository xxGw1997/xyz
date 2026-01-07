import { useRef, useState } from "react";
import confetti from "canvas-confetti";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AuroraText } from "@/components/ui/aurora-text";

export const Route = createFileRoute("/real-good")({
  component: About,
});

function About() {
  const [imageUrl, setImageUrl] = useState("https://r2.88boy.lol/pipi.jpg");
  const intervalRef = useRef<null | NodeJS.Timeout>(null);
  const [loading, setLoading] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [showText, setShowText] = useState(false);

  const handlePick = async (type: "h" | "z") => {
    setLoading(true);
    setIsGenerated(false);
    setShowText(false);
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
        setIsGenerated(true);
        setImageUrl(outcome);
        intervalRef.current && clearInterval(intervalRef.current);
      }
    }
  };
  const realGood = () => {
    const end = Date.now() + 3 * 1000; // 3 seconds
    const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];
    const frame = () => {
      if (Date.now() > end) return;
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        startVelocity: 60,
        origin: { x: 0, y: 0.5 },
        colors: colors,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        startVelocity: 60,
        origin: { x: 1, y: 0.5 },
        colors: colors,
      });
      requestAnimationFrame(frame);
    };
    frame();
  };

  const imgOnload = () => {
    if (!isGenerated) return;
    setShowText(true);
    realGood();
  };

  return (
    <div className="flex h-full flex-col justify-center items-center gap-y-10 relative">
      {isGenerated && showText && (
        <AuroraText
          className="text-8xl absolute top-24"
          colors={["#f5ff2e", "#00ff00", "#05e6ff", "#38bdf8"]}
        >
          真棒~
        </AuroraText>
      )}
      <div className="flex justify-center items-center w-4/5 h-2/3 max-w-xl">
        {loading ? (
          <Skeleton className="w-full h-full" />
        ) : (
          <img
            className="w-full h-full object-contain"
            src={imageUrl}
            onLoad={imgOnload}
          />
        )}
      </div>

      <div className="flex justify-center items-center gap-x-44">
        <Button
          variant={"ghost"}
          className="text-5xl  h-full flex justify-center items-center p-3"
          disabled={loading}
          onClick={() => handlePick("h")}
        >
          🥕
        </Button>
        <Button
          variant={"ghost"}
          className="text-5xl h-full flex justify-center items-center p-3"
          disabled={loading}
          onClick={() => handlePick("z")}
        >
          🧻
        </Button>
      </div>
    </div>
  );
}
