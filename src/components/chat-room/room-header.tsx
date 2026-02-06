import { LogOut, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RoomHeaderProps {
  roomName: string;
  userCount: number;
  onExit: () => void;
  className?: string;
}

export function RoomHeader({
  roomName,
  userCount,
  onExit,
  className,
}: RoomHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between px-4 md:px-6 py-4 border-b border-border/50 bg-card/50 backdrop-blur-sm",
        className
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold text-foreground">{roomName}</h1>
          <div className="flex items-center gap-3 mt-0.5">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {userCount} online
              </span>
            </div>
          </div>
        </div>
      </div>

      <Button
        onClick={onExit}
        variant="ghost"
        className="gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">Exit Room</span>
      </Button>
    </header>
  );
}
