import { Agent } from "agents";

export class ChatAgent extends Agent<Env> {
  async onRequest(request: Request): Promise<Response> {
    return new Response();
  }
}
