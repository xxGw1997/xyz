import { generateText, type LanguageModel, type UIMessage } from "ai";

const TITLE_SYSTEM_PROMPT = `Generate a short chat title (2-5 words) summarizing the user's message.

Output ONLY the title text. No prefixes, no formatting.

Use the same language as the user's message. If don't know the language just use Chinese.

Examples:
- "what's the weather in nyc" → Weather in NYC
- "help me write an essay about space" → Space Essay Help
- "hi" → New Conversation
- "debug my python code" → Python Debugging

Never output hashtags, prefixes like "Title:", or quotes.`;

export function findFirstUserMessageText(messages: UIMessage[]): string | null {
  for (const message of messages) {
    if (message.role !== "user") continue;

    const text = message.parts
      .filter(
        (part): part is { type: "text"; text: string } => part.type === "text",
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
  const data = await generateText({
    model,
    instructions: TITLE_SYSTEM_PROMPT,
    prompt: message.slice(0, 4000),
    maxOutputTokens: 64,
    temperature: 0.2,
    timeout: 10_000,
    reasoning: "none",
  });

  const text = data.text;

  const title = text
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .replace(/\s+/g, " ")
    .replace(/[.!?。！？，,：:]+$/g, "")
    .trim()
    .slice(0, 35);

  return title || null;
}
