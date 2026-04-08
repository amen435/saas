import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles, Loader2, MoreVertical, Pencil, Trash2, Download } from "lucide-react";
import ChatMessage from "./ChatMessage";
import { getSubjectTag, getTitle, subjectColors } from "./ChatHistorySidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { aiService } from "@/services/aiService";

const quickChips = ["DNA Replication", "Quadratic Formula", "Battle of Adwa", "Newton's Laws"];

const defaultMsg = {
  role: "assistant",
  content: "Hello! I'm your **Academic Hub AI**. I can help with your lessons, homework, and exam prep. What are we studying today?",
  time: "Now"
};

export default function ChatWindow({
  session, onUpdateMessages, isLoading, setIsLoading,
  onRename, onDelete, onExport
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);
  const messages = session?.messages || [defaultMsg];
  const subject = getSubjectTag(messages);
  const title = session?.customTitle || getTitle(messages);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text) => {
    if (!text.trim() || isLoading) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg = { role: "user", content: text, time: now };
    onUpdateMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const chat = await aiService.chat(text, {
        sessionId: session?.id?.toString?.() || null,
      });

      const aiContent = chat?.aiResponse || "I'm sorry, I couldn't generate a response. Please try again.";
      const assistantMsg = { role: "assistant", content: aiContent, time: now };
      onUpdateMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      console.error("Chat error:", e);
      onUpdateMessages(prev => [...prev, {
        role: "assistant",
        content: `Sorry, I encountered an error: ${e.message}. Please try again.`,
        time: now
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const regenerate = () => {
    const lastUserIdx = [...messages].reverse().findIndex(m => m.role === "user");
    if (lastUserIdx === -1) return;
    const lastUserMsg = messages[messages.length - 1 - lastUserIdx];
    onUpdateMessages(prev => prev.slice(0, prev.length - 1));
    send(lastUserMsg.content);
  };

  const lastAssistantIdx = messages.reduce((acc, m, i) => m.role === "assistant" && !m.streaming ? i : acc, -1);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border bg-card flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-foreground text-sm truncate">{title}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${subjectColors[subject] || subjectColors.General}`}>
                {subject}
              </span>
              <span className="text-[10px] text-success flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success" /> Online
              </span>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onRename}>
              <Pencil className="w-3.5 h-3.5 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExport}>
              <Download className="w-3.5 h-3.5 mr-2" /> Export
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((m, i) => (
          <ChatMessage
            key={i}
            message={m}
            isLast={i === lastAssistantIdx}
            isLoading={isLoading}
            onRegenerate={i === lastAssistantIdx ? regenerate : undefined}
          />
        ))}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shrink-0 mt-1">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-sm text-muted-foreground ml-1">Thinking...</span>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-5 py-4 border-t border-border bg-card shrink-0">
        <div className="flex items-center gap-3 bg-muted/40 rounded-xl border border-border px-4 py-2 focus-within:ring-2 focus-within:ring-ring transition-shadow">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send(input)}
            placeholder="Type your academic question here..."
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground outline-none"
            disabled={isLoading}
          />
          <button
            onClick={() => send(input)}
            disabled={isLoading || !input.trim()}
            className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {isLoading ? <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" /> : <Send className="w-4 h-4 text-primary-foreground" />}
          </button>
        </div>

        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {quickChips.map(c => (
            <button
              key={c}
              onClick={() => send(c)}
              disabled={isLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3 h-3" /> {c}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2.5">
          AI may produce inaccurate information. Please verify with your textbooks.
        </p>
      </div>
    </div>
  );
}
