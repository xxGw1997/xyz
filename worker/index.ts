import { Hono } from "hono";
import genImageRoute from "./routes/gen-image";
import roomRoute from "./routes/room";

const app = new Hono<{ Bindings: Env }>().basePath("/api");

app.route("/gen-image", genImageRoute);

app.route("/room", roomRoute);

export default app;

export { GenerateStorageImageWorkflow } from "./workflows/generate-storage-image-workflow";
export { Veet } from "./durable-objects/veet";
