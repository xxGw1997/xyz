import type { AgentMessage } from "./types";

const DEFAULT_MODEL_CONTEXT_TOKEN_BUDGET = 24_000;
type AgentMessagePart = AgentMessage["parts"][number];

function isActiveToolPart(part: AgentMessagePart): boolean {
  const state = (part as Record<string, unknown>).state;

  return (
    state === "input-streaming" ||
    state === "input-available" ||
    state === "approval-requested" ||
    state === "approval-responded"
  );
}

function projectMessageForModel(message: AgentMessage): AgentMessage {
  const parts = message.parts.filter((part) => {
    return part.type !== "reasoning" && part.type !== "reasoning-file";
  });

  return { ...message, parts };
}

function getActiveToolChainStart(messages: AgentMessage[]): number {
  const activeToolMessageIndex = messages.findIndex((message) =>
    message.parts.some((part) => isActiveToolPart(part)),
  );

  if (activeToolMessageIndex === -1) {
    return messages.length;
  }

  for (let index = activeToolMessageIndex - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "user") {
      return index;
    }
  }

  return activeToolMessageIndex;
}

function estimateMessageTokens(message: AgentMessage): number {
  const serialized = JSON.stringify({
    role: message.role,
    parts: message.parts,
  });
  let asciiCharacters = 0;
  let nonAsciiCharacters = 0;

  for (const character of serialized) {
    if (character.charCodeAt(0) <= 0x7f) {
      asciiCharacters += 1;
    } else {
      nonAsciiCharacters += 1;
    }
  }

  return Math.ceil(asciiCharacters / 4 + nonAsciiCharacters / 1.5 + 16);
}

export function prepareModelContext(
  messages: AgentMessage[],
  tokenBudget = DEFAULT_MODEL_CONTEXT_TOKEN_BUDGET,
): AgentMessage[] {
  const projectedMessages = messages
    .map(projectMessageForModel)
    .filter((message) => message.parts.length > 0);
  const activeChainStart = getActiveToolChainStart(projectedMessages);
  const selectedMessages: AgentMessage[] = [];
  let usedTokens = 0;

  for (let index = projectedMessages.length - 1; index >= 0; index -= 1) {
    const message = projectedMessages[index];
    if (!message) continue;

    const messageTokens = estimateMessageTokens(message);
    const isRequired = index >= activeChainStart;

    if (
      !isRequired &&
      usedTokens > 0 &&
      usedTokens + messageTokens > tokenBudget
    ) {
      break;
    }

    selectedMessages.push(message);
    usedTokens += messageTokens;
  }

  const orderedMessages = selectedMessages.reverse();
  const firstUserMessageIndex = orderedMessages.findIndex(
    (message) => message.role === "user",
  );

  return firstUserMessageIndex > 0
    ? orderedMessages.slice(firstUserMessageIndex)
    : orderedMessages;
}

export function mergeApprovalStates(
  messagesFromDb: AgentMessage[],
  submittedMessages: AgentMessage[],
): AgentMessage[] {
  const approvalStates = new Map<string, AgentMessagePart>();

  for (const message of submittedMessages) {
    for (const part of message.parts) {
      const candidate = part as Record<string, unknown>;
      const state = candidate.state;
      const toolCallId = candidate.toolCallId;

      if (
        (state === "approval-responded" || state === "output-denied") &&
        typeof toolCallId === "string"
      ) {
        approvalStates.set(toolCallId, part);
      }
    }
  }

  return messagesFromDb.map((message) => ({
    ...message,
    parts: message.parts.map((part) => {
      const toolCallId = (part as Record<string, unknown>).toolCallId;
      const approvalState =
        typeof toolCallId === "string"
          ? approvalStates.get(toolCallId)
          : undefined;

      return approvalState ? { ...part, ...approvalState } : part;
    }),
  })) as AgentMessage[];
}
