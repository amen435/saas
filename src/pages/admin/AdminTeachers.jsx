import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { GraduationCap, Plus, Search, Edit2, Trash2, X, Save, Phone, Mail, Eye } from "lucide-react";
import { toast } from "sonner";
import { useTeachers } from "@/hooks/useTeachers";
import { teacherService } from "@/services/teacherService";
import { PageSkeleton } from "@/components/shared/LoadingStates";
import { useAuth } from "@/contexts/AuthContext";

const emptyTeacher = { name: "", userId: "", username: "", subject: "", phone: "", email: "", password: "", status: "Active", classes: [], joinDate: "" };
const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

function mapApiTeacherToDisplay(t) {
  return {
    id: t.teacherId,
    teacherId: t.teacherId,
    name: t?.user?.fullName || "—",
    userId: t?.user?.userId || t?.user?.username || "—",
    username: t?.user?.username || "",
    subject: t?.specialization || "—",
    phone: t?.user?.phone || "—",
    email: t?.user?.email || "—",
    status: t?.isActive ? "Active" : "Inactive",
    classes: [],
    joinDate: t?.createdAt ? new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—",
    raw: t,
  };
}

export default function AdminTeachers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: teachersRaw = [], isLoading, error, refetch } = useTeachers({ isActive: true });
  const teachers = teachersRaw.map(mapApiTeacherToDisplay);

  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyTeacher);
  const [filterStatus, setFilterStatus] = useState("All");
  const [deletingId, setDeletingId] = useState(null);

  const createMutation = useMutation({
    mutationFn: (data) => teacherService.createTeacher(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast.success(res?.message || "Teacher added successfully!");
      setModal(null);
      refetch();
    },
    onError: (err) => {
      console.error("Failed to add teacher", err);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => teacherService.updateTeacher(id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast.success(res?.message || "Teacher updated successfully!");
      setModal(null);
      refetch();
    },
    onError: (err) => {
      console.error("Failed to update teacher", err);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => teacherService.deleteTeacher(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast.success(res?.message || "Teacher removed successfully!");
      refetch();
    },
    onError: (err) => {
      console.error("Failed to remove teacher", err);
    },
  });

  const saving = createMutation.isPending || updateMutation.isPending;

  const filtered = teachers.filter((t) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) || (t.subject && t.subject.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = filterStatus === "All" || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openAdd = () => { setForm({ ...emptyTeacher }); setModal("add"); };
  const openEdit = (t) => { setForm({ ...t }); setSelected(t); setModal("edit"); };
  const openView = (t) => { setSelected(t); setModal("view"); };

  const handleSave = () => {
    if (!form.name || !form.userId || !form.username) {
      toast.error("Full Name, User ID, and Username are required.");
      return;
    }
    if (modal === "add" && (!form.password || form.password.length < 8)) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    const payload = {
      userId: form.userId,
      username: form.username,
      fullName: form.name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      specialization: form.subject || undefined,
      password: modal === "add" ? form.password : undefined,
      role: "TEACHER",
      schoolId: user?.schoolId,
      isActive: form.status === "Active",
    };
    if (modal === "add") {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate({ id: selected.id, data: payload });
    }
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to remove this teacher?")) {
      setDeletingId(id);
      deleteMutation.mutate(id, {
        onSettled: () => setDeletingId(null),
      });
    }
  };

  if (isLoading) {
    return <PageSkeleton hasStats tableRows={8} />;
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        Failed to load teachers. <button onClick={() => refetch()} className="underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" /> Teachers Management
          </h1>
          <p className="text-sm text-text-secondary">Manage all teachers in your school</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          <Plus className="w-4 h-4" /> Add Teacher
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Teachers", value: teachers.length },
          { label: "Active", value: teachers.filter((t) => t.status === "Active").length },
          { label: "Inactive", value: teachers.filter((t) => t.status !== "Active").length },
          { label: "Subjects", value: [...new Set(teachers.map((t) => t.subject).filter(Boolean))].length },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4">
            <p className="text-xl font-bold text-heading">{s.value}</p>
            <p className="text-[10px] text-text-secondary">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or subject..." className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-card text-heading outline-none focus:border-primary" />
          </div>
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 text-sm rounded-lg border border-border bg-card text-heading outline-none">
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      <p className="text-xs text-text-secondary">{filtered.length} teacher{filtered.length !== 1 ? "s" : ""} found</p>

      <motion.div {...anim} className="hidden md:block bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-heading text-left">Teacher</th>
              <th className="px-4 py-3 text-xs font-semibold text-heading text-left">User ID</th>
              <th className="px-4 py-3 text-xs font-semibold text-heading text-left">Subject</th>
              <th className="px-4 py-3 text-xs font-semibold text-heading text-left">Contact</th>
              <th className="px-4 py-3 text-xs font-semibold text-heading text-center">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-heading text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-t border-border hover:bg-muted/20">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-heading">{t.name}</p>
                  <p className="text-[10px] text-text-secondary">Joined {t.joinDate}</p>
                </td>
                <td className="px-4 py-3 text-sm text-heading font-mono">{t.userId}</td>
                <td className="px-4 py-3 text-sm text-heading">{t.subject}</td>
                <td className="px-4 py-3">
                  <p className="text-xs text-heading">{t.phone}</p>
                  <p className="text-[10px] text-text-secondary">{t.email}</p>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 text-[10px] font-semibold rounded-full ${t.status === "Active" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{t.status}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => openView(t)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary"><Eye className="w-3.5 h-3.5" /></button>
                    <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      disabled={deletingId === t.id}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      <div className="md:hidden space-y-3">
        {filtered.map((t) => (
          <motion.div key={t.id} {...anim} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-heading">{t.name}</p>
              <span className={`px-2 py-1 text-[10px] font-semibold rounded-full ${t.status === "Active" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{t.status}</span>
            </div>
            <p className="text-xs text-text-secondary">{t.subject} · {t.userId}</p>
            <p className="text-[10px] text-text-secondary mt-1">{t.phone} {t.email}</p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => openView(t)} className="flex-1 py-2 rounded-lg bg-muted text-xs font-medium">View</button>
              <button onClick={() => openEdit(t)} className="flex-1 py-2 rounded-lg gradient-primary text-primary-foreground text-xs font-medium">Edit</button>
              <button
                onClick={() => handleDelete(t.id)}
                disabled={deletingId === t.id}
                className="py-2 px-3 rounded-lg bg-destructive/10 text-destructive text-xs font-medium disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {(modal === "view" || modal === "edit" || modal === "add") && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-xl border border-border p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-heading">{modal === "view" ? "Teacher Details" : modal === "add" ? "Add Teacher" : "Edit Teacher"}</h3>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            {modal === "view" && selected ? (
              <div className="space-y-4">
                <p className="text-lg font-bold text-heading">{selected.name}</p>
                <p className="text-sm text-text-secondary">{selected.subject} · {selected.userId}</p>
                <div className="space-y-2">
                  <p className="text-xs text-heading flex items-center gap-2"><Phone className="w-4 h-4" />{selected.phone}</p>
                  <p className="text-xs text-heading flex items-center gap-2"><Mail className="w-4 h-4" />{selected.email}</p>
                </div>
                <p className="text-xs text-text-secondary">Joined {selected.joinDate}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div><label className="text-[11px] font-medium text-text-secondary">Full Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-heading outline-none focus:border-primary mt-1" /></div>
                <div><label className="text-[11px] font-medium text-text-secondary">User ID *</label><input value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} placeholder="e.g. TCH-1001" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-heading outline-none focus:border-primary mt-1" /></div>
                <div><label className="text-[11px] font-medium text-text-secondary">Username *</label><input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="e.g. john.doe" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-heading outline-none focus:border-primary mt-1" /></div>
                {modal === "add" && <div><label className="text-[11px] font-medium text-text-secondary">Password *</label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-heading outline-none focus:border-primary mt-1" /></div>}
                <div><label className="text-[11px] font-medium text-text-secondary">Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-heading outline-none focus:border-primary mt-1" /></div>
                <div><label className="text-[11px] font-medium text-text-secondary">Email</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-heading outline-none focus:border-primary mt-1" /></div>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name || !form.userId || !form.username || (modal === "add" && !form.password)}
                  className="w-full py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                >
                  <Save className="w-4 h-4 inline mr-1.5" />{" "}
                  {saving ? "Saving..." : modal === "add" ? "Add" : "Update"} Teacher
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
