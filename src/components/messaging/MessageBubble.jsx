import { formatMessageTime } from "@/services/messageService";

/**
 * @param {object} props
 * @param {string} props.content
 * @param {string} props.createdAt — ISO date from API
 * @param {boolean} props.isMine — current user sent this
 * @param {boolean} [props.isRead] — delivery read (receiver opened); only meaningful when isMine
 */
export default function MessageBubble({ content, createdAt, isMine, isRead }) {
  const time = formatMessageTime(createdAt);

  return (
    <div className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[min(85%,28rem)] rounded-2xl px-4 py-2.5 shadow-sm ${
          isMine
            ? "gradient-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md border border-border/60"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{content}</p>
        <div
          className={`mt-1.5 flex items-center gap-1.5 ${
            isMine ? "justify-end" : "justify-start"
          }`}
        >
          <span
            className={`text-[10px] tabular-nums ${
              isMine ? "text-primary-foreground/75" : "text-muted-foreground"
            }`}
          >
            {time}
          </span>
          {isMine && (
            <span
              className={`text-[12px] leading-none select-none ${
                isRead ? "text-primary-foreground/95" : "text-primary-foreground/55"
              }`}
              title={isRead ? "Read" : "Sent"}
              aria-label={isRead ? "Read" : "Sent"}
            >
              {isRead ? "✓✓" : "✓"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
