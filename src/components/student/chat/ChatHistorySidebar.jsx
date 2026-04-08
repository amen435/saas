import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, MessageSquare, Trash2, Pencil, Check, X,
  Calendar, BookOpen, Filter, ChevronDown
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

const SUBJECT_TAGS = ["All", "Math", "Science", "English", "History", "Geography", "Physics", "Biology", "Chemistry", "Amharic"];
const DATE_FILTERS = ["All", "Today", "This Week", "This Month"];

function getSubjectTag(messages) {
  const keywords = {
    Math: ["math", "algebra", "geometry", "equation", "quadratic", "calculus", "fraction", "number"],
    Science: ["science", "experiment", "hypothesis", "atom", "molecule"],
    Physics: ["physics", "force", "velocity", "acceleration", "gravity", "energy", "newton"],
    Chemistry: ["chemistry", "element", "compound", "reaction", "acid", "base", "periodic"],
    Biology: ["biology", "cell", "dna", "gene", "organism", "photosynthesis", "evolution"],
    History: ["history", "war", "battle", "empire", "king", "revolution", "adwa", "ancient"],
    English: ["english", "grammar", "essay", "literature", "poem", "novel", "verb", "noun"],
    Geography: ["geography", "continent", "ocean", "climate", "map", "river", "mountain"],
    Amharic: ["amharic", "ፊደል", "ግዕዝ", "ቋንቋ"],
  };
  const text = messages.filter(m => m.role === "user").map(m => m.content).join(" ").toLowerCase();
  for (const [subject, keys] of Object.entries(keywords)) {
    if (keys.some(k => text.includes(k))) return subject;
  }
  return "General";
}

function getPreview(messages) {
  const first = messages.find(m => m.role === "user");
  if (!first) return "New conversation...";
  return first.content.length > 60 ? first.content.slice(0, 60) + "…" : first.content;
}

function getTitle(messages) {
  const first = messages.find(m => m.role === "user");
  if (!first) return "New Chat";
  return first.content.length > 30 ? first.content.slice(0, 30) + "…" : first.content;
}

function isInDateRange(dateStr, filter) {
  if (filter === "All") return true;
  const now = new Date();
  const date = new Date(dateStr);
  if (filter === "Today") return date.toDateString() === now.toDateString();
  if (filter === "This Week") {
    const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
    return date >= weekAgo;
  }
  if (filter === "This Month") {
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }
  return true;
}

const subjectColors = {
  Math: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  Science: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  Physics: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  Chemistry: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  Biology: "bg-green-500/15 text-green-600 dark:text-green-400",
  History: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  English: "bg-pink-500/15 text-pink-600 dark:text-pink-400",
  Geography: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
  Amharic: "bg-red-500/15 text-red-600 dark:text-red-400",
  General: "bg-muted text-muted-foreground",
};

export default function ChatHistorySidebar({
  sessions, activeSessionId, onNewChat, onSelectSession,
  onDeleteSession, onRenameSession, className = ""
}) {
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filtered = sessions.filter(s => {
    const title = s.customTitle || getTitle(s.messages);
    const preview = getPreview(s.messages);
    const subject = getSubjectTag(s.messages);
    const matchesSearch = !search || title.toLowerCase().includes(search.toLowerCase()) || preview.toLowerCase().includes(search.toLowerCase());
    const matchesSubject = subjectFilter === "All" || subject === subjectFilter;
    const matchesDate = isInDateRange(s.date, dateFilter);
    return matchesSearch && matchesSubject && matchesDate;
  });

  const startRename = (s) => {
    setRenamingId(s.id);
    setRenameValue(s.customTitle || getTitle(s.messages));
  };

  const confirmRename = () => {
    if (renameValue.trim()) onRenameSession(renamingId, renameValue.trim());
    setRenamingId(null);
  };

  return (
    <div className={`flex flex-col h-full bg-card border-r border-border ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-foreground text-base">Chat History</h2>
          <button
            onClick={onNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" /> New Chat
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted/50 border border-border text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring transition-shadow"
          />
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Filter className="w-3 h-3" />
          Filters
          <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </button>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-2"
            >
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1 mb-1.5">
                  <BookOpen className="w-3 h-3" /> Subject
                </label>
                <div className="flex flex-wrap gap-1">
                  {SUBJECT_TAGS.map(s => (
                    <button key={s} onClick={() => setSubjectFilter(s)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${subjectFilter === s ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1 mb-1.5">
                  <Calendar className="w-3 h-3" /> Date
                </label>
                <div className="flex flex-wrap gap-1">
                  {DATE_FILTERS.map(d => (
                    <button key={d} onClick={() => setDateFilter(d)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${dateFilter === d ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Session List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filtered.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No conversations found</p>
            </div>
          )}
          {filtered.map(s => {
            const subject = getSubjectTag(s.messages);
            const isActive = s.id === activeSessionId;
            const isRenaming = renamingId === s.id;
            const userMsgCount = s.messages.filter(m => m.role === "user").length;

            return (
              <motion.div
                key={s.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`group relative p-3 rounded-xl cursor-pointer transition-all ${
                  isActive
                    ? "bg-primary/10 border border-primary/20 shadow-sm"
                    : "hover:bg-muted/60 border border-transparent"
                }`}
                onClick={() => !isRenaming && onSelectSession(s.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {isRenaming ? (
                      <div className="flex items-center gap-1">
                        <input
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && confirmRename()}
                          className="flex-1 bg-background border border-border rounded px-2 py-0.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                          autoFocus
                          onClick={e => e.stopPropagation()}
                        />
                        <button onClick={(e) => { e.stopPropagation(); confirmRename(); }}
                          className="p-0.5 rounded hover:bg-success/10 text-success">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setRenamingId(null); }}
                          className="p-0.5 rounded hover:bg-destructive/10 text-destructive">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-foreground truncate">
                        {s.customTitle || getTitle(s.messages)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {getPreview(s.messages)}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${subjectColors[subject] || subjectColors.General}`}>
                        {subject}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {s.date} · {userMsgCount} msg{userMsgCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {!isRenaming && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); startRename(s); }}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(s.id); }}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this conversation and all its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { onDeleteSession(deleteTarget); setDeleteTarget(null); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export { getSubjectTag, getTitle, getPreview, subjectColors };
