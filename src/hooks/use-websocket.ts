import { useCallback, useEffect, useRef, useState } from "react";

export interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  type: "user" | "system" | "other";
}

interface UseWebSocketOptions {
  url: string;
  onMessage?: (message: Message) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export function useWebSocket({
  url,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
  reconnectAttempts = 5,
  reconnectInterval = 3000,
}: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus("connecting");

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionStatus("connected");
        reconnectCountRef.current = 0;
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const message: Message = {
            id: data.id || crypto.randomUUID(),
            content: data.content || data.message || event.data,
            sender: data.sender || "Unknown",
            timestamp: new Date(data.timestamp || Date.now()),
            type: data.type || "other",
          };
          onMessage?.(message);
        } catch {
          // If not JSON, treat as plain text
          const message: Message = {
            id: crypto.randomUUID(),
            content: event.data,
            sender: "System",
            timestamp: new Date(),
            type: "system",
          };
          onMessage?.(message);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setConnectionStatus("disconnected");
        onDisconnect?.();

        // Attempt to reconnect
        if (reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        setConnectionStatus("error");
        onError?.(error);
      };

      wsRef.current = ws;
    } catch (error) {
      setConnectionStatus("error");
      console.error("WebSocket connection error:", error);
    }
  }, [
    url,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnectAttempts,
    reconnectInterval,
  ]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectCountRef.current = reconnectAttempts; // Prevent reconnection
    wsRef.current?.close();
    wsRef.current = null;
  }, [reconnectAttempts]);

  const sendMessage = useCallback((message: string | object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const data =
        typeof message === "string" ? message : JSON.stringify(message);
      wsRef.current.send(data);
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, []);

  return {
    isConnected,
    connectionStatus,
    connect,
    disconnect,
    sendMessage,
  };
}
