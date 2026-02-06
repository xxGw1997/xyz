import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { roomClient } from "@/lib/hono-client";
import { MessageSquare } from "lucide-react";
import { CreateRoomDialog } from "@/components/chat-room/create-room-dialog";
import { JoinRoomDialog } from "@/components/chat-room/join-room-dialog";
import { useAuthContext } from "@/components/providers/auth-provider";
import { RoomCard } from "@/components/chat-room/room-card";

export const Route = createFileRoute("/(authenticated)/chat/")({
  component: RouteComponent,
});

function RouteComponent() {
  const user = useAuthContext().user;
  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const createRoom = useMutation({
    mutationFn: async ({
      roomName,
      description,
    }: {
      roomName: string;
      description: string;
    }) => {
      const response = await roomClient.create.$post({
        form: {
          roomName,
          description: description ?? "",
        },
      });

      return (await response.json()).id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["get-room-list"] });
      toast.success(id);
    },
    onError: (e) => {
      toast.error(e.message);
    },
  });

  const getRoomList = useQuery({
    queryKey: ["get-room-list"],
    queryFn: async () => {
      const response = await roomClient.list.$get();
      return (await response.json()).rooms;
    },
  });

  const applyRoom = useMutation({
    mutationFn: async (roomId: string) => {
      const response = await roomClient.chat[":roomId"].applyJoinRoom.$post({
        param: { roomId },
      });
      if (response.ok) {
        return await response.json();
      } else {
        const errorMessage = await response.text();
        throw new Error(errorMessage);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["get-room-list"] });
      toast.success(data.message);
    },
    onError: (e) => {
      toast.error(e.message);
    },
  });

  if (getRoomList.status === "pending") {
    return <span>Loading...</span>;
  }

  if (getRoomList.error) {
    return <span>error: {getRoomList.error.message}</span>;
  }

  const handleCreateRoom = (roomName: string, description: string) => {
    createRoom.mutate({ roomName, description });
  };
  const handleJoinRoom = (roomId: string) => {
    applyRoom.mutate(roomId);
  };
  const handleEnterRoom = (roomId: string) => {
    navigate({
      to: "/chat/$roomId",
      params: {
        roomId,
      },
    });
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="size-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">聊天房间</h1>
          </div>
          <p className="text-muted-foreground">
            管理你的聊天房间，与他人交流分享。
          </p>
        </header>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {user?.emailVerified ? (
            <CreateRoomDialog onCreateRoom={handleCreateRoom} />
          ) : (
            <div>没权限</div>
          )}
          <JoinRoomDialog
            onJoinRoom={handleJoinRoom}
            isJoing={applyRoom.isPending}
          />
        </div>
        我的房间
        <div>
          {getRoomList.data.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {getRoomList.data.map((room) => (
                <RoomCard
                  key={room.id}
                  room={{
                    id: room.id,
                    description: room.description ?? "",
                    isJoined: true,
                    memberCount: room.memberCount,
                    name: room.name ?? "",
                  }}
                  onEnter={handleEnterRoom}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
              <MessageSquare className="mb-4 size-12 text-muted-foreground/50" />
              <h3 className="mb-2 text-lg font-medium">暂无加入的房间</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                浏览并加入感兴趣的房间开始聊天
              </p>
              <JoinRoomDialog
                onJoinRoom={handleJoinRoom}
                isJoing={applyRoom.isPending}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
