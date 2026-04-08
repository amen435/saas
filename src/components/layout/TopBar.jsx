import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, Globe, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function TopBar({ onMenuToggle }) {
  const { user, loading } = useAuth();
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const panelRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setShowNotifications(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = () => setNotifications(notifications.map((n) => ({ ...n, read: true })));

  const typeColors = {
    warning: "bg-warning/10 text-warning",
    success: "bg-success/10 text-success",
    info: "bg-info/10 text-info",
  };

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button onClick={onMenuToggle} className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground">
          <Menu className="w-5 h-5" />
        </button>
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider hidden sm:block">{today}</p>
      </div>
      <div className="flex items-center gap-3 md:gap-4">
        <button className="flex items-center gap-1 text-xs text-text-secondary hover:text-foreground transition-colors">
          <Globe className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">EN</span>
        </button>

        {/* Notification Bell with Dropdown */}
        <div className="relative" ref={panelRef}>
          <button onClick={() => setShowNotifications(!showNotifications)}
            className="relative text-muted-foreground hover:text-foreground transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-3 h-3 rounded-full bg-destructive text-[8px] text-destructive-foreground flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <h3 className="text-sm font-bold text-heading">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-[10px] text-primary font-medium hover:underline">Mark all read</button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((n) => (
                    <div key={n.id} className={`p-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${!n.read ? "bg-primary/3" : ""}`}>
                      <div className="flex items-start gap-3">
                        <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.read ? "bg-primary" : "bg-transparent"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-heading">{n.title}</p>
                          <p className="text-[11px] text-text-secondary mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{n.time}</p>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${typeColors[n.type]}`}>
                          {n.type.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-border text-center">
                  <button className="text-xs font-medium text-primary hover:underline">View All Messages</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!loading && user && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary hidden sm:inline">
              {(user.fullName || user.username || "User").split(" ")[0]}
            </span>
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
              {(user.fullName || user.username || "U").charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
