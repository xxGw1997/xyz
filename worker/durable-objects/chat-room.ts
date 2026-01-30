import { DurableObject } from "cloudflare:workers";

export class ChatRoom extends DurableObject<Env> {
  private connections: Map<WebSocket, { id: string | null }>;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    this.connections = new Map();
    this.ctx.getWebSockets().forEach((ws) => {
      this.connections.set(ws, { ...ws.deserializeAttachment() });
    });
  }

  async fetch(request: Request) {
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);

    this.connections.set(pair[1], { id: null });

    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  webSocketMessage(ws: WebSocket, message: string): void | Promise<void> {
    const connection = this.connections.get(ws)!;
    if (!connection.id) {
      connection.id = crypto.randomUUID();
      ws.serializeAttachment({
        ...ws.deserializeAttachment(),
        id: connection.id,
      });
      ws.send(JSON.stringify({ ready: true, id: connection.id }));
    }
    ws.send(JSON.stringify({ ready: true, id: connection.id }));

    this.broadcast(ws, message);
  }

  broadcast(sender: WebSocket, message: string) {
    const userId = this.connections.get(sender)?.id;

    for (const [ws] of this.connections) {
      if (ws === sender) continue;
      ws.send(JSON.stringify({ message, userId }));
    }
  }

  webSocketClose(ws: WebSocket): void | Promise<void> {
    this.close(ws);
  }

  webSocketError(ws: WebSocket): void | Promise<void> {
    this.close(ws);
  }

  close(ws: WebSocket) {
    this.connections.delete(ws);
  }
}
