import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { chatAgentClient } from "@/lib/hono-client";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Bot,
  ChevronRight,
  CopyIcon,
  MessageCircle,
  PanelLeft,
  Plus,
  RefreshCcwIcon,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import {
  MessageParts,
} from "@/components/agent/message-parts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AgentMessage } from "@/types";

export const Route = createFileRoute("/(authenticated)/agent/$chatId")({
  component: RouteComponent,
  params: {
    parse: (params) => ({ chatId: params.chatId as string }),
    stringify: ({ chatId }) => ({ chatId }),
  },
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
});

async function fetchChats() {
  const res = await chatAgentClient.chats.$get();
  if (!res.ok) throw new Error("获取历史对话失败");
  const data = await res.json();
  return data.chats;
}

async function fetchChatDetail(chatId: string) {
  const res = await chatAgentClient.chats[":chatId"].$get({
    param: { chatId },
  });
  if (!res.ok) throw new Error("获取对话详情失败");
  const data = await res.json();
  return data.chatDetail;
}

async function fetchMessages(chatId: string) {
  const res = await chatAgentClient.chats[":chatId"].messages.$get({
    param: { chatId },
  });
  if (!res.ok) throw new Error("获取对话消息失败");
  const data = await res.json();
  return (data as { messages: AgentMessage[] }).messages;
}

async function createChat() {
  const res = await chatAgentClient.chats.$post();
  if (!res.ok) throw new Error("创建对话失败");
  const data = await res.json();
  return data.chatId;
}

function getMessageText(message: AgentMessage): string {
  return message.parts
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text",
    )
    .map((part) => part.text)
    .join("");
}

