import { useCallback, useEffect } from "react";
import { useWebSocket, type Message } from "@/hooks/use-websocket";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(authenticated)/chat")({
  component: RouteComponent,
});

function RouteComponent() {
  const WEBSOCKET_URL = "ws://localhost:5173/api/room/chat/123/join";

  const handleMessage = useCallback((message: Message) => {
    console.log(message);
  }, []);

  const handleConnect = useCallback(() => {
    console.log("connect");
  }, []);

  const handleDisconnect = useCallback(() => {
    console.log("disconnect");
  }, []);

  const { connect } = useWebSocket({
    url: WEBSOCKET_URL,
    onMessage: handleMessage,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
  });

  useEffect(() => {
    connect();
  }, []);

  return <div>chat Room</div>;
}
