import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { chatAgentClient } from "@/lib/hono-client";
import {
  ArrowUp,
  Bot,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AgentSidebar } from "@/components/agent/agent-sidebar";
import { Textarea } from "@/components/ui/textarea";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export const Route = createFileRoute("/(authenticated)/agent/")({
  component: RouteComponent,
});

async function fetchChats() {
  const res = await chatAgentClient.chats.$get();
  if (!res.ok) throw new Error("获取历史对话失败");
  const data = await res.json();
  return (data as { chats: Array<{ id: string; title: string | null }> }).chats;
}

async function createChat() {
  const res = await chatAgentClient.chats.$post();
  if (!res.ok) throw new Error("创建对话失败");
  const data = await res.json();
  return (data as { chatId: string }).chatId;
}

function RouteComponent() {
  const [input, setInput] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const chatsQuery = useQuery({
    queryKey: ["agent-chats"],
    queryFn: fetchChats,
  });

  const createChatMutation = useMutation({
    mutationFn: async (firstMessage: string) => ({
      chatId: await createChat(),
      firstMessage,
    }),
    onSuccess: async ({ chatId, firstMessage }) => {
      const trimmedMessage = firstMessage.trim();
      await queryClient.invalidateQueries({ queryKey: ["agent-chats"] });
      navigate({
        to: "/agent/$chatId",
        params: { chatId },
        search: { q: trimmedMessage || undefined },
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const renameChatMutation = useMutation({
    mutationFn: async ({ chatId, title }: { chatId: string; title: string }) => {
      const res = await chatAgentClient.chats[":chatId"].$patch({
        param: { chatId },
        json: { title },
      });
      if (!res.ok) throw new Error("修改标题失败");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agent-chats"] }),
    onError: (error) => toast.error(error.message),
  });

  const deleteChatMutation = useMutation({
    mutationFn: async (chatId: string) => {
      const res = await chatAgentClient.chats[":chatId"].$delete({
        param: { chatId },
      });
      if (!res.ok) throw new Error("删除对话失败");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agent-chats"] }),
    onError: (error) => toast.error(error.message),
  });

  const recentChats = useMemo(() => chatsQuery.data ?? [], [chatsQuery.data]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const firstMessage = input.trim();
    if (!firstMessage || createChatMutation.isPending) return;

    createChatMutation.mutate(firstMessage);
  };

  const handleNewChat = () => undefined;

  return (
    <SidebarProvider>
      <AgentSidebar
        chats={recentChats}
        isLoading={chatsQuery.isPending}
        isCreating={createChatMutation.isPending}
        onCreateChat={handleNewChat}
        onRenameChat={async (chatId, title) => {
          await renameChatMutation.mutateAsync({ chatId, title });
        }}
        onDeleteChat={async (chatId) => {
          await deleteChatMutation.mutateAsync(chatId);
        }}
      />
      <SidebarInset className="min-h-dvh bg-background">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/60 px-3">
          <SidebarTrigger className="size-8" />
          <span className="text-sm font-medium text-muted-foreground">新对话</span>
        </header>
        <section className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="grid size-20 place-items-center rounded-[1.75rem] bg-[#1d1d1f] text-white shadow-2xl shadow-black/20 dark:bg-white dark:text-black">
              <Bot className="size-9" />
            </div>
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-2 text-sm font-medium text-muted-foreground">
              <Sparkles className="size-4" />
              Apple-inspired agent workspace
            </div>
            <h2 className="mt-6 max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
              有什么可以帮你完成？
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              创建新的 Agent Chat，对话会自动保存在历史记录中。输入第一条消息后会进入具体对话页面并开始响应。
            </p>
          </div>

          <div className="sticky bottom-0 p-3 sm:p-4">
            <form
              onSubmit={handleSubmit}
              className="mx-auto flex w-full max-w-3xl items-end gap-3 rounded-2xl border bg-background p-2 shadow-sm"
            >
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    const firstMessage = input.trim();
                    if (!firstMessage || createChatMutation.isPending) return;

                    createChatMutation.mutate(firstMessage);
                  }
                }}
                placeholder="询问、规划、总结，或输入任意想法..."
                className="max-h-40 min-h-12 resize-none border-0 bg-transparent px-3 py-3 text-base shadow-none focus-visible:ring-0"
                aria-label="输入第一条 Agent Chat 消息"
              />
              <Button
                type="submit"
                size="icon"
                disabled={createChatMutation.isPending}
                className="size-10 shrink-0 rounded-xl"
                aria-label="创建并发送"
              >
                <ArrowUp className="size-5" />
              </Button>
            </form>
          </div>
        </section>
      </SidebarInset>
    </SidebarProvider>
  );
}