function RouteComponent() {
  const { chatId } = Route.useParams();
  const { q } = Route.useSearch();
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const hasSentInitialMessage = useRef(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const chatsQuery = useQuery({
    queryKey: ["agent-chats"],
    queryFn: fetchChats,
  });

  const chatDetailQuery = useQuery({
    queryKey: ["agent-chat-detail", chatId],
    queryFn: () => fetchChatDetail(chatId),
  });

  const messagesQuery = useQuery({
    queryKey: ["agent-chat-messages", chatId],
    queryFn: () => fetchMessages(chatId),
  });

  const initialMessages = useMemo(
    () => messagesQuery.data ?? [],
    [messagesQuery.data],
  );

  const {
    messages,
    setMessages,
    sendMessage,
    regenerate,
    stop,
    status,
    error,
    clearError,
    addToolApprovalResponse,
  } = useChat<AgentMessage>({
    id: chatId,
    messages: initialMessages,
    transport: new DefaultChatTransport<AgentMessage>({
      api: chatAgentClient.chats[":chatId"].messages
        .$url({ param: { chatId } })
        .toString(),
      prepareSendMessagesRequest: ({ messages: requestMessages }) => {
        const hasApprovalResponse = requestMessages.some((message) =>
          message.parts.some((part) => {
            const candidate = part as Record<string, unknown>;
            return (
              candidate.state === "approval-responded" ||
              candidate.state === "output-denied"
            );
          }),
        );

        return {
          body: {
            ...(hasApprovalResponse
              ? { messages: requestMessages }
              : {
                  message: [...requestMessages]
                    .reverse()
                    .find((message) => message.role === "user"),
                }),
          },
        };
      },
    }),
    sendAutomaticallyWhen:
      lastAssistantMessageIsCompleteWithApprovalResponses,
    onData: (part) => {
      if (part.type !== "data-chat-title") return;
      if (!part.data || typeof part.data !== "object") return;

      const data = part.data as Record<string, unknown>;
      if (data.chatId !== chatId || typeof data.title !== "string") return;

      console.log('ℹ️ℹ️ℹ️', JSON.stringify(data))
      const title = data.title;

      queryClient.setQueryData<Awaited<ReturnType<typeof fetchChatDetail>>>(
        ["agent-chat-detail", chatId],
        (currentChat) =>
          currentChat
            ? {
                ...currentChat,
                title,
              }
            : currentChat,
      );

      queryClient.setQueryData<Awaited<ReturnType<typeof fetchChats>>>(
        ["agent-chats"],
        (currentChats) =>
          currentChats?.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  title,
                }
              : chat,
          ),
      );
    },
    onFinish: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-chats"] });
      queryClient.invalidateQueries({
        queryKey: ["agent-chat-detail", chatId],
      });
      queryClient.invalidateQueries({
        queryKey: ["agent-chat-messages", chatId],
      });
    },
    onError: (chatError) => toast.error(chatError.message),
  });

  useEffect(() => {
    if (messagesQuery.data) {
      setMessages(messagesQuery.data);
    }
  }, [messagesQuery.data, setMessages]);

  useEffect(() => {
    hasSentInitialMessage.current = false;
    setInput("");
  }, [chatId]);

  useEffect(() => {
    if (!q || hasSentInitialMessage.current || messagesQuery.isPending) return;

    hasSentInitialMessage.current = true;
    sendMessage({ text: q });
    navigate({
      to: "/agent/$chatId",
      params: { chatId },
      search: { q: undefined },
      replace: true,
    });
  }, [chatId, messagesQuery.isPending, navigate, q, sendMessage]);

  const isNewChat = !messagesQuery.isPending && messages.length === 0 && !q;
  const isBusy = status === "submitted" || status === "streaming";
  const isStreaming = status === "streaming";
  const chats = chatsQuery.data ?? [];
  const currentTitle = chatDetailQuery.data?.title || "New Chat";

  const handleSubmit = (message: PromptInputMessage) => {
    const value = message.text.trim();
    if (!value || isBusy) return;

    sendMessage({ text: value });
    setInput("");
  };

  const handleCreateChat = async () => {
    try {
      const newChatId = await createChat();
      await queryClient.invalidateQueries({ queryKey: ["agent-chats"] });
      navigate({
        to: "/agent/$chatId",
        params: { chatId: newChatId },
        search: { q: undefined },
      });
    } catch (createError) {
      toast.error(
        createError instanceof Error ? createError.message : "创建对话失败",
      );
    }
  };

  return (
    <main className="h-dvh overflow-hidden bg-[#f5f5f7] text-[#1d1d1f] antialiased dark:bg-[#050506] dark:text-[#f5f5f7]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(255,255,255,0.94),transparent_26%),radial-gradient(circle_at_86%_4%,rgba(202,232,255,0.46),transparent_32%),radial-gradient(circle_at_72%_92%,rgba(255,255,255,0.72),transparent_28%),linear-gradient(135deg,rgba(250,250,252,0.98),rgba(232,235,240,0.78))] dark:bg-[radial-gradient(circle_at_12%_10%,rgba(255,255,255,0.11),transparent_26%),radial-gradient(circle_at_86%_4%,rgba(14,165,233,0.18),transparent_32%),radial-gradient(circle_at_72%_92%,rgba(255,255,255,0.07),transparent_28%),linear-gradient(135deg,rgba(24,24,27,0.98),rgba(5,5,6,0.98))]" />
      <div className="relative grid h-dvh min-h-0 md:grid-cols-[320px_1fr]">
        {sidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="关闭历史对话侧边栏"
          />
        )}

        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-[min(320px,88vw)] flex-col border-r border-white/70 bg-white/72 p-4 shadow-2xl shadow-black/10 backdrop-blur-2xl transition-transform duration-300 dark:border-white/10 dark:bg-[#151517]/82 md:static md:z-auto md:h-dvh md:w-auto md:translate-x-0 md:shadow-none",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-end">
            <Button
              type="button"
              size="icon"
              onClick={handleCreateChat}
              className="size-11 rounded-full bg-[#1d1d1f] text-white hover:bg-black dark:bg-white dark:text-black"
              aria-label="新建对话"
            >
              <Plus className="size-5" />
            </Button>
          </div>

          <div className="mt-6 rounded-[1.75rem] border border-white/70 bg-white/54 p-4 shadow-sm dark:border-white/8 dark:bg-white/8">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-[#6e6e73] dark:text-[#a1a1aa]">
              Current
            </p>
            <h1 className="mt-2 truncate text-xl font-semibold tracking-tight">
              {currentTitle}
            </h1>
            <p className="mt-2 text-sm text-[#86868b]">
              {isNewChat ? "新对话，等待第一条消息" : "历史对话，可继续追问"}
            </p>
          </div>

          <div className="apple-scrollbar mt-5 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {chats.map((chat) => {
              const active = chat.id === chatId;
              return (
                <Link
                  key={chat.id}
                  to="/agent/$chatId"
                  params={{ chatId: chat.id }}
                  search={{ q: undefined }}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "group flex min-h-15 items-center gap-3 rounded-3xl px-3 py-3 transition duration-200",
                    active
                      ? "bg-[#1d1d1f] text-white shadow-lg shadow-black/15 dark:bg-white dark:text-black"
                      : "text-[#3a3a3c] hover:bg-white/70 hover:shadow-sm dark:text-[#f5f5f7] dark:hover:bg-white/10",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-full",
                      active
                        ? "bg-white/15 dark:bg-black/10"
                        : "bg-[#f2f2f7] dark:bg-white/10",
                    )}
                  >
                    <MessageCircle className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {chat.title || "New Chat"}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 block truncate text-xs",
                        active
                          ? "text-white/70 dark:text-black/55"
                          : "text-[#86868b]",
                      )}
                    >
                      {active ? "正在查看" : "打开历史记录"}
                    </span>
                  </span>
                  <ChevronRight className="size-4 opacity-60" />
                </Link>
              );
            })}
          </div>
        </aside>

        <section className="flex h-dvh min-h-0 flex-col p-3 md:p-5">
          <header className="flex h-16 shrink-0 items-center justify-between rounded-[1.5rem] border border-white/70 bg-white/66 px-3 shadow-sm shadow-black/5 backdrop-blur-2xl dark:border-white/10 dark:bg-white/7 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="size-10 rounded-full md:hidden"
                aria-label="打开历史对话侧边栏"
              >
                <PanelLeft className="size-5" />
              </Button>
              <div className="grid size-10 place-items-center rounded-full bg-[#1d1d1f] text-white dark:bg-white dark:text-black">
                <Bot className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{currentTitle}</p>
                <p className="text-xs text-[#86868b]">
                  {isNewChat ? "New conversation" : "Saved conversation"}
                </p>
              </div>
            </div>
            <div className="hidden items-center gap-2 rounded-full bg-[#f2f2f7] px-3 py-2 text-xs font-medium text-[#6e6e73] dark:bg-white/10 dark:text-[#d1d1d6] sm:flex">
              <Sparkles className="size-4" />
              {chatDetailQuery.data?.model || "deepseek-v4-pro"}
            </div>
          </header>

          <div className="mt-3 min-h-0 flex-1 overflow-hidden rounded-[2.25rem] border border-white/75 bg-white/50 shadow-[0_28px_100px_rgba(29,29,31,0.11)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/7">
            <div className="flex h-full min-h-0 flex-col">
              <Conversation className="apple-scrollbar min-h-0">
                <ConversationContent className="min-h-full px-5 py-8 sm:px-10 lg:px-16">
                  {messagesQuery.isPending ? (
                    <div className="mx-auto w-full max-w-3xl space-y-4">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div
                          key={index}
                          className="h-20 animate-pulse rounded-[1.5rem] bg-black/5 dark:bg-white/10"
                        />
                      ))}
                    </div>
                  ) : isNewChat ? (
                    <ConversationEmptyState className="min-h-[calc(100dvh-15rem)]">
                      <div className="max-w-2xl text-center">
                        <div className="mx-auto grid size-20 place-items-center rounded-[1.75rem] bg-[#1d1d1f] text-white shadow-2xl shadow-black/20 dark:bg-white dark:text-black">
                          <Bot className="size-9" />
                        </div>
                        <h2 className="mt-8 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                          开始一段新对话
                        </h2>
                        <p className="mt-4 text-base leading-7 text-[#6e6e73] dark:text-[#a1a1aa]">
                          这是一个新的 Agent
                          Chat。发送第一条消息后，它会变成可继续追问的历史对话。
                        </p>
                      </div>
                    </ConversationEmptyState>
                  ) : (
                    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
                      {messages.map((message, messageIndex) => {
                        const isLastMessage =
                          messageIndex === messages.length - 1;
                        const messageText = getMessageText(message);

                        return (
                          <Fragment key={message.id}>
                            <Message
                              from={message.role}
                              className={cn(
                                message.role === "user"
                                  ? "ml-auto max-w-[78%] sm:max-w-[68%]"
                                  : "mr-auto max-w-[84%] sm:max-w-[72%]",
                              )}
                            >
                              <MessageContent
                                className={cn(
                                  "text-sm leading-7 sm:text-base",
                                  message.role === "user"
                                    ? "rounded-[1.65rem] rounded-br-md bg-[#007aff] px-5 py-4 text-white shadow-sm shadow-blue-500/20 sm:px-6 sm:py-5"
                                    : "bg-transparent px-0 py-1 text-[#1d1d1f] shadow-none dark:text-[#f5f5f7]",
                                )}
                              >
                                <MessageParts
                                  isLastMessage={isLastMessage}
                                  isStreaming={isStreaming}
                                  message={message}
                                  onApproval={(approval) =>
                                    addToolApprovalResponse(approval)
                                  }
                                />
                              </MessageContent>
                            </Message>
                            {message.role === "assistant" && isLastMessage && (
                              <MessageActions className="pl-2">
                                <MessageAction
                                  onClick={() => regenerate()}
                                  tooltip="重新生成"
                                  label="重新生成"
                                >
                                  <RefreshCcwIcon className="size-3" />
                                </MessageAction>
                                <MessageAction
                                  onClick={() =>
                                    navigator.clipboard.writeText(messageText)
                                  }
                                  tooltip="复制"
                                  label="复制"
                                >
                                  <CopyIcon className="size-3" />
                                </MessageAction>
                              </MessageActions>
                            )}
                          </Fragment>
                        );
                      })}
                    </div>
                  )}
                </ConversationContent>
                <ConversationScrollButton />
              </Conversation>

              {error && (
                <div className="mx-auto mb-3 flex w-[calc(100%-2rem)] max-w-5xl items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                  <span>{error.message}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearError}
                  >
                    关闭
                  </Button>
                </div>
              )}

              <PromptInput
                onSubmit={handleSubmit}
                className="mx-auto mb-4 flex w-[calc(100%-2rem)] max-w-5xl items-end gap-3 rounded-[1.35rem] border border-black/5 bg-white/88 p-3 shadow-[0_18px_50px_rgba(29,29,31,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-[#1c1c1e]/90"
              >
                <PromptInputTextarea
                  value={input}
                  onChange={(event) => setInput(event.currentTarget.value)}
                  placeholder={isNewChat ? "发送第一条消息..." : "继续追问..."}
                  className="max-h-40 min-h-12 resize-none border-0 bg-transparent px-3 py-3 text-base shadow-none focus-visible:ring-0"
                  aria-label="输入 Agent Chat 消息"
                />
                <PromptInputSubmit
                  status={status}
                  onStop={stop}
                  disabled={!isBusy && !input.trim()}
                  className="size-12 shrink-0 rounded-md bg-[#007aff] text-white shadow-lg shadow-blue-500/25 hover:bg-[#006ee6] disabled:bg-[#d1d1d6] dark:disabled:bg-white/20"
                />
              </PromptInput>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
