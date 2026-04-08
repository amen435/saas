import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Bell } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { announcementService } from "@/services/announcementService";
import { classService } from "@/services/classService";
import DirectMessagingPanel from "@/components/messaging/DirectMessagingPanel";

export default function HomeroomMessages() {
  const [tab, setTab] = useState("messages");
  const [announcementDialog, setAnnouncementDialog] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    message: "",
    audienceType: "CLASS",
    classId: "",
    expiryDate: "",
  });
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: announcementRes = {}, isLoading: announcementsLoading } = useQuery({
    queryKey: ["announcements", "homeroom"],
    queryFn: () => announcementService.getAll(),
  });
  const announcements = useMemo(() => {
    return Array.isArray(announcementRes)
      ? announcementRes
      : (Array.isArray(announcementRes?.data) ? announcementRes.data : []);
  }, [announcementRes]);

  const { data: myClassesRes = {} } = useQuery({
    queryKey: ["homeroomClassesAnnouncement"],
    queryFn: () => classService.getMyClasses(),
  });
  const myClasses = useMemo(() => {
    const payload = myClassesRes?.data || myClassesRes || {};
    const arr = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
    return arr.map((c) => ({ id: c.classId, name: c.className || `Class ${c.classId}`, isHomeroom: !!c.isHomeroom }));
  }, [myClassesRes]);
  const homeroomClass = myClasses.find((c) => c.isHomeroom) || myClasses[0] || null;
  useEffect(() => {
    if (homeroomClass?.id && !announcementForm.classId) {
      setAnnouncementForm((prev) => ({ ...prev, classId: String(homeroomClass.id), audienceType: "CLASS" }));
    }
  }, [homeroomClass?.id, announcementForm.classId]);

  const createMutation = useMutation({
    mutationFn: (payload) => announcementService.create(payload),
    onSuccess: () => {
      toast.success("Announcement sent to all parents");
      setAnnouncementDialog(false);
      setAnnouncementForm({
        title: "",
        message: "",
        audienceType: "CLASS",
        classId: homeroomClass?.id ? String(homeroomClass.id) : "",
        expiryDate: "",
      });
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e) => toast.error(e?.response?.data?.error || e.message || "Failed to publish"),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => announcementService.update(id, payload),
    onSuccess: () => {
      toast.success("Announcement updated");
      setAnnouncementDialog(false);
      setEditingAnnouncement(null);
      setAnnouncementForm({
        title: "",
        message: "",
        audienceType: "CLASS",
        classId: homeroomClass?.id ? String(homeroomClass.id) : "",
        expiryDate: "",
      });
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e) => toast.error(e?.response?.data?.error || e.message || "Failed to update"),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => announcementService.delete(id),
    onSuccess: () => {
      toast.success("Announcement deleted");
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e) => toast.error(e?.response?.data?.error || e.message || "Failed to delete"),
  });

  const handleAnnouncement = () => {
    if (!announcementForm.title || !announcementForm.message) { toast.error("Title and message are required"); return; }
    const payload = {
      title: announcementForm.title,
      message: announcementForm.message,
      targetRole: "ALL",
      audienceType: "CLASS",
      classId: Number(announcementForm.classId || homeroomClass?.id),
      expiryDate: announcementForm.expiryDate || null,
    };
    if (editingAnnouncement) updateMutation.mutate({ id: editingAnnouncement.announcementId, payload });
    else createMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading">Parent Communication</h1>
          <p className="text-sm text-muted-foreground mt-1">Message parents and send class announcements</p>
        </div>
        <Button onClick={() => setAnnouncementDialog(true)} className="gradient-primary text-primary-foreground gap-2"><Bell className="w-4 h-4" /> Send Announcement</Button>
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
          emptyHint="No conversations yet. Parents linked to your homeroom class appear in the list below."
          newRecipientLabel="Message a parent"
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
                {String(a.createdBy) === String(user?.userId) && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingAnnouncement(a);
                        setAnnouncementDialog(true);
                        setAnnouncementForm({
                          title: a.title,
                          message: a.message,
                          audienceType: "CLASS",
                          classId: String(a.classId || homeroomClass?.id || ""),
                        });
                      }}
                      className="text-[11px] text-primary"
                    >
                      Edit
                    </button>
                    <button onClick={() => deleteMutation.mutate(a.announcementId)} className="text-[11px] text-destructive">Delete</button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Announcement Dialog */}
      <Dialog open={announcementDialog} onOpenChange={setAnnouncementDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Announcement</DialogTitle>
            <DialogDescription>This will be sent to all parents in your class.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Title *</Label><Input value={announcementForm.title} onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })} placeholder="Announcement title" /></div>
            <div><Label>Class</Label>
              <Input value={homeroomClass?.name || "No homeroom class"} disabled />
            </div>
            <div><Label>Message *</Label>
              <textarea value={announcementForm.message} onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                placeholder="Write your announcement..." rows={3} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none" />
            </div>
            <div><Label>Expiry date (optional)</Label>
              <Input
                type="date"
                value={announcementForm.expiryDate}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, expiryDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnnouncementDialog(false)}>Cancel</Button>
            <Button onClick={handleAnnouncement} className="gradient-primary text-primary-foreground">{editingAnnouncement ? "Update" : "Send to All Parents"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
