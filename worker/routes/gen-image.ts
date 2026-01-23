import { Hono } from "hono";

const genImageRoute = new Hono<{ Bindings: Env }>();

genImageRoute.get("/get-image", (c) => {
  const url = "https://r2.88boy.lol/mua/xyz3.jpg";
  return c.json({ images: [url] });
});

genImageRoute.get("/generate-good-img", async (c) => {
  const input = c.req.query("type");
  let prompt = "";
  if (input == "h") {
    prompt = `Edit the image based on the cat in the original photo, keeping the cat's appearance, pose, expression, and background unchanged. In the front left area from the cat's perspective, place a fresh orange carrot on the ground. The cat's one front paw is extended and hovering directly above the carrot, as if about to touch or grab it. In the front right area, place a rectangular box of tissues (tissue box with the top open and some white tissues slightly pulled out) on the ground. Natural and cute composition, foreground in sharp focus, warm natural lighting, highly detailed, realistic.`;
  } else {
    prompt = `Edit the image based on the cat in the original photo, keeping the cat's appearance, pose, expression, and background exactly the same. In the front left from the cat's view, place a fresh vibrant orange carrot on the ground. In the front right, place a square tissue box (light-colored box with top open, several soft white tissues slightly pulled out, looking fluffy and playful). The cat's one front paw is extended forward, hovering directly above the tissue box, as if curiously about to paw at or touch the tissues. Adorable and playful composition, sharp foreground focus, warm natural lighting, highly detailed, photorealistic`;
  }
  const imageURLs = ["https://r2.88boy.lol/pipi.jpg"];
  const API_KEY = c.env.GMICLOUD_APIKEY;
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
          watermark: false,
          response_format: "url",
        },
      }),
    }
  );

  const data = await response.json();
  return c.json(data);
});

genImageRoute.get("/get-good-img-status", async (c) => {
  const request_id = c.req.query("request_id");
  const API_KEY = c.env.GMICLOUD_APIKEY;
  const response = await fetch(
    `https://console.gmicloud.ai/api/v1/ie/requestqueue/apikey/requests/${request_id}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    }
  );
  const data = await response.json();

  return c.json(data);
});

export default genImageRoute;
