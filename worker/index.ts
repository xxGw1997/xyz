import { env } from "cloudflare:workers";

export { GenerateStorageImageWorkflow } from "./workflows/generate-storage-image-workflow";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/get-image")) {
      // const url =
      //   "https://storage.googleapis.com/gmi-video-assests-prod/user-assets/8061d9fb-e8bc-4977-8040-7ed9090e80ec/2229c949-aad4-4ba9-9748-33b93cf6d265/gmi-videogen/generated/google_ai_studio_62a12d37-675b-47cb-a400-7390cd34eeab_51a44009-d1fa-473e-8da6-6842216b8910.png";
      const url = "https://r2.88boy.lol/mua/xyz3.jpg";
      return Response.json({
        images: [url],
      });
    } else if (url.pathname.startsWith("/api/generate-good-img")) {
      const input = url.searchParams.get("type");
      const prompt = `根据图中的猫来编辑图片,在猫的左前方放一个胡萝卜，右前方放一个抽纸巾，并且猫的手放在${
        input == "h" ? "胡萝卜" : "抽纸巾"
      }上方。不要出现其他无关人的手`;
      const imageURLs = ["https://r2.88boy.lol/pipi.jpg"];
      const API_KEY = env.GMICLOUD_APIKEY;
      const response = await fetch(
        `https://console.gmicloud.ai/api/v1/ie/requestqueue/apikey/requests`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "seedream-4-0-250828",
            payload: {
              prompt,
              image: imageURLs,
              size: "1024x1024",
              max_images: 1,
              sequential_image_generation: "auto",
              seed: -1,
              watermark: true,
              response_format: "url",
            },
          }),
        }
      );

      const data = await response.json();

      return Response.json({
        data,
      });
    } else if (url.pathname.startsWith("/api/get-good-img-status")) {
      console.log("✅✅✅");
      const request_id = url.searchParams.get("request_id");
      const API_KEY = env.GMICLOUD_APIKEY;
      const response = await fetch(
        `https://console.gmicloud.ai/api/v1/ie/requestqueue/apikey/requests/${request_id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${API_KEY}`,
          },
        }
      );
      console.log(response);
      const data = await response.json();

      return Response.json({
        data,
      });
    }

    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
