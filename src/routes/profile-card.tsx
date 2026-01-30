import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ImageIcon, X } from "lucide-react";
import ProfileCard from "@/components/ProfileCard";
// import Lightning from "@/components/Lightning";
import iconUrl from "@/assets/iconpattern.png";
import grainUrl from "@/assets/grain.webp";
import LightRays from "@/components/LightRays";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/profile-card")({
  component: RouteComponent,
});

function RouteComponent() {
  const [images, setImages] = useState<string[]>([]);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleGetImages = async () => {
    const response = await fetch("/api/gen-image/get-image");
    const data: { images: string[] } = await response.json();
    setImages(data.images);
  };

  useEffect(() => {
    handleGetImages();
  }, []);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("请上传图片文件！");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    () => URL.revokeObjectURL(objectUrl);
  };

  return (
    <div className="w-full h-screen flex justify-center items-center relative">
      <LightRays
        raysOrigin="top-center"
        raysColor="#ffffff"
        raysSpeed={1.5}
        lightSpread={0.8}
        rayLength={1.2}
        followMouse={true}
        mouseInfluence={0.1}
        noiseAmount={0.1}
        distortion={0.05}
        className="custom-rays"
      />
      {/* <Lightning hue={120} xOffset={0} speed={1} intensity={0.5} size={1} /> */}

      {previewUrl ? (
        <>
          <Button
            className="grid max-w-sm justify-center items-center gap-3 absolute bottom-30"
            size="icon"
            variant="ghost"
            onClick={() => setPreviewUrl(null)}
          >
            <X />
          </Button>
          <ProfileCard
            name=""
            behindGlowSize="50%"
            title=""
            avatarUrl={previewUrl}
            iconUrl={iconUrl}
            grainUrl={grainUrl}
            showUserInfo={false}
            enableTilt={true}
            enableMobileTilt={true}
            onContactClick={() => console.log("Contact clicked")}
          />
        </>
      ) : (
        <>
          <div className="grid w-full max-w-sm justify-center items-center gap-3 absolute bottom-30">
            <Label htmlFor="picture">
              <ImageIcon />
            </Label>
            <Input
              className="hidden"
              id="picture"
              accept="image/*"
              type="file"
              onChange={handleUpload}
            />
          </div>
          {images.map((url, index) => (
            <ProfileCard
              key={index}
              name=""
              behindGlowSize="50%"
              title=""
              avatarUrl={url}
              // iconUrl={iconUrl}
              grainUrl={grainUrl}
              showUserInfo={false}
              enableTilt={true}
              enableMobileTilt={true}
              onContactClick={() => console.log("Contact clicked")}
            />
          ))}
        </>
      )}
    </div>
  );
}
