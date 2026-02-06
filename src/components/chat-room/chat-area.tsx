import type React from "react";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  Send,
  ImageIcon,
  FileText,
  Download,
  UserPlus,
  UserMinus,
  Check,
  CheckCheck,
  ArrowBigUpDash,
  Loader,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Message } from "../../../worker/types";
import { ChatBubble } from "./chat-bubble";
import { useInView } from "@/hooks/use-in-view";

interface User {
  userId: string;
  name: string;
  image?: string | null;
  role: "member" | "admin" | "owner";
}

interface ChatAreaProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  currentUserId: string;
  className?: string;
  roomMembers: User[];
  hasMore: boolean;
  onLoadMore: () => void;
  isLoading: boolean;
}

export function ChatArea({
  messages,
  onSendMessage,
  currentUserId,
  roomMembers,
  className,
  hasMore,
  onLoadMore,
  isLoading,
}: ChatAreaProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [messagesEndRef, messageEndIsInView] = useInView<HTMLDivElement>({
    once: false,
    rootMargin: "0px",
    threshold: 1,
  });
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getUserName = (userId: string) => {
    const member = roomMembers.find((member) => member.userId === userId);
    return member ? member.name : userId;
  };

  useEffect(() => {
    // only when the messageEnd is in view need scroll to bottom
    if (messageEndIsInView.current) scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput("");
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return new Intl.DateTimeFormat("zh-CN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  };

  const renderSystemMessage = (
    message: Extract<Message, { type: "system" }>
  ) => {
    const isJoin = message.systemType === "member_join";
    return (
      <div className="flex justify-center my-3 animate-in fade-in duration-300">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/40 border border-border/30">
          {isJoin ? (
            <UserPlus className="w-3.5 h-3.5 text-green-400" />
          ) : (
            <UserMinus className="w-3.5 h-3.5 text-orange-400" />
          )}
          <span className="text-xs text-muted-foreground">
            {getUserName(message.userId) || "Someone"}{" "}
            {isJoin ? "joined the room" : "left the room"}
          </span>
          <span className="text-xs text-muted-foreground/60">
            {formatTime(message.createTime)}
          </span>
        </div>
      </div>
    );
  };

  const renderMessageContent = (
    message: Extract<Message, { type: "user" }>
  ) => {
    const messageType = message.meta?.messageType || "text";
    const attachmentUrl = message.meta?.attachmentUrl;

    switch (messageType) {
      case "image":
        return (
          <div className="space-y-2">
            {message.content && (
              <p className="text-sm leading-relaxed">{message.content}</p>
            )}
            {attachmentUrl && (
              <div className="relative group">
                <img
                  src={attachmentUrl || "/placeholder.svg"}
                  alt="Shared image"
                  className="max-w-70 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                />
                <a
                  href={attachmentUrl}
                  download
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        );

      case "file":
        return (
          <div className="space-y-2">
            {message.content && (
              <p className="text-sm leading-relaxed">{message.content}</p>
            )}
            {attachmentUrl && (
              <a
                href={attachmentUrl}
                download
                className="flex items-center gap-3 p-3 rounded-lg bg-background/30 hover:bg-background/50 transition-colors group"
              >
                <div className="p-2 rounded-lg bg-primary/20">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Attachment</p>
                  <p className="text-xs text-muted-foreground">
                    Click to download
                  </p>
                </div>
                <Download className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </a>
            )}
          </div>
        );

      default:
        //  TODO: custom message bubble
        return <ChatBubble content={message.content} type="" />;
    }
  };

  const renderUserMessage = (
    message: Extract<Message, { type: "user" }>,
    index: number
  ) => {
    const isOwn = message.senderId === currentUserId;
    const messageType = message.meta?.messageType || "text";
    const isRead = message.meta?.isRead ?? false;
    const tag = message.meta?.tag;

    return (
      <div
        key={`${message.senderId}-${message.sendTime}-${index}`}
        className={cn(
          "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
          isOwn ? "flex-row-reverse" : "flex-row"
        )}
      >
        <div className="shrink-0">
          <div className="w-9 h-9 rounded-full bg-linear-to-br from-primary/40 to-accent/40 flex items-center justify-center ring-1 ring-border/50">
            <span className="text-xs font-semibold text-foreground">
              {message.senderName.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
        <div
          className={cn(
            "flex flex-col max-w-[75%]",
            isOwn ? "items-end" : "items-start"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2 mb-1",
              isOwn && "flex-row-reverse"
            )}
          >
            <span
              className={cn(
                "text-xs font-medium",
                isOwn ? "text-primary" : "text-foreground"
              )}
            >
              {isOwn ? "You" : message.senderName}
            </span>
            {tag && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-primary/20 text-primary">
                {tag}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatTime(message.sendTime)}
            </span>
          </div>
          <div
            className={cn(
              "px-4 py-2.5 rounded-2xl",
              isOwn
                ? "bg-primary text-primary-foreground rounded-tr-md"
                : "bg-secondary text-secondary-foreground rounded-tl-md"
            )}
          >
            {messageType !== "text" && (
              <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-current/10">
                {messageType === "image" ? (
                  <ImageIcon className="w-3.5 h-3.5" />
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
                <span className="text-[10px] uppercase tracking-wider opacity-70">
                  {messageType}
                </span>
              </div>
            )}
            {renderMessageContent(message)}
          </div>
          {isOwn && (
            <div className="flex items-center gap-1 mt-1">
              {isRead ? (
                <CheckCheck className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Check className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              <span className="text-[10px] text-muted-foreground">
                {isRead ? "Read" : "Sent"}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const generateKey = (message: Message) => {
    if (message.type === "system") {
      return `${message.type}-${message.createTime}`;
    } else {
      return `${message.type}-${message.sendTime}`;
    }
  };

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-scroll p-4 md:p-6 max-h-[calc(100vh-240px)]">
        <div className="flex flex-col gap-4 max-w-5xl mx-auto">
          {/* Load History Message */}
          <div className="flex justify-center">
            {hasMore ? (
              isLoading ? (
                <Loader className="animate-spin" />
              ) : (
                <Button
                  disabled={isLoading}
                  variant={"ghost"}
                  size="icon"
                  onClick={onLoadMore}
                >
                  <ArrowBigUpDash />
                </Button>
              )
            ) : (
              <span className="text-sm text-zinc-300">No more messages.</span>
            )}
          </div>

          {messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-secondary/50 flex items-center justify-center">
                  <Send className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">
                  No messages yet. Start the conversation!
                </p>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <Fragment key={generateKey(message)}>
                {message.type === "system"
                  ? renderSystemMessage(message)
                  : renderUserMessage(message, index)}
              </Fragment>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border/50 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3 bg-secondary/30 rounded-2xl p-2 ring-1 ring-border/50 focus-within:ring-primary/50 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              rows={1}
              className="flex-1 bg-transparent border-0 outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground px-2 py-2 max-h-32"
              style={{
                height: "auto",
                minHeight: "40px",
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
              }}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim()}
              size="icon"
              className="h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-4 h-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Press Enter to send, Shift + Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
