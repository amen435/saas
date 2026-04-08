import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { School, Plus, Search, Edit2, Trash2, X, Save, Eye, Users, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { classService } from "@/services/classService";
import { useTeachers } from "@/hooks/useTeachers";
import { useAuth } from "@/contexts/AuthContext";
import { PageSkeleton, CardsSkeleton } from "@/components/shared/LoadingStates";

const subjectsList = ["Mathematics", "English", "Physics", "Chemistry", "Biology", "History", "Civics", "Amharic", "Geography", "P.E."];

function mapApiClassToDisplay(c) {
  const gradeLevel = c.gradeLevel ?? c.grade_level ?? null;
  const className = c.className ?? c.class_name ?? null;
  return {
    id: c.classId ?? c.id,
    className: className ?? "—",
    gradeLevel: gradeLevel ?? "",
    section: c.section ?? "—",
    capacity: c.capacity ?? 40,
    enrolled: c.enrolledCount ?? c.enrolled ?? 0,
    // Backend returns homeroomTeacher with nested user.fullName
    homeroom: c.homeroomTeacher?.user?.fullName ?? c.homeroom ?? "Unassigned",
    subjects: c.subjects ?? 8,
    subjectTeachers: c.subjectTeachers ?? {},
    academicYear: c.academicYear ?? c.academic_year ?? "",
  };
}

const emptyClass = {
  className: "",
  gradeLevel: "",
  academicYear: "",
  section: "",
  capacity: 40,
  enrolled: 0,
  homeroomTeacherId: "",
  subjects: 8,
  subjectTeachers: {},
  subjectCount: 8,
};
const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export default function AdminClasses() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: classesRaw = [], isLoading, error, refetch } = useQuery({
    queryKey: ["classes"],
    queryFn: () => classService.getAll(),
  });
  const { data: teachersRaw = [] } = useTeachers({ isActive: true });
  const teacherOptions = useMemo(() => {
    return (Array.isArray(teachersRaw) ? teachersRaw : [])
      .map((t) => ({
        id: String(t?.teacherId ?? t?.id ?? ""),
        name: t?.user?.fullName || t?.fullName || "—",
      }))
      .filter((t) => t.id && t.name);
  }, [teachersRaw]);
  const teachersList = useMemo(
    () => teacherOptions.map((t) => t.name),
    [teacherOptions]
  );

  const classes = (Array.isArray(classesRaw) ? classesRaw : []).map(mapApiClassToDisplay);

  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyClass);
  const [deletingId, setDeletingId] = useState(null);

  const createMutation = useMutation({
    mutationFn: (data) => classService.createClass(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast.success(res?.message || "Class created successfully!");
      setModal(null);
      setForm({ ...emptyClass, subjectTeachers: {} });
      refetch();
    },
    onError: (err) => {
      toast.error(err?.message || "Failed to create class");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => classService.updateClass(id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast.success(res?.message || "Class updated successfully!");
      setModal(null);
      refetch();
    },
    onError: (err) => {
      toast.error(err?.message || "Failed to update class");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => classService.deleteClass(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast.success(res?.message || "Class removed successfully!");
      refetch();
    },
    onError: (err) => {
      console.error("Failed to remove class", err);
    },
  });

  const saving = createMutation.isPending || updateMutation.isPending;

  const filtered = classes.filter((c) => {
    const q = search.toLowerCase();
    return (
      `${c.className} ${c.section}`.toLowerCase().includes(q) ||
      (c.homeroom && c.homeroom.toLowerCase().includes(q))
    );
  });

  const openAdd = () => {
    setForm({ ...emptyClass, subjectTeachers: {} });
    setModal("add");
  };
  const openEdit = (c) => {
    setForm({ ...c, subjectCount: c.subjects });
    setSelected(c);
    setModal("edit");
  };
  const openView = (c) => {
    setSelected(c);
    setModal("view");
  };

  const handleSave = () => {
    if (modal === "add") {
      const payload = {
        className: form.className.trim(),
        gradeLevel: String(form.gradeLevel).trim(),
        academicYear: form.academicYear.trim(),
        // Optional fields
        section: form.section?.trim() || undefined,
        capacity: form.capacity ?? undefined,
        homeroomTeacherId: form.homeroomTeacherId ? String(form.homeroomTeacherId) : undefined,
      };

      createMutation.mutate(payload);
      return;
    }

    if (!form.className?.trim()) {
      toast.error("Class Name is required.");
      return;
    }

    const payload = {
      className: form.className.trim(),
      capacity: form.capacity ?? undefined,
      homeroomTeacherId: form.homeroomTeacherId ? String(form.homeroomTeacherId) : undefined,
    };

    updateMutation.mutate({ id: selected.id, data: payload });
  };

  const handleDelete = (id) => {
    if (confirm("Remove this class?")) {
      setDeletingId(id);
      deleteMutation.mutate(id, {
        onSettled: () => setDeletingId(null),
      });
    }
  };

  const selectedSubjects = subjectsList.slice(0, form.subjectCount || 8);

  const totalEnrolled = classes.reduce((s, c) => s + c.enrolled, 0);
  const totalCapacity = classes.reduce((s, c) => s + c.capacity, 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-heading flex items-center gap-2">
              <School className="w-6 h-6 text-primary" /> Classes & Sections
            </h1>
            <p className="text-sm text-text-secondary">Loading classes...</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-4 h-24 animate-pulse" />
          ))}
        </div>
        <CardsSkeleton count={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        Failed to load classes. <button onClick={() => refetch()} className="underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading flex items-center gap-2"><School className="w-6 h-6 text-primary" /> Classes & Sections</h1>
          <p className="text-sm text-text-secondary">Manage classes, sections, and homeroom teachers</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90"><Plus className="w-4 h-4" /> Add Class</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Classes", value: classes.length, icon: School },
          { label: "Total Enrolled", value: totalEnrolled, icon: Users },
          { label: "Total Capacity", value: totalCapacity, icon: Users },
          { label: "Utilization", value: `${Math.round((totalEnrolled / totalCapacity) * 100)}%`, icon: GraduationCap },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4">
            <s.icon className="w-4 h-4 text-primary mb-2" />
            <p className="text-xl font-bold text-heading">{s.value}</p>
            <p className="text-[10px] text-text-secondary">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search class or homeroom..." className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-card text-heading outline-none focus:border-primary" />
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(c => {
          const utilPct = Math.round((c.enrolled / c.capacity) * 100);
          return (
            <motion.div key={c.id} {...anim} className="bg-card rounded-xl border border-border p-5 hover:border-primary/30 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-base font-bold text-heading">
                    {c.className} (Grade {c.gradeLevel}){c.section ? `-${c.section}` : ""}
                  </h3>
                  <p className="text-[10px] text-text-secondary">Homeroom: {c.homeroom || "Unassigned"}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openView(c)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary"><Eye className="w-3.5 h-3.5" /></button>
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center bg-muted/50 rounded-lg py-2">
                  <p className="text-sm font-bold text-heading">{c.enrolled}</p>
                  <p className="text-[9px] text-text-secondary">Enrolled</p>
                </div>
                <div className="text-center bg-muted/50 rounded-lg py-2">
                  <p className="text-sm font-bold text-heading">{c.capacity}</p>
                  <p className="text-[9px] text-text-secondary">Capacity</p>
                </div>
                <div className="text-center bg-muted/50 rounded-lg py-2">
                  <p className="text-sm font-bold text-heading">{c.subjects}</p>
                  <p className="text-[9px] text-text-secondary">Subjects</p>
                </div>
              </div>

              {/* Capacity bar */}
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-text-secondary">Capacity</span>
                  <span className={`font-semibold ${utilPct >= 95 ? "text-destructive" : utilPct >= 80 ? "text-warning" : "text-success"}`}>{utilPct}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${utilPct >= 95 ? "bg-destructive" : utilPct >= 80 ? "bg-warning" : "bg-success"}`} style={{ width: `${utilPct}%` }} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-xl border border-border p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-heading">{modal === "view" ? "Class Details" : modal === "add" ? "Add New Class" : "Edit Class"}</h3>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>

            {modal === "view" && selected ? (
              <div className="space-y-3">
                <h2 className="text-xl font-bold text-heading">
                  {selected.className} (Grade {selected.gradeLevel}){selected.section ? `-${selected.section}` : ""}
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-[10px] text-text-secondary uppercase">Homeroom</p><p className="text-sm text-heading">{selected.homeroom || "Unassigned"}</p></div>
                  <div><p className="text-[10px] text-text-secondary uppercase">Enrolled</p><p className="text-sm text-heading">{selected.enrolled}/{selected.capacity}</p></div>
                  <div><p className="text-[10px] text-text-secondary uppercase">Subjects</p><p className="text-sm text-heading">{selected.subjects}</p></div>
                  <div><p className="text-[10px] text-text-secondary uppercase">Utilization</p><p className="text-sm text-heading">{Math.round((selected.enrolled / selected.capacity) * 100)}%</p></div>
                </div>
                {selected.subjectTeachers && Object.keys(selected.subjectTeachers).length > 0 && (
                  <div>
                    <p className="text-[10px] text-text-secondary uppercase mb-2">Subject Teachers</p>
                    <div className="space-y-1">
                      {Object.entries(selected.subjectTeachers).map(([sub, teacher]) => (
                        <div key={sub} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{sub}</span>
                          <span className="text-heading font-medium">{teacher || "—"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-text-secondary">Class Name *</label>
                    <input value={form.className} onChange={e => setForm({ ...form, className: e.target.value })} placeholder="e.g. Grade 7" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-heading outline-none focus:border-primary mt-1" />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-text-secondary">Grade Level *</label>
                    <input type="number" min={1} value={form.gradeLevel} onChange={e => setForm({ ...form, gradeLevel: e.target.value })} placeholder="e.g. 7" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-heading outline-none focus:border-primary mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-text-secondary">Academic Year *</label>
                    <input value={form.academicYear} onChange={e => setForm({ ...form, academicYear: e.target.value })} placeholder="e.g. 2025/2026" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-heading outline-none focus:border-primary mt-1" />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-text-secondary">Section</label>
                    <input value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} placeholder="e.g. A" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-heading outline-none focus:border-primary mt-1" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-text-secondary">Homeroom Teacher</label>
                  <select value={form.homeroomTeacherId} onChange={e => setForm({ ...form, homeroomTeacherId: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-heading outline-none focus:border-primary mt-1">
                    <option value="">Select teacher...</option>
                    {teacherOptions.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-text-secondary">Capacity</label>
                    <input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-heading outline-none focus:border-primary mt-1" />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-text-secondary">Enrolled</label>
                    <input type="number" value={form.enrolled} onChange={e => setForm({ ...form, enrolled: Number(e.target.value) })} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-heading outline-none focus:border-primary mt-1" />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-text-secondary">No. of Subjects</label>
                    <input type="number" min={1} max={subjectsList.length} value={form.subjectCount} onChange={e => setForm({ ...form, subjectCount: Number(e.target.value) })} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-heading outline-none focus:border-primary mt-1" />
                  </div>
                </div>

                {/* Subject-Teacher Assignment */}
                <div>
                  <label className="text-[11px] font-medium text-text-secondary">Assign Teachers to Subjects</label>
                  <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                    {selectedSubjects.map(sub => (
                      <div key={sub} className="flex items-center gap-2">
                        <span className="text-xs text-heading w-24 shrink-0">{sub}</span>
                        <select
                          value={form.subjectTeachers?.[sub] || ""}
                          onChange={e => setForm({ ...form, subjectTeachers: { ...form.subjectTeachers, [sub]: e.target.value } })}
                          className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-border bg-background text-heading outline-none focus:border-primary"
                        >
                          <option value="">Select teacher...</option>
                          {teachersList.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  disabled={
                    saving ||
                    (modal === "add"
                      ? !form.className || String(form.gradeLevel).trim() === "" || !form.academicYear
                      : !form.className)
                  }
                  className="w-full py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                >
                  <Save className="w-4 h-4 inline mr-1.5" />{" "}
                  {saving ? "Saving..." : modal === "add" ? "Add Class" : "Update Class"}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
