import { useEffect, useState } from "react";
import ProfileCard from "./components/ProfileCard";
import iconUrl from "@/assets/iconpattern.png";
import grainUrl from "@/assets/grain.webp";
// import LightRays from "./components/LightRays";
// import Lightning from "./components/Lightning";

function App() {
  const [images, setImages] = useState<string[]>([]);

  const handleGetImages = async () => {
    const response = await fetch("/api/");
    const data: { images: string[] } = await response.json();
    setImages(data.images);
  };

  useEffect(() => {
    handleGetImages();
  }, []);

  return (
    <div className="w-full h-full flex justify-center items-center relative">
      {/* <LightRays
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
      /> */}
      {/* <Lightning hue={120} xOffset={0} speed={1} intensity={0.5} size={1} /> */}
      {images.map((url, index) => (
        <ProfileCard
          key={index}
          name=""
          behindGlowSize="50%"
          title=""
          avatarUrl={url}
          iconUrl={iconUrl}
          grainUrl={grainUrl}
          showUserInfo={false}
          enableTilt={true}
          enableMobileTilt={true}
          onContactClick={() => console.log("Contact clicked")}
        />
      ))}
    </div>
  );
}

export default App;
