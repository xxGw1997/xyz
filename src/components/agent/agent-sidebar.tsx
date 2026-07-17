import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Clock3,
  Ellipsis,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type AgentChat = {
  id: string;
  title: string | null;
};

type AgentSidebarProps = {
  chats: AgentChat[];
  activeChatId?: string;
  isLoading: boolean;
  isCreating: boolean;
  onCreateChat: () => void;
  onRenameChat: (chatId: string, title: string) => Promise<void>;
  onDeleteChat: (chatId: string) => Promise<void>;
};

export function AgentSidebar({
  chats,
  activeChatId,
  isLoading,
  isCreating,
  onCreateChat,
  onRenameChat,
  onDeleteChat,
}: AgentSidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const [chatToRename, setChatToRename] = useState<AgentChat | null>(null);
  const [title, setTitle] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<AgentChat | null>(null);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);

  const closeMobileSidebar = () => {
    if (isMobile) setOpenMobile(false);
  };

  const openRenameDialog = (chat: AgentChat) => {
    setChatToRename(chat);
    setTitle(chat.title || "New Chat");
  };

  const handleRename = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextTitle = title.trim();
    if (!chatToRename || !nextTitle || nextTitle.length > 35) return;

    setIsRenaming(true);
    try {
      await onRenameChat(chatToRename.id, nextTitle);
      setChatToRename(null);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDelete = async (chatId: string) => {
    setDeletingChatId(chatId);
    try {
      await onDeleteChat(chatId);
      setChatToDelete(null);
    } finally {
      setDeletingChatId(null);
    }
  };

  return (
    <Sidebar collapsible="offcanvas" variant="inset">
      <SidebarHeader className="gap-3 p-3">
        <div className="flex items-center justify-between gap-3 px-1">
          <Link
            to="/agent"
            onClick={closeMobileSidebar}
            className="flex min-w-0 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <MessageCircle className="size-4" />
            </span>
            <span className="min-w-0 font-semibold tracking-tight">Agent Chat</span>
          </Link>
        </div>
        <Button
          type="button"
          onClick={onCreateChat}
          disabled={isCreating}
          className="h-9 w-full justify-start gap-2 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
        >
          <Plus className="size-4" />
          新建对话
        </Button>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup className="px-0 py-2">
          <SidebarGroupLabel className="gap-2 px-2">
            <Clock3 className="size-3.5" />
            历史对话
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <SidebarMenuItem key={index}>
                    <div className="h-9 animate-pulse rounded-md bg-sidebar-accent" />
                  </SidebarMenuItem>
                ))
              ) : chats.length ? (
                chats.map((chat) => (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={chat.id === activeChatId}
                      tooltip={chat.title || "New Chat"}
                    >
                      <Link
                        to="/agent/$chatId"
                        params={{ chatId: chat.id }}
                        search={{ q: undefined }}
                        onClick={closeMobileSidebar}
                      >
                        <MessageCircle />
                        <span>{chat.title || "New Chat"}</span>
                      </Link>
                    </SidebarMenuButton>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuAction
                          type="button"
                          aria-label={`更多操作：${chat.title || "New Chat"}`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Ellipsis />
                        </SidebarMenuAction>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => openRenameDialog(chat)}>
                          <Pencil />
                          修改标题
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={deletingChatId === chat.id}
                          onSelect={() => setChatToDelete(chat)}
                        >
                          <Trash2 />
                          删除对话
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                ))
              ) : (
                <p className="px-2 py-4 text-xs leading-5 text-sidebar-foreground/60">
                  暂无历史对话，开始一个新聊天吧。
                </p>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <p className="px-1 text-xs leading-5 text-sidebar-foreground/55">
          你的对话会自动保存在这里。
        </p>
      </SidebarFooter>

      <Dialog
        open={chatToRename !== null}
        onOpenChange={(open) => {
          if (!open && !isRenaming) setChatToRename(null);
        }}
      >
        <DialogContent>
          <form onSubmit={handleRename}>
            <DialogHeader>
              <DialogTitle>修改对话标题</DialogTitle>
              <DialogDescription>标题最多可输入 35 个字符。</DialogDescription>
            </DialogHeader>
            <Input
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
              maxLength={35}
              autoFocus
              className="mt-5"
              aria-label="对话标题"
            />
            <p className="mt-2 text-right text-xs text-muted-foreground">
              {title.length}/35
            </p>
            <DialogFooter className="mt-5">
              <Button
                type="button"
                variant="outline"
                disabled={isRenaming}
                onClick={() => setChatToRename(null)}
              >
                取消
              </Button>
              <Button type="submit" disabled={!title.trim() || isRenaming}>
                保存
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={chatToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deletingChatId) setChatToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <div className="mb-1 grid size-10 place-items-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" />
            </div>
            <DialogTitle>确认删除此对话？</DialogTitle>
            <DialogDescription className="leading-6">
              删除后，对话将不再出现在历史记录中，且无法在应用中恢复。确定要删除“{chatToDelete?.title || "New Chat"}”吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-5">
            <Button
              type="button"
              variant="outline"
              disabled={deletingChatId !== null}
              onClick={() => setChatToDelete(null)}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={chatToDelete === null || deletingChatId !== null}
              onClick={() => {
                if (chatToDelete) void handleDelete(chatToDelete.id);
              }}
            >
              <Trash2 className="size-4" />
              删除对话
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
