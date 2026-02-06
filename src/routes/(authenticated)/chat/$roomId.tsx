import { useCallback, useEffect, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useWebSocket } from "@/hooks/use-websocket";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/components/providers/auth-provider";
import { MessageMetaSchema, type Message } from "../../../../worker/types";
import { RoomHeader } from "@/components/chat-room/room-header";
import { RoomMembers } from "@/components/chat-room/room-members";
import { cn } from "@/lib/utils";
import { ChatArea } from "@/components/chat-room/chat-area";
import { Users, X } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { roomClient } from "@/lib/hono-client";
import { useCommonDisplayStatus } from "@/hooks/use-common-status";
import { toast } from "sonner";

export const Route = createFileRoute("/(authenticated)/chat/$roomId")({
  component: RouteComponent,
  params: {
    parse: (param) => ({
      roomId: param.roomId as string,
    }),
    stringify: ({ roomId }) => ({
      roomId,
    }),
  },
});

const HISTORY_MESSAGE_LIMIT = 20;

function RouteComponent() {
  const { roomId } = Route.useParams();
  // prod link
  const WEBSOCKET_URL = `${import.meta.env.VITE_BASE_URL!}/api/room/chat/${roomId}/join`;
  const user = useAuthContext().user;
  const router = useRouter();

  const [showSidebar, setShowSidebar] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  // local message list -> [...early message,history message, ...websocket message, new message]
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [messageCreatedAt, setMessageCreatedAt] = useState<undefined | string>(
    undefined
  );

  const { mutate: getRoomHistoryMessage, isPending: isLoadingHistoryMessage } =
    useMutation({
      mutationFn: async ({
        roomId,
        messageCreatedAt,
      }: {
        roomId: string;
        messageCreatedAt: string | undefined;
      }) => {
        const response = await roomClient.chat[":roomId"].history.$get({
          query: {
            beforeCreatedAt: messageCreatedAt,
            limit: "" + HISTORY_MESSAGE_LIMIT,
          },
          param: {
            roomId,
          },
        });

        const data = await response.json();
        if (data.success) return data.messages;
        else return [];
      },
      onSuccess: (historyMessage) => {
        if (historyMessage && historyMessage.length > 0) {
          if (historyMessage.length < HISTORY_MESSAGE_LIMIT) {
            setHasMore(false);
          } else {
            setHasMore(true);
          }
          // update messageCreatedAt
          setMessageCreatedAt(historyMessage[0].sendTime);
          // update messages
          const formatMessage: Array<Message> = historyMessage.map((m) => ({
            ...m,
            type: "user",
            content: m.content ?? "",
            meta: m.meta ? MessageMetaSchema.parse(m.meta) : undefined,
          }));
          setMessages((prev) => [...formatMessage, ...prev]);
        } else {
          setHasMore(false);
        }
      },
      onError: (e) => {
        toast.error(e.message);
      },
    });

  const getRoomMembers = useQuery({
    queryKey: ["get-room-members"],
    queryFn: async () => {
      const response = await roomClient.members.list.$get({
        query: {
          roomId,
        },
      });

      return await response.json();
    },
  });

  if (!user) return <span>Not Allow</span>;

  const handleMessage = useCallback((message: Message) => {
    if (message.type === "system") {
      setOnlineUsers(message.onlineUsers);
    }
    setMessages((prev) => [...prev, message]);
  }, []);

  const handleConnect = useCallback(() => {
    console.log("connect");
  }, []);

  const handleDisconnect = useCallback(() => {
    console.log("disconnect");
  }, []);

  const { connect, sendMessage, disconnect } = useWebSocket({
    url: WEBSOCKET_URL,
    onMessage: handleMessage,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
  });

  const setThemeSwitcherShow = useCommonDisplayStatus(
    (state) => state.setThemeSwitcherShow
  );
  const setAuthInlineActionsShow = useCommonDisplayStatus(
    (state) => state.setAuthInlineActionsShow
  );

  useEffect(() => {
    getRoomHistoryMessage({ roomId, messageCreatedAt });
    setThemeSwitcherShow(false);
    setAuthInlineActionsShow(false);
    connect();

    return () => {
      setThemeSwitcherShow(true);
      setAuthInlineActionsShow(true);
      disconnect();
    };
  }, []);

  const handleExit = () => {
    disconnect();
    if (router.history.canGoBack()) {
      router.history.back();
    } else {
      router.navigate({
        to: "/chat",
      });
    }
  };

  const handleSendMessage = (content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        senderId: user.id,
        senderName: user.name,
        sendTime: new Date().toISOString(),
        type: "user",
        content,
      },
    ]);
    sendMessage({
      senderId: user.id,
      senderName: user.name,
      sendTime: "",
      type: "user",
      content,
    });
  };

  const members = getRoomMembers.data?.success
    ? getRoomMembers.data.members
    : [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <RoomHeader
        roomName="General Chat"
        userCount={onlineUsers.length}
        onExit={handleExit}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Online Users Sidebar - Desktop */}
        <aside className="hidden lg:flex w-64 border-r border-border/50 bg-card/30 flex-col">
          <RoomMembers
            onlineUsers={onlineUsers}
            users={members}
            className="flex-1"
            currentUserId={user.id}
          />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {showSidebar && (
          <div
            className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={() => setShowSidebar(false)}
            onKeyDown={(e) => e.key === "Escape" && setShowSidebar(false)}
            role="button"
            tabIndex={0}
            aria-label="Close sidebar"
          />
        )}

        {/* Mobile Sidebar */}
        <aside
          className={cn(
            "lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-card border-r border-border/50 z-50 transform transition-transform duration-300 ease-out flex flex-col",
            showSidebar ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <h2 className="font-semibold text-foreground">Online Users</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSidebar(false)}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <RoomMembers
            onlineUsers={onlineUsers}
            users={members}
            className="flex-1"
            currentUserId={user.id}
          />
        </aside>

        {/* Chat Area */}
        <main className="flex-1 flex flex-col min-w-0">
          <ChatArea
            className="flex-1"
            messages={messages}
            roomMembers={members}
            onSendMessage={handleSendMessage}
            currentUserId={user.id}
            hasMore={hasMore}
            onLoadMore={() =>
              getRoomHistoryMessage({ roomId, messageCreatedAt })
            }
            isLoading={isLoadingHistoryMessage}
          />
        </main>

        {/* Mobile Users Button */}
        <Button
          onClick={() => setShowSidebar(true)}
          variant="secondary"
          size="icon"
          className="lg:hidden fixed bottom-24 left-4 z-30 h-12 w-12 rounded-full shadow-lg"
        >
          <Users className="w-5 h-5" />
          <span className="sr-only">Show online users</span>
        </Button>
      </div>
    </div>
  );
}
