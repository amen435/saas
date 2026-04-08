import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import ChatHistorySidebar from "@/components/student/chat/ChatHistorySidebar";
import ChatWindow from "@/components/student/chat/ChatWindow";
import { useIsMobile } from "@/hooks/use-mobile";

const HISTORY_KEY = "student_chat_history";
const defaultMsg = {
  role: "assistant",
  content: "Hello! I'm your **Academic Hub AI**. I can help with your lessons, homework, and exam prep. What are we studying today?",
  time: "Now"
};

function loadHistory() {
  try {
    const data = JSON.parse(localStorage.getItem(HISTORY_KEY));
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

function saveHistory(sessions) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions));
}

function createSession() {
  return { id: Date.now(), messages: [defaultMsg], date: new Date().toLocaleDateString(), customTitle: "" };
}

export default function StudentAIChat() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [sessions, setSessions] = useState(() => {
    const saved = loadHistory();
    return saved.length > 0 ? saved : [createSession()];
  });

  const [activeSessionId, setActiveSessionId] = useState(() => sessions[0]?.id);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  useEffect(() => { saveHistory(sessions); }, [sessions]);

  const updateActiveMessages = useCallback((updater) => {
    setSessions(prev => prev.map(s =>
      s.id === activeSessionId
        ? { ...s, messages: typeof updater === "function" ? updater(s.messages) : updater }
        : s
    ));
  }, [activeSessionId]);

  const newChat = () => {
    // Prevent empty chat creation - don't create if current chat has no user messages
    const current = sessions.find(s => s.id === activeSessionId);
    if (current && !current.messages.some(m => m.role === "user")) {
      setSidebarOpen(false);
      return;
    }
    const s = createSession();
    setSessions(prev => [s, ...prev]);
    setActiveSessionId(s.id);
    setSidebarOpen(false);
  };

  const selectSession = (id) => {
    setActiveSessionId(id);
    setSidebarOpen(false);
  };

  const deleteSession = (id) => {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      if (next.length === 0) {
        const s = createSession();
        setActiveSessionId(s.id);
        return [s];
      }
      if (id === activeSessionId) setActiveSessionId(next[0].id);
      return next;
    });
  };

  const renameSession = (id, newTitle) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, customTitle: newTitle } : s));
  };

  const triggerRename = () => {
    const title = prompt("Rename conversation:", activeSession?.customTitle || "");
    if (title !== null && title.trim()) renameSession(activeSessionId, title.trim());
  };

  const exportChat = () => {
    if (!activeSession) return;
    const text = activeSession.messages
      .map(m => `[${m.role === "user" ? "You" : "AI"}] ${m.time}\n${m.content}`)
      .join("\n\n---\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-${activeSession.customTitle || "export"}-${activeSession.date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-xl border border-border overflow-hidden bg-card">
      {/* Mobile sidebar toggle */}
      {isMobile && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed bottom-24 right-4 z-50 w-12 h-12 rounded-full gradient-primary flex items-center justify-center shadow-lg"
        >
          {sidebarOpen ? <X className="w-5 h-5 text-primary-foreground" /> : <Menu className="w-5 h-5 text-primary-foreground" />}
        </button>
      )}

      {/* Sidebar - Desktop always visible, Mobile overlay */}
      {!isMobile && (
        <ChatHistorySidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onNewChat={newChat}
          onSelectSession={selectSession}
          onDeleteSession={deleteSession}
          onRenameSession={renameSession}
          className="w-72 shrink-0"
        />
      )}

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-[85%] max-w-sm"
            >
              <ChatHistorySidebar
                sessions={sessions}
                activeSessionId={activeSessionId}
                onNewChat={newChat}
                onSelectSession={selectSession}
                onDeleteSession={deleteSession}
                onRenameSession={renameSession}
                className="h-full"
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <div className="flex-1 min-w-0">
        <ChatWindow
          session={activeSession}
          onUpdateMessages={updateActiveMessages}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          onRename={triggerRename}
          onDelete={() => deleteSession(activeSessionId)}
          onExport={exportChat}
        />
      </div>
    </div>
  );
}
