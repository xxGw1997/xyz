export { GenerateStorageImageWorkflow } from "./workflows/generate-storage-image-workflow";

export default {
  fetch(request) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      // const url =
      //   "https://storage.googleapis.com/gmi-video-assests-prod/user-assets/8061d9fb-e8bc-4977-8040-7ed9090e80ec/2229c949-aad4-4ba9-9748-33b93cf6d265/gmi-videogen/generated/google_ai_studio_62a12d37-675b-47cb-a400-7390cd34eeab_51a44009-d1fa-473e-8da6-6842216b8910.png";
      const url = "https://r2.88boy.lol/mua/xyz3.jpg";
      return Response.json({
        images: [url],
      });
    }
    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
