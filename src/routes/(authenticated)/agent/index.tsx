import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { chatAgentClient } from "@/lib/hono-client";
import {
  ArrowUp,
  Bot,
  ChevronRight,
  Clock3,
  MessageCircle,
  Plus,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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

  const recentChats = useMemo(() => chatsQuery.data ?? [], [chatsQuery.data]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createChatMutation.mutate(input);
  };

  const handleNewChat = () => {
    createChatMutation.mutate("");
  };

  return (
    <main className="min-h-dvh overflow-hidden bg-[#f5f5f7] text-[#1d1d1f] dark:bg-[#050506] dark:text-[#f5f5f7]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.9),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(188,212,255,0.42),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.8),rgba(236,238,242,0.74))] dark:bg-[radial-gradient(circle_at_20%_10%,rgba(75,85,99,0.18),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.18),transparent_32%),linear-gradient(135deg,rgba(15,15,17,0.92),rgba(5,5,6,0.96))]" />
      <div className="relative mx-auto grid min-h-dvh max-w-7xl gap-5 px-4 py-4 md:grid-cols-[320px_1fr] md:px-6 md:py-6">
        <aside className="rounded-[2rem] border border-white/70 bg-white/72 p-3 shadow-[0_24px_80px_rgba(29,29,31,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/7">
          <div className="flex items-center justify-between px-2 py-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-[#6e6e73] dark:text-[#a1a1aa]">
                Agent
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                Chat
              </h1>
            </div>
            <Button
              type="button"
              size="icon"
              onClick={handleNewChat}
              disabled={createChatMutation.isPending}
              className="size-11 rounded-full bg-[#1d1d1f] text-white shadow-lg shadow-black/15 hover:bg-black dark:bg-white dark:text-black"
              aria-label="创建新对话"
            >
              <Plus className="size-5" />
            </Button>
          </div>

          <div className="mt-5 flex items-center gap-2 px-2 text-sm font-medium text-[#6e6e73] dark:text-[#a1a1aa]">
            <Clock3 className="size-4" />
            历史对话
          </div>

          <div className="mt-3 space-y-2">
            {chatsQuery.isPending ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-16 animate-pulse rounded-3xl bg-black/5 dark:bg-white/10"
                />
              ))
            ) : recentChats.length ? (
              recentChats.map((chat) => (
                <Link
                  key={chat.id}
                  to="/agent/$chatId"
                  params={{ chatId: chat.id }}
                  search={{ q: undefined }}
                  className="group flex min-h-16 items-center gap-3 rounded-3xl px-3 py-3 transition duration-200 hover:bg-white hover:shadow-sm dark:hover:bg-white/10"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#f2f2f7] text-[#1d1d1f] dark:bg-white/12 dark:text-white">
                    <MessageCircle className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {chat.title || "New Chat"}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-[#86868b]">
                      继续这段 agent 对话
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-[#86868b] opacity-0 transition group-hover:opacity-100" />
                </Link>
              ))
            ) : (
              <Card className="rounded-3xl border-dashed bg-white/50 p-5 text-center shadow-none dark:bg-white/5">
                <p className="text-sm font-medium">还没有历史对话</p>
                <p className="mt-1 text-xs text-[#86868b]">
                  在右侧输入问题即可开始。
                </p>
              </Card>
            )}
          </div>
        </aside>

        <section className="flex min-h-[calc(100dvh-2rem)] flex-col rounded-[2.4rem] border border-white/70 bg-white/64 shadow-[0_30px_100px_rgba(29,29,31,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/7 md:min-h-0">
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="grid size-20 place-items-center rounded-[1.75rem] bg-[#1d1d1f] text-white shadow-2xl shadow-black/20 dark:bg-white dark:text-black">
              <Bot className="size-9" />
            </div>
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/70 px-4 py-2 text-sm font-medium text-[#6e6e73] shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-[#d1d1d6]">
              <Sparkles className="size-4" />
              Apple-inspired agent workspace
            </div>
            <h2 className="mt-6 max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
              有什么可以帮你完成？
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#6e6e73] sm:text-lg dark:text-[#a1a1aa]">
              创建新的 Agent Chat，对话会自动保存在历史记录中。输入第一条消息后会进入具体对话页面并开始响应。
            </p>
          </div>

          <div className="sticky bottom-0 p-4 sm:p-6">
            <form
              onSubmit={handleSubmit}
              className="mx-auto flex max-w-3xl items-end gap-3 rounded-[1.75rem] border border-black/5 bg-white/86 p-3 shadow-[0_18px_50px_rgba(29,29,31,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-[#1c1c1e]/88"
            >
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    createChatMutation.mutate(input);
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
                className={cn(
                  "size-12 shrink-0 rounded-full bg-[#007aff] text-white shadow-lg shadow-blue-500/25 hover:bg-[#006ee6]",
                  !input.trim() && "bg-[#1d1d1f] hover:bg-black dark:bg-white dark:text-black",
                )}
                aria-label="创建并发送"
              >
                <ArrowUp className="size-5" />
              </Button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
