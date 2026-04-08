import { useState, useEffect, useCallback, useRef } from "react";
import { MessageSquare, Send, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import MessageBubble from "@/components/messaging/MessageBubble";
import { messageService, unwrapList } from "@/services/messageService";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * Full-width 1:1 chat: conversation list + thread + compose to contact.
 * @param {string} [props.emptyHint] — shown when list is empty
 */
export default function DirectMessagingPanel({
  emptyHint = "No conversations yet. Start a new message below.",
  showNewRecipientSelect = true,
  newRecipientLabel = "New message to…",
}) {
  const { user } = useAuth();
  const myId = user?.userId ? String(user.userId) : "";

  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [newMsg, setNewMsg] = useState("");
  const [search, setSearch] = useState("");
  const [newRecipient, setNewRecipient] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await messageService.getConversations();
      setConversations(unwrapList(res));
    } catch {
      setConversations([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadContacts = useCallback(async () => {
    try {
      const res = await messageService.getContacts();
      setContacts(unwrapList(res));
    } catch {
      setContacts([]);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    loadContacts();
  }, [loadConversations, loadContacts]);

  const refreshThread = useCallback(
    async (partnerId) => {
      if (!partnerId) return;
      setLoadingThread(true);
      try {
        const response = await messageService.getConversation(partnerId, { limit: 80 });
        const data = response?.data?.data || response?.data || response || [];
        console.log("messages:", data);
        setMessages(Array.isArray(data) ? data : []);
        await messageService.markAsRead(partnerId).catch(() => {});
        loadConversations();
      } catch {
        setMessages([]);
        toast.error("Could not load messages");
      } finally {
        setLoadingThread(false);
      }
    },
    [loadConversations]
  );

  useEffect(() => {
    if (!selectedPartnerId) {
      setMessages([]);
      return;
    }
    refreshThread(selectedPartnerId);
  }, [selectedPartnerId, refreshThread]);

  useEffect(() => {
    if (!selectedPartnerId) return;
    const t = setInterval(() => refreshThread(selectedPartnerId), 22000);
    return () => clearInterval(t);
  }, [selectedPartnerId, refreshThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingThread]);

  const mergedRows = (() => {
    const byId = new Map();
    conversations.forEach((c) => {
      byId.set(String(c.partnerId), {
        id: String(c.partnerId),
        name: c.partnerName,
        subtitle: c.partnerRole,
        lastMessage: c.lastMessage,
        lastMessageTime: c.lastMessageTime,
        unreadCount: c.unreadCount ?? 0,
        fromApi: true,
      });
    });
    contacts.forEach((c) => {
      const id = String(c.userId);
      if (byId.has(id)) {
        const row = byId.get(id);
        row.subtitle = row.subtitle || c.label || c.kind;
      } else {
        byId.set(id, {
          id,
          name: c.fullName,
          subtitle: c.label || c.kind || c.role,
          lastMessage: null,
          lastMessageTime: null,
          unreadCount: 0,
          fromApi: false,
        });
      }
    });
    return Array.from(byId.values());
  })();

  const filteredRows = mergedRows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (r.name || "").toLowerCase().includes(q) ||
      (r.subtitle || "").toLowerCase().includes(q)
    );
  });

  const activeName =
    mergedRows.find((r) => r.id === String(selectedPartnerId))?.name ||
    "Contact";

  const handleSend = async () => {
    const text = newMsg.trim();
    const to = selectedPartnerId || newRecipient;
    if (!text || !to) {
      toast.error("Select a contact and enter a message");
      return;
    }
    setSending(true);
    try {
      await messageService.send({
        receiverId: to,
        content: text,
      });
      setNewMsg("");
      if (!selectedPartnerId && newRecipient) setSelectedPartnerId(newRecipient);
      await refreshThread(to);
      await loadConversations();
    } catch (e) {
      toast.error(e?.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ minHeight: 400 }}>
      <div className="bg-card rounded-xl border border-border overflow-hidden flex flex-col">
        <div className="p-3 border-b border-border space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-10 h-9"
            />
          </div>
          {showNewRecipientSelect && (
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {newRecipientLabel}
              </label>
              <select
                value={newRecipient}
                onChange={(e) => {
                  setNewRecipient(e.target.value);
                  if (e.target.value) setSelectedPartnerId(e.target.value);
                }}
                className="w-full mt-1 px-2 py-2 text-xs rounded-lg border border-border bg-background"
              >
                <option value="">— Optional: pick to open chat —</option>
                {contacts.map((c) => (
                  <option key={c.userId} value={c.userId}>
                    {c.label || `${c.fullName} (${c.kind || ""})`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="overflow-y-auto max-h-[400px] flex-1">
          {loadingList ? (
            <div className="flex justify-center py-10 text-muted-foreground text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : filteredRows.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4">{emptyHint}</p>
          ) : (
            filteredRows.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedPartnerId(c.id);
                  setNewRecipient("");
                }}
                className={`w-full flex items-center gap-3 p-3 border-b border-border text-left transition-colors hover:bg-muted/30 ${
                  selectedPartnerId === c.id ? "bg-primary/5" : ""
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                  {(c.name || "?").charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-heading truncate">
                      {c.name}
                    </p>
                    {c.unreadCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center flex-shrink-0">
                        {c.unreadCount > 9 ? "9+" : c.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {c.subtitle || " "}
                  </p>
                  {c.lastMessage && (
                    <p className="text-[11px] text-muted-foreground/90 truncate">
                      {c.lastMessage}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="lg:col-span-2 bg-card rounded-xl border border-border flex flex-col min-h-[400px]">
        {selectedPartnerId ? (
          <>
            <div className="p-4 border-b border-border flex items-center gap-3">
              <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                {activeName.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-heading">{activeName}</p>
                <p className="text-[11px] text-muted-foreground">Direct message</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[min(52vh,360px)]">
              {loadingThread ? (
                <div className="flex justify-center py-8 gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </div>
              ) : (
                <>
                  {messages.map((m) => {
                    const mine = String(m.senderId) === myId;
                    return (
                      <MessageBubble
                        key={m.messageId}
                        content={m.content}
                        createdAt={m.createdAt}
                        isMine={mine}
                        isRead={mine ? !!m.isRead : false}
                      />
                    );
                  })}
                  <div ref={bottomRef} />
                  {messages.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      No messages yet.
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="p-3 border-t border-border flex gap-2 mt-auto">
              <Input
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                placeholder="Type a message…"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="flex-1"
              />
              <Button
                type="button"
                disabled={sending}
                onClick={handleSend}
                className="gradient-primary text-primary-foreground"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground min-h-[320px]">
            <div className="text-center px-4">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Select a conversation or choose a contact above</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
