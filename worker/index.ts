import { Hono } from "hono";
import genImageRoute from "./routes/gen-image";
import doCallRoute from "./routes/do";

const app = new Hono<{ Bindings: Env }>().basePath("/api");

app.route("/gen-image", genImageRoute);

app.route("/call-do", doCallRoute);

export default app;

export { GenerateStorageImageWorkflow } from "./workflows/generate-storage-image-workflow";
export { Veet } from "./durable-objects/veet";
// async fetch(request) {
//   const url = new URL(request.url);

//   if (url.pathname.startsWith("/api/get-image")) {
//     // const url =
//     //   "https://storage.googleapis.com/gmi-video-assests-prod/user-assets/8061d9fb-e8bc-4977-8040-7ed9090e80ec/2229c949-aad4-4ba9-9748-33b93cf6d265/gmi-videogen/generated/google_ai_studio_62a12d37-675b-47cb-a400-7390cd34eeab_51a44009-d1fa-473e-8da6-6842216b8910.png";
//     const url = "https://r2.88boy.lol/mua/xyz3.jpg";
//     return Response.json({
//       images: [url],
//     });
//   } else if (url.pathname.startsWith("/api/generate-good-img")) {
//     const input = url.searchParams.get("type");
//     let prompt = "";
//     if (input == "h") {
//       prompt = `Edit the image based on the cat in the original photo, keeping the cat's appearance, pose, expression, and background unchanged. In the front left area from the cat's perspective, place a fresh orange carrot on the ground. The cat's one front paw is extended and hovering directly above the carrot, as if about to touch or grab it. In the front right area, place a rectangular box of tissues (tissue box with the top open and some white tissues slightly pulled out) on the ground. Natural and cute composition, foreground in sharp focus, warm natural lighting, highly detailed, realistic.`;
//     } else {
//       prompt = `Edit the image based on the cat in the original photo, keeping the cat's appearance, pose, expression, and background exactly the same. In the front left from the cat's view, place a fresh vibrant orange carrot on the ground. In the front right, place a square tissue box (light-colored box with top open, several soft white tissues slightly pulled out, looking fluffy and playful). The cat's one front paw is extended forward, hovering directly above the tissue box, as if curiously about to paw at or touch the tissues. Adorable and playful composition, sharp foreground focus, warm natural lighting, highly detailed, photorealistic`;
//     }
//     const imageURLs = ["https://r2.88boy.lol/pipi.jpg"];
//     const API_KEY = env.GMICLOUD_APIKEY;
//     const response = await fetch(
//       `https://console.gmicloud.ai/api/v1/ie/requestqueue/apikey/requests`,
//       {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${API_KEY}`,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           model: "seedream-4-0-250828",
//           payload: {
//             prompt,
//             image: imageURLs,
//             size: "1024x1024",
//             max_images: 1,
//             sequential_image_generation: "auto",
//             seed: -1,
//             watermark: false,
//             response_format: "url",
//           },
//         }),
//       }
//     );

//     const data = await response.json();

//     return Response.json(data);
//   } else if (url.pathname.startsWith("/api/get-good-img-status")) {
//     const request_id = url.searchParams.get("request_id");
//     const API_KEY = env.GMICLOUD_APIKEY;
//     const response = await fetch(
//       `https://console.gmicloud.ai/api/v1/ie/requestqueue/apikey/requests/${request_id}`,
//       {
//         method: "GET",
//         headers: {
//           Authorization: `Bearer ${API_KEY}`,
//         },
//       }
//     );
//     const data = await response.json();

//     return Response.json(data);
//   }

//   return new Response(null, { status: 404 });
// },
