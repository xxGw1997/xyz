export type ChatBubbleProps = {
  content: string;
  type?: "";
};

export function ChatBubble({ content, type }: ChatBubbleProps) {
  switch (type) {
    default:
      return (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
      );
  }
}
