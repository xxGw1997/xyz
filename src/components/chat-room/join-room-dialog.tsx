import { useState } from "react";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface JoinRoomDialogProps {
  onJoinRoom: (roomId: string) => void;
  isJoing: boolean;
}

export function JoinRoomDialog({ onJoinRoom, isJoing }: JoinRoomDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Search className="size-4" />
          加入房间
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>加入房间</DialogTitle>
          <DialogDescription>浏览并加入你感兴趣的聊天房间。</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="输入房间ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            disabled={isJoing}
            variant="default"
            onClick={() => onJoinRoom(searchQuery)}
          >
            申请加入
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
