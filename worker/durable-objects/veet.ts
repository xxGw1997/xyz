import { DurableObject } from "cloudflare:workers";

export class Veet extends DurableObject<Env> {
  private sessions: Map<WebSocket, { id: string | null }>;
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    this.sessions = new Map();
    this.ctx.getWebSockets().forEach((ws) => {
      this.sessions.set(ws, { ...ws.deserializeAttachment() });
    });
  }

  async fetch(_request: Request): Promise<Response> {
    const pair = new WebSocketPair();

    this.ctx.acceptWebSocket(pair[1]);
    this.sessions.set(pair[1], { id: null });
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer
  ): void | Promise<void> {
    const session = this.sessions.get(ws)!;
    if (!session.id) {
      session.id = crypto.randomUUID();
      ws.serializeAttachment({ ...ws.deserializeAttachment(), id: session.id });
      ws.send(JSON.stringify({ ready: true, id: session.id }));
    }

    this.broadcast(ws, message);
  }

  broadcast(sender: WebSocket, message: string | ArrayBuffer) {
    const id = this.sessions.get(sender)!.id;

    for (const [ws] of this.sessions) {
      if (ws === sender) continue;
      switch (typeof message) {
        case "string":
          ws.send(JSON.stringify({ ...JSON.parse(message), id }));
          break;

        default:
          ws.send(JSON.stringify({ ...message, id }));
          break;
      }
    }
  }

  webSocketClose(
    ws: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean
  ): void | Promise<void> {
    this.close(ws);
  }

  webSocketError(ws: WebSocket, _error: unknown): void | Promise<void> {
    this.close(ws);
  }

  close(ws: WebSocket) {
    const session = this.sessions.get(ws);
    if (!session?.id) return;

    this.broadcast(ws, JSON.stringify({ type: "left" }));

    this.sessions.delete(ws);
  }
}
