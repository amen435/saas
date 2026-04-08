import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Megaphone, Plus, Edit, Trash2, Send, CheckCircle, AlertTriangle, X, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { announcementService } from "@/services/announcementService";
import { classService } from "@/services/classService";
import { schoolService } from "@/services/schoolService";

const typeConfig = {
  ALL: { icon: Megaphone, color: "bg-primary/10 text-primary", label: "All" },
  TEACHERS: { icon: Megaphone, color: "bg-info/10 text-info", label: "Teachers" },
  STUDENTS: { icon: Megaphone, color: "bg-success/10 text-success", label: "Students" },
  PARENTS: { icon: Megaphone, color: "bg-warning/10 text-warning", label: "Parents" },
  SCHOOL_ADMIN: { icon: Megaphone, color: "bg-muted text-foreground", label: "School admins" },
};

const emptyForm = {
  title: "",
  message: "",
  expiryDate: "",
  audienceType: "SCHOOL",
  classId: "",
  targetType: "ALL_SCHOOLS",
  schoolId: "",
  schoolIds: [],
  targetRole: "SCHOOL_ADMIN",
};

export default function GlobalAnnouncements() {
  const queryClient = useQueryClient();
  const { user, activeRole } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const role = String(activeRole || user?.role || "").toUpperCase();
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isSchoolAdmin = role === "SCHOOL_ADMIN";
  const isTeacher = role === "TEACHER" || role === "HOMEROOM_TEACHER";
  const canCreate = isSuperAdmin || isSchoolAdmin || isTeacher;

  const { data: announcementsRes = {}, isLoading } = useQuery({
    queryKey: ["announcements", role, user?.schoolId],
    queryFn: () =>
      announcementService.getAll({
        adminView: isSuperAdmin || isSchoolAdmin ? "true" : undefined,
        schoolId: isSuperAdmin ? user?.schoolId : undefined,
      }),
  });

  const announcements = useMemo(() => {
    return Array.isArray(announcementsRes)
      ? announcementsRes
      : (Array.isArray(announcementsRes?.data) ? announcementsRes.data : []);
  }, [announcementsRes]);
  // eslint-disable-next-line no-console
  console.log("user role:", role);
  // eslint-disable-next-line no-console
  console.log("announcements:", announcements);

  const { data: classesRes = [] } = useQuery({
    queryKey: ["announcementClassesSuperadmin", user?.schoolId],
    queryFn: () => classService.getAll(),
    enabled: !!user?.schoolId,
  });
  const classOptions = useMemo(() => {
    const payload = classesRes?.data || classesRes || {};
    const arr = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
    return arr.map((c) => ({ id: c.classId ?? c.id, name: c.className || `Class ${c.classId ?? c.id}` }));
  }, [classesRes]);

  const { data: schoolsRes = {} } = useQuery({
    queryKey: ["announcementSchools"],
    queryFn: () => schoolService.getAll({ isActive: true }),
    enabled: isSuperAdmin,
  });
  const schoolOptions = useMemo(() => {
    const payload = schoolsRes?.data ?? schoolsRes;
    const arr = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : []);
    return arr.map((s) => ({ id: s.schoolId, name: s.schoolName }));
  }, [schoolsRes]);

  const schoolIdsAsStrings = (ids) => (Array.isArray(ids) ? ids.map(String) : []);
  const toggleSchoolInSelection = (schoolId) => {
    const sid = String(schoolId);
    setForm((prev) => {
      const set = new Set(schoolIdsAsStrings(prev.schoolIds));
      if (set.has(sid)) set.delete(sid);
      else set.add(sid);
      return { ...prev, schoolIds: Array.from(set) };
    });
  };
  const selectAllSchools = () => {
    setForm((prev) => ({
      ...prev,
      schoolIds: schoolOptions.map((s) => String(s.id)),
    }));
  };
  const clearSchoolSelection = () => {
    setForm((prev) => ({ ...prev, schoolIds: [] }));
  };
  const removeSchoolChip = (schoolId) => {
    setForm((prev) => ({
      ...prev,
      schoolIds: schoolIdsAsStrings(prev.schoolIds).filter((id) => id !== String(schoolId)),
    }));
  };

  const canEditItem = (item) => {
    if (isSuperAdmin || isSchoolAdmin) return true;
    if (isTeacher) return String(item?.createdBy) === String(user?.userId);
    return false;
  };

  const createMutation = useMutation({
    mutationFn: (payload) => announcementService.create(payload),
    onSuccess: () => {
      toast.success("Announcement created.");
      setDialogOpen(false);
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e) => toast.error(e?.response?.data?.message || e?.response?.data?.error || e.message || "Failed to create announcement"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => announcementService.update(id, payload),
    onSuccess: () => {
      toast.success("Announcement updated.");
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e) => toast.error(e?.response?.data?.error || e.message || "Failed to update announcement"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => announcementService.delete(id),
    onSuccess: () => {
      toast.success("Announcement deleted.");
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e) => toast.error(e?.response?.data?.error || e.message || "Failed to delete announcement"),
  });

  const openAdd = () => { setEditingItem(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (item) => {
    setEditingItem(item);
    setForm({
      title: item?.title || "",
      message: item?.message || "",
      expiryDate: item?.expiryDate ? String(item.expiryDate).slice(0, 10) : "",
      audienceType: item?.audienceType || "SCHOOL",
      classId: item?.classId ? String(item.classId) : "",
      targetType: "SINGLE_SCHOOL",
      schoolId: item?.schoolId ? String(item.schoolId) : "",
      schoolIds: [],
      targetRole: item?.targetRole || "SCHOOL_ADMIN",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.title || !form.message) { toast.error("Title and message are required."); return; }
    if (isSuperAdmin && !editingItem) {
      if (form.targetType === "SINGLE_SCHOOL" && !form.schoolId) {
        toast.error("Please select a school.");
        return;
      }
      if (form.targetType === "MULTI_SCHOOL" && form.schoolIds.length === 0) {
        toast.error("Please select at least one school.");
        return;
      }
    }
    const payload = {
      title: form.title,
      message: form.message,
      targetRole: isSuperAdmin ? form.targetRole : "ALL",
      expiryDate: form.expiryDate || null,
      audienceType: isSuperAdmin ? "SCHOOL" : form.audienceType,
      classId: !isSuperAdmin && form.audienceType === "CLASS" ? Number(form.classId) : null,
      targetType: isSuperAdmin ? form.targetType : "SINGLE_SCHOOL",
      schoolId: isSuperAdmin ? (form.schoolId ? Number(form.schoolId) : undefined) : undefined,
      schoolIds: isSuperAdmin ? form.schoolIds.map((id) => Number(id)) : undefined,
    };
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.announcementId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const deleteItem = (id) => deleteMutation.mutate(id);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Global Announcements</h1>
          <p className="text-sm text-muted-foreground mt-1">Send notices and updates to all schools on the platform.</p>
        </div>
        {canCreate && (
          <Button onClick={openAdd} className="gradient-primary text-primary-foreground gap-2"><Plus className="w-4 h-4" /> NEW ANNOUNCEMENT</Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: announcements.length, color: "text-success" },
          { label: "Active", value: announcements.filter((a) => a.isActive).length, color: "text-warning" },
          { label: "Expired", value: announcements.filter((a) => a.isExpired).length, color: "text-muted-foreground" },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading announcements...</div>
        ) : announcements.map((a, i) => {
          const tc = typeConfig[a.targetRole] || typeConfig.ALL;
          return (
            <motion.div key={a.announcementId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-card rounded-xl border border-border p-5 flex items-start gap-4">
              <div className={`w-10 h-10 rounded-lg ${tc.color} flex items-center justify-center flex-shrink-0`}><tc.icon className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-heading truncate">{a.title}</h3>
                  <span className={`text-[10px] font-bold ${a.isExpired ? "text-destructive" : "text-success"} flex items-center gap-1`}>
                    {a.isExpired ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                    {a.isExpired ? "EXPIRED" : "ACTIVE"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{a.message}</p>
                <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                  <span>📅 {new Date(a.createdAt).toLocaleDateString()}</span>
                  <span>🎯 {a.targetRole}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${tc.color}`}>{tc.label}</span>
                </div>
              </div>
              {canEditItem(a) && (
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-muted"><Edit className="w-4 h-4 text-muted-foreground" /></button>
                  <button onClick={() => deleteItem(a.announcementId)} className="p-1.5 rounded-lg hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-muted-foreground" /></button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Announcement" : "New Announcement"}</DialogTitle>
            <DialogDescription>Compose and publish an announcement.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Announcement title" /></div>
            <div><Label>Message *</Label><Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Write your message..." rows={4} /></div>
            <div><Label>Expiry Date</Label><Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></div>
            {isSuperAdmin && !editingItem && (
              <>
                <div><Label>Who receives this</Label>
                  <Select value={form.targetRole} onValueChange={(v) => setForm({ ...form, targetRole: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SCHOOL_ADMIN">School admins only</SelectItem>
                      <SelectItem value="ALL">Everyone in each school</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Target Type</Label>
                  <Select
                    value={form.targetType}
                    onValueChange={(v) => setForm({
                      ...form,
                      targetType: v,
                      schoolId: "",
                      schoolIds: [],
                    })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL_SCHOOLS">All Schools</SelectItem>
                      <SelectItem value="SINGLE_SCHOOL">Single School</SelectItem>
                      <SelectItem value="MULTI_SCHOOL">Selected Schools</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.targetType === "ALL_SCHOOLS" && (
                  <div className="flex gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                    <p>This announcement will be sent to every active school on the platform. Individual school selection is disabled.</p>
                  </div>
                )}
                {form.targetType === "SINGLE_SCHOOL" && (
                  <div><Label>Choose school</Label>
                    <Select value={form.schoolId} onValueChange={(v) => setForm({ ...form, schoolId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select a school" /></SelectTrigger>
                      <SelectContent>
                        {schoolOptions.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {form.targetType === "MULTI_SCHOOL" && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Label className="w-full sm:w-auto">Choose schools</Label>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={selectAllSchools} disabled={schoolOptions.length === 0}>
                          Select all schools
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={clearSchoolSelection}>
                          Clear selection
                        </Button>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Check the schools that should receive this announcement.</p>
                    <div className="max-h-44 overflow-y-auto rounded-lg border border-border bg-background p-2 space-y-1.5">
                      {schoolOptions.length === 0 ? (
                        <p className="text-xs text-muted-foreground px-2 py-3">No schools loaded. Ensure you can access GET /api/schools.</p>
                      ) : (
                        schoolOptions.map((s) => {
                          const checked = schoolIdsAsStrings(form.schoolIds).includes(String(s.id));
                          return (
                            <label
                              key={s.id}
                              className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-muted/60"
                            >
                              <input
                                type="checkbox"
                                className="rounded border-border"
                                checked={checked}
                                onChange={() => toggleSchoolInSelection(s.id)}
                              />
                              <span className="text-foreground">{s.name}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                    {schoolIdsAsStrings(form.schoolIds).length > 0 && (
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Selected ({form.schoolIds.length})</p>
                        <div className="flex flex-wrap gap-1.5">
                          {schoolIdsAsStrings(form.schoolIds).map((id) => {
                            const name = schoolOptions.find((o) => String(o.id) === id)?.name || `School ${id}`;
                            return (
                              <span
                                key={id}
                                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-heading"
                              >
                                {name}
                                <button
                                  type="button"
                                  className="rounded-full p-0.5 hover:bg-muted"
                                  onClick={() => removeSchoolChip(id)}
                                  aria-label={`Remove ${name}`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Audience Type</Label>
                <Select value={isSuperAdmin ? "SCHOOL" : form.audienceType} onValueChange={(v) => setForm({ ...form, audienceType: v })} disabled={isSuperAdmin}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SCHOOL">School</SelectItem>
                    <SelectItem value="CLASS">Class</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.audienceType === "CLASS" && (
                <div><Label>Class</Label>
                  <Select value={form.classId} onValueChange={(v) => setForm({ ...form, classId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {classOptions.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button onClick={handleSave} className="gradient-primary text-primary-foreground gap-1" disabled={createMutation.isPending || updateMutation.isPending}>
              <Send className="w-3.5 h-3.5" />{editingItem ? "Update" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
