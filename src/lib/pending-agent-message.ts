const pendingMessages = new Map<string, string>();

export function setPendingAgentMessage(chatId: string, message: string): void {
  pendingMessages.set(chatId, message);
}

export function getPendingAgentMessage(chatId: string): string | undefined {
  return pendingMessages.get(chatId);
}

export function clearPendingAgentMessage(chatId: string): void {
  pendingMessages.delete(chatId);
}
