import { generateText, type LanguageModel, type UIMessage } from "ai";

const TITLE_SYSTEM_PROMPT = [
  "Generate a concise title that summarizes the user's first message.",
  "Use the same language as the user's message.",
  "For Chinese, use no more than 20 Chinese characters.",
  "For other languages, use no more than 8 words.",
  "Return only the title without quotes, markdown, or ending punctuation.",
].join("\n");

export function findFirstUserMessageText(
  messages: UIMessage[],
): string | null {
  for (const message of messages) {
    if (message.role !== "user") continue;

    const text = message.parts
      .filter(
        (part): part is { type: "text"; text: string } =>
          part.type === "text",
      )
      .map((part) => part.text)
      .join("\n")
      .trim();

    if (text) return text;
  }

  return null;
}

export function isMissingChatTitle(title: string | null): boolean {
  if (title == null) return true;

  const normalizedTitle = title.trim();
  return normalizedTitle === "" || normalizedTitle === "New Chat";
}

export async function generateChatTitle({
  model,
  message,
}: {
  model: LanguageModel;
  message: string;
}): Promise<string | null> {
  const { text } = await generateText({
    model,
    system: TITLE_SYSTEM_PROMPT,
    prompt: message.slice(0, 4000),
    maxOutputTokens: 64,
    temperature: 0.2,
    timeout: 10_000,
  });

  const title = text
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .replace(/\s+/g, " ")
    .replace(/[.!?。！？，,：:]+$/g, "")
    .trim()
    .slice(0, 80);

  return title || null;
}
