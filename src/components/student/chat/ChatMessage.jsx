import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Copy, Check, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function ChatMessage({ message, onRegenerate, isLast, isLoading }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {/* AI Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shrink-0 mt-1 shadow-sm">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
      )}

      <div className={`group relative max-w-[75%] ${isUser ? "" : ""}`}>
        {/* Bubble */}
        <div className={`rounded-2xl px-4 py-3 ${
          isUser
            ? "gradient-primary text-primary-foreground rounded-br-md"
            : "bg-muted rounded-bl-md"
        }`}>
          {!isUser ? (
            <div className="text-sm prose prose-sm max-w-none dark:prose-invert leading-relaxed">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm leading-relaxed">{message.content}</p>
          )}
        </div>

        {/* Meta row */}
        <div className={`flex items-center gap-2 mt-1 px-1 ${isUser ? "justify-end" : "justify-start"}`}>
          <span className={`text-[10px] ${isUser ? "text-muted-foreground" : "text-muted-foreground"}`}>
            {message.time}
          </span>

          {/* Actions (visible on hover) */}
          {!isUser && !message.streaming && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Copy message"
              >
                {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
              </button>
              {isLast && onRegenerate && (
                <button
                  onClick={onRegenerate}
                  disabled={isLoading}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  title="Regenerate response"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0 mt-1 text-xs font-bold text-muted-foreground">
          You
        </div>
      )}
    </motion.div>
  );
}
