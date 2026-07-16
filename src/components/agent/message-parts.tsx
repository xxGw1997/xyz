import { MessageResponse } from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import type { AgentMessage } from "@/types";
import { Weather } from "./weather";

type MessagePart = AgentMessage["parts"][number];

function ToolPart({ part }: { part: MessagePart }) {
  if (part.type === "tool-getWeather") {
    // TODO out调用有error
    return <Weather weatherAtLocation={part.output} />;
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
}: {
  isLastMessage: boolean;
  isStreaming: boolean;
  message: AgentMessage;
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
          return <ToolPart key={`${message.id}-${partIndex}`} part={part} />;
        }

        return null;
      })}
    </>
  );
}
