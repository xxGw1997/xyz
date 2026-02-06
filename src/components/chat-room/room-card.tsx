import { Users, MessageCircle } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface Room {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  isJoined: boolean;
}

interface RoomCardProps {
  room: Room;
  onJoin?: (roomId: string) => void;
  onEnter?: (roomId: string) => void;
}

export function RoomCard({ room, onJoin, onEnter }: RoomCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{room.name}</CardTitle>
          {room.isJoined && <Badge variant="secondary">已加入</Badge>}
        </div>
        <CardDescription className="line-clamp-2">
          {room.description ? room.description : '-'}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Users className="size-4" />
            <span>{room.memberCount} 成员</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MessageCircle className="size-4" />
            <span>刚刚</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        {room.isJoined ? (
          <Button className="w-full" onClick={() => onEnter?.(room.id)}>
            进入房间
          </Button>
        ) : (
          <Button
            variant="outline"
            className="w-full bg-transparent"
            onClick={() => onJoin?.(room.id)}
          >
            加入房间
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
