import { cn } from "@/lib/utils";
import { Settings } from "lucide-react";
import { UserAvatar } from "../user-avatar";
import { Button } from "../ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "../ui/popover";
import { Separator } from "../ui/separator";
import ThemeSwitcher from "../theme-switer";

interface User {
  userId: string;
  name: string;
  image?: string | null;
  role: "member" | "admin" | "owner";
}

interface RoomMembersProps {
  users: User[];
  onlineUsers: string[];
  className?: string;
  currentUserId: string;
}

export function RoomMembers({
  users,
  onlineUsers,
  className,
  currentUserId,
}: RoomMembersProps) {
  const statusColors = {
    online: "bg-emerald-500",
    away: "bg-rose-500",
    busy: "bg-amber-500",
  };

  const userStatus = (userId: string) => {
    if (onlineUsers.includes(userId)) {
      return "online";
    } else {
      return "away";
    }
  };

  const curUser = users.find((user) => user.userId === currentUserId);

  // user list sorted by user status
  const sortedUsers = users.sort((prev) => {
    if (onlineUsers.includes(prev.userId)) {
      return -1;
    } else {
      return 1;
    }
  });

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <h2 className="text-sm font-medium text-foreground">Room Members</h2>
        <span className="flex items-center justify-center min-w-6 h-6 px-2 text-xs font-medium bg-primary/20 text-primary rounded-full">
          {users.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex flex-col gap-1">
          {sortedUsers.map((user) => (
            <div
              key={user.userId}
              className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/50 transition-all duration-200 cursor-pointer"
            >
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-linear-to-br from-primary/30 to-accent/30 flex items-center justify-center ring-2 ring-border/50 overflow-hidden">
                  {user.image ? (
                    <img
                      src={user.image || "/placeholder.svg"}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium text-foreground">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-card",
                    statusColors[userStatus(user.userId)]
                  )}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                  {user.name}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {userStatus(user.userId)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between  border border-border px-3 py-4">
        <div className="flex items-center gap-x-3">
          <UserAvatar name={curUser?.name} avatar={curUser?.image} />
          {curUser?.name}
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon">
              <Settings />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="center">
            <PopoverHeader>
              <PopoverTitle>Settings</PopoverTitle>
              <PopoverDescription>
                Set the chat room performance
              </PopoverDescription>
            </PopoverHeader>
            <Separator className="my-2" />
            <div className="flex flex-col gap-y-2">
              <div className="flex justify-center">
                <ThemeSwitcher />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
