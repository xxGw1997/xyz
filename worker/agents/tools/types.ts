import type { InferUITool } from "ai";
import type { getWeather } from "./get-weather";

export type AgentTools = {
  getWeather: InferUITool<typeof getWeather>;
};
