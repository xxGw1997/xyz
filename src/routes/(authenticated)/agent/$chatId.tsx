import { Fragment, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { chatAgentClient } from "@/lib/hono-client";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bot, Check, CopyIcon, Pencil, RefreshCcwIcon, Sparkles, X } from "lucide-react";
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
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { MessageParts } from "@/components/agent/message-parts";
import { AgentSidebar } from "@/components/agent/agent-sidebar";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
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
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");
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

  const renameChatMutation = useMutation({
    mutationFn: async ({ chatId: targetChatId, title }: { chatId: string; title: string }) => {
      const res = await chatAgentClient.chats[":chatId"].$patch({
        param: { chatId: targetChatId },
        json: { title },
      });
      if (!res.ok) throw new Error("修改标题失败");
      const data = await res.json();
      return data.chat;
    },
    onSuccess: (chat) => {
      queryClient.setQueryData(["agent-chat-detail", chatId], chat);
      queryClient.setQueryData<Awaited<ReturnType<typeof fetchChats>>>(
        ["agent-chats"],
        (currentChats) => currentChats?.map((item) => (item.id === chat.id ? { ...item, title: chat.title } : item)),
      );
      setIsEditingTitle(false);
    },
    onError: (renameError) => toast.error(renameError.message),
  });

  const deleteChatMutation = useMutation({
    mutationFn: async (targetChatId: string) => {
      const res = await chatAgentClient.chats[":chatId"].$delete({
        param: { chatId: targetChatId },
      });
      if (!res.ok) throw new Error("删除对话失败");
    },
    onSuccess: (_, deletedChatId) => {
      queryClient.setQueryData<Awaited<ReturnType<typeof fetchChats>>>(
        ["agent-chats"],
        (currentChats) => currentChats?.filter((item) => item.id !== deletedChatId),
      );
      if (deletedChatId === chatId) navigate({ to: "/agent" });
    },
    onError: (deleteError) => toast.error(deleteError.message),
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
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onData: (part) => {
      if (part.type !== "data-chat-title") return;
      if (!part.data || typeof part.data !== "object") return;

      const data = part.data as Record<string, unknown>;
      if (data.chatId !== chatId || typeof data.title !== "string") return;

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

  const isBusy = status === "submitted" || status === "streaming";
  const isStreaming = status === "streaming";
  const isNewChat =
    !messagesQuery.isPending && messages.length === 0 && !q && !isBusy;
  const chats = chatsQuery.data ?? [];
  const currentTitle = chatDetailQuery.data?.title || "New Chat";
  const isAwaitingAssistantResponse = status === "submitted";

  const handleSubmit = (message: PromptInputMessage) => {
    const value = message.text.trim();
    if (!value || isBusy) return;

    sendMessage({ text: value });
    setInput("");
  };

  const handleCreateChat = () => {
    navigate({
      to: "/agent",
    });
  };

  const startEditingTitle = () => {
    setTitleInput(currentTitle);
    setIsEditingTitle(true);
  };

  const handleRenameTitle = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = titleInput.trim();
    if (!title || title.length > 35) return;
    renameChatMutation.mutate({ chatId, title });
  };

  return (
    <SidebarProvider>
      <AgentSidebar
        chats={chats}
        activeChatId={chatId}
        isLoading={chatsQuery.isPending}
        isCreating={false}
        onCreateChat={handleCreateChat}
        onRenameChat={async (targetChatId, title) => {
          await renameChatMutation.mutateAsync({ chatId: targetChatId, title });
        }}
        onDeleteChat={async (targetChatId) => {
          await deleteChatMutation.mutateAsync(targetChatId);
        }}
      />
      <SidebarInset className="h-dvh min-h-0 overflow-hidden bg-background">
        <section className="flex h-full min-h-0 flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 px-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger className="size-8" />
              <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Bot className="size-4" />
              </div>
              <div className="min-w-0">
                {isEditingTitle ? (
                  <form onSubmit={handleRenameTitle} className="flex items-center gap-1">
                    <input
                      value={titleInput}
                      onChange={(event) => setTitleInput(event.currentTarget.value)}
                      maxLength={35}
                      autoFocus
                      className="h-7 w-48 rounded-md border bg-background px-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="对话标题"
                    />
                    <Button type="submit" variant="ghost" size="icon" className="size-7" disabled={!titleInput.trim() || renameChatMutation.isPending} aria-label="保存标题">
                      <Check className="size-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => setIsEditingTitle(false)} aria-label="取消修改标题">
                      <X className="size-4" />
                    </Button>
                  </form>
                ) : (
                  <button type="button" onClick={startEditingTitle} className="group flex max-w-full items-center gap-1 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <span className="truncate text-sm font-semibold">{currentTitle}</span>
                    <Pencil className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
                  </button>
                )}
                <p className="text-xs text-muted-foreground">
                  {isNewChat ? "New conversation" : "Saved conversation"}
                </p>
              </div>
            </div>
            <div className="hidden items-center gap-2 rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground sm:flex">
              <Sparkles className="size-4" />
              {chatDetailQuery.data?.model || "deepseek-v4-pro"}
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-hidden">
            <div className="flex h-full min-h-0 flex-col">
              <Conversation className="apple-scrollbar min-h-0">
                <ConversationContent className="min-h-full px-4 py-8 sm:px-8 lg:px-12">
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
                    <ConversationEmptyState className="min-h-[calc(100dvh-12rem)]">
                      <div className="max-w-2xl text-center">
                        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                          <Bot className="size-9" />
                        </div>
                        <h2 className="mt-6 text-3xl font-semibold tracking-tight sm:text-5xl">
                          开始一段新对话
                        </h2>
                        <p className="mt-4 text-base leading-7 text-muted-foreground">
                          这是一个新的 Agent
                          Chat。发送第一条消息后，它会变成可继续追问的历史对话。
                        </p>
                      </div>
                    </ConversationEmptyState>
                  ) : (
                    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
                      {isAwaitingAssistantResponse && (
                        <Message
                          from="assistant"
                          className="mr-auto max-w-[84%] sm:max-w-[72%]"
                        >
                          <MessageContent className="bg-transparent px-0 py-1 text-sm leading-7 text-[#1d1d1f] shadow-none dark:text-[#f5f5f7] sm:text-base">
                            <Shimmer duration={1}>Thinking...</Shimmer>
                          </MessageContent>
                        </Message>
                      )}
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
                <div className="mx-auto mb-3 flex w-[calc(100%-2rem)] max-w-5xl items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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
                className="mx-auto mb-3 flex w-[calc(100%-1.5rem)] max-w-5xl items-end gap-3 rounded-2xl border bg-background p-2 shadow-sm"
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
                  className="size-10 shrink-0 rounded-xl"
                />
              </PromptInput>
            </div>
          </div>
        </section>
      </SidebarInset>
    </SidebarProvider>
  );
}
