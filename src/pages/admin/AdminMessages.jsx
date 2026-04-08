import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MessageSquare, Bell, GraduationCap, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { announcementService } from "@/services/announcementService";
import { classService } from "@/services/classService";
import DirectMessagingPanel from "@/components/messaging/DirectMessagingPanel";
import { messageService, unwrapList } from "@/services/messageService";

export default function AdminMessages() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("messages");
  const [announcementDialog, setAnnouncementDialog] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    message: "",
    audienceType: "SCHOOL",
    classId: "",
    targetRole: "ALL",
    expiryDate: "",
  });
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);

  const { data: announcementRes = {}, isLoading: announcementsLoading } = useQuery({
    queryKey: ["announcements", "admin"],
    queryFn: () => announcementService.getAll({ adminView: "true" }),
  });
  const announcements = useMemo(() => {
    return Array.isArray(announcementRes)
      ? announcementRes
      : (Array.isArray(announcementRes?.data) ? announcementRes.data : []);
  }, [announcementRes]);

  const { data: convRes } = useQuery({
    queryKey: ["adminMessageConversations"],
    queryFn: () => messageService.getConversations(),
  });
  const { data: unreadRes } = useQuery({
    queryKey: ["adminUnreadMessages"],
    queryFn: () => messageService.getUnreadCount(),
  });
  const conversationCount = unwrapList(convRes).length;
  const unreadTotal =
    unreadRes?.data?.unreadCount ??
    unreadRes?.unreadCount ??
    0;

  const { data: classesRes = [] } = useQuery({
    queryKey: ["announcementClassesAdmin"],
    queryFn: () => classService.getAll(),
  });
  const classOptions = useMemo(() => {
    const payload = classesRes?.data || classesRes || {};
    const arr = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
    return arr.map((c) => ({ id: c.classId ?? c.id, name: c.className || `Class ${c.classId ?? c.id}` }));
  }, [classesRes]);

  const createMutation = useMutation({
    mutationFn: (payload) => announcementService.create(payload),
    onSuccess: () => {
      toast.success("Announcement sent successfully");
      setAnnouncementDialog(false);
      setAnnouncementForm({ title: "", message: "", audienceType: "SCHOOL", classId: "", targetRole: "ALL", expiryDate: "" });
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e) => toast.error(e?.response?.data?.error || e.message || "Failed to create announcement"),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => announcementService.update(id, payload),
    onSuccess: () => {
      toast.success("Announcement updated");
      setAnnouncementDialog(false);
      setEditingAnnouncement(null);
      setAnnouncementForm({ title: "", message: "", audienceType: "SCHOOL", classId: "", targetRole: "ALL", expiryDate: "" });
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e) => toast.error(e?.response?.data?.error || e.message || "Failed to update announcement"),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => announcementService.delete(id),
    onSuccess: () => {
      toast.success("Announcement deleted");
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e) => toast.error(e?.response?.data?.error || e.message || "Failed to delete announcement"),
  });

  const handleAnnouncement = () => {
    if (!announcementForm.title || !announcementForm.message) { toast.error("Title and message are required"); return; }
    const payload = {
      title: announcementForm.title,
      message: announcementForm.message,
      targetRole: announcementForm.targetRole,
      audienceType: announcementForm.audienceType,
      classId: announcementForm.audienceType === "CLASS" ? Number(announcementForm.classId) : null,
      expiryDate: announcementForm.expiryDate || null,
    };
    if (editingAnnouncement) updateMutation.mutate({ id: editingAnnouncement.announcementId, payload });
    else createMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading">Messages</h1>
          <p className="text-sm text-muted-foreground mt-1">Communicate with teachers and parents</p>
        </div>
        <div className="flex gap-2">
          {unreadTotal > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-semibold">
              {unreadTotal} unread
            </span>
          )}
          <Button onClick={() => setAnnouncementDialog(true)} className="gradient-primary text-primary-foreground gap-2">
            <Bell className="w-4 h-4" /> School Announcement
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active threads", value: conversationCount, icon: MessageSquare },
          { label: "Unread", value: unreadTotal, icon: Bell },
          { label: "Announcements", value: announcements.length, icon: GraduationCap },
          { label: "Classes", value: classOptions.length, icon: Users },
        ].map((s, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <s.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-heading">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1">
        {["messages", "announcements"].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${tab === t ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>
            {t === "messages" ? "Messages" : "Announcements"}
          </button>
        ))}
      </div>

      {tab === "messages" ? (
        <DirectMessagingPanel
          emptyHint="No conversations yet. Use the dropdown to message any teacher or parent in your school."
          newRecipientLabel="Message someone"
        />
      ) : (
        <div className="space-y-3">
          {announcementsLoading ? (
            <p className="text-sm text-muted-foreground">Loading announcements...</p>
          ) : announcements.map((a) => (
            <motion.div key={a.announcementId} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-heading">{a.title}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">{a.targetRole}</span>
              </div>
              <p className="text-sm text-muted-foreground">{a.message}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-[10px] text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingAnnouncement(a);
                      setAnnouncementDialog(true);
                      setAnnouncementForm({
                        title: a.title,
                        message: a.message,
                        audienceType: a.audienceType || "SCHOOL",
                        classId: a.classId ? String(a.classId) : "",
                        targetRole: a.targetRole || "ALL",
                        expiryDate: a.expiryDate ? String(a.expiryDate).slice(0, 10) : "",
                      });
                    }}
                    className="text-[11px] text-primary"
                  >
                    Edit
                  </button>
                  <button onClick={() => deleteMutation.mutate(a.announcementId)} className="text-[11px] text-destructive">Delete</button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Announcement Dialog */}
      <Dialog open={announcementDialog} onOpenChange={setAnnouncementDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>School Announcement</DialogTitle>
            <DialogDescription>Send an announcement to teachers, parents, or everyone.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Title *</Label><Input value={announcementForm.title} onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })} placeholder="Announcement title" /></div>
            <div><Label>Audience Type</Label>
              <select value={announcementForm.audienceType} onChange={(e) => setAnnouncementForm({ ...announcementForm, audienceType: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm">
                <option value="SCHOOL">School</option>
                <option value="CLASS">Class</option>
              </select>
            </div>
            <div><Label>Send to (one role or all)</Label>
              <select value={announcementForm.targetRole} onChange={(e) => setAnnouncementForm({ ...announcementForm, targetRole: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm">
                <option value="ALL">All users in school</option>
                <option value="TEACHERS">Teachers only</option>
                <option value="STUDENTS">Students only</option>
                <option value="PARENTS">Parents only</option>
              </select>
            </div>
            <div><Label>Expiry date (optional)</Label>
              <Input type="date" value={announcementForm.expiryDate} onChange={(e) => setAnnouncementForm({ ...announcementForm, expiryDate: e.target.value })} />
            </div>
            {announcementForm.audienceType === "CLASS" && (
              <div><Label>Class</Label>
                <select value={announcementForm.classId} onChange={(e) => setAnnouncementForm({ ...announcementForm, classId: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm">
                  <option value="">Select class</option>
                  {classOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div><Label>Message *</Label>
              <textarea value={announcementForm.message} onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                placeholder="Write your announcement..." rows={3} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnnouncementDialog(false)}>Cancel</Button>
            <Button onClick={handleAnnouncement} className="gradient-primary text-primary-foreground">{editingAnnouncement ? "Update Announcement" : "Send Announcement"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
