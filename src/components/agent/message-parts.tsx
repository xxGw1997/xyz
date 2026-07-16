import { MessageResponse } from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import type { AgentMessage } from "@/types";
import { Weather } from "./weather";

type MessagePart = AgentMessage["parts"][number];

function ToolPart({
  part,
  onApproval,
}: {
  part: MessagePart;
  onApproval: (approval: { id: string; approved: boolean }) => void;
}) {
  if (part.type === "tool-getWeather") {
    switch (part.state) {
      case "input-streaming":
        return <div>正在准备天气查询...</div>;
      case "input-available":
        return <div>正在请求天气查询许可...</div>;
      case "approval-requested":
        return (
          <div className="my-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            <p>
              Agent 想查询 {part.input.city ?? "指定位置"} 的天气，是否同意？
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700"
                onClick={() =>
                  onApproval({ id: part.approval.id, approved: true })
                }
              >
                同意
              </button>
              <button
                type="button"
                className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-medium hover:bg-amber-100 dark:border-amber-500/40 dark:hover:bg-amber-500/20"
                onClick={() =>
                  onApproval({ id: part.approval.id, approved: false })
                }
              >
                拒绝
              </button>
            </div>
          </div>
        );
      case "approval-responded":
        return (
          <div className="my-2 text-xs text-muted-foreground">
            天气查询已{part.approval.approved ? "同意" : "拒绝"}
          </div>
        );
      case "output-available":
        return <Weather weatherAtLocation={part.output} />;
      case "output-denied":
        return (
          <div className="my-2 text-sm text-muted-foreground">
            天气查询已拒绝。
          </div>
        );
      case "output-error":
        return (
          <div className="my-2 text-sm text-destructive">
            天气查询失败：{part.errorText}
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="my-2 rounded-lg border border-dashed border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
      <div className="mb-1 font-medium text-foreground">{part.type}</div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words">
        {JSON.stringify(part, null, 2)}
      </pre>
    </div>
  );
}

export function MessageParts({
  isLastMessage,
  isStreaming,
  message,
  onApproval,
}: {
  isLastMessage: boolean;
  isStreaming: boolean;
  message: AgentMessage;
  onApproval: (approval: { id: string; approved: boolean }) => void;
}) {
  const lastPart = message.parts.at(-1);

  return (
    <>
      {message.parts.map((part, partIndex) => {
        if (part.type === "text") {
          return (
            <MessageResponse key={`${message.id}-${partIndex}`}>
              {part.text}
            </MessageResponse>
          );
        }

        if (part.type === "reasoning") {
          const isReasoningStreaming =
            isLastMessage && isStreaming && lastPart === part;

          return (
            <Reasoning
              key={`${message.id}-${partIndex}`}
              className="w-full"
              isStreaming={isReasoningStreaming}
            >
              <ReasoningTrigger />
              <ReasoningContent>{part.text}</ReasoningContent>
            </Reasoning>
          );
        }

        if (part.type.startsWith("tool-")) {
          return (
            <ToolPart
              key={`${message.id}-${partIndex}`}
              part={part}
              onApproval={onApproval}
            />
          );
        }

        return null;
      })}
    </>
  );
}