import { useState, useMemo, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Plus, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { subjectService } from "@/services/subjectService";
import SubjectStats from "@/components/admin/subjects/subjectStats";
import SubjectTable from "@/components/admin/subjects/SubjectTable";
import SubjectForm from "@/components/admin/subjects/SubjectForm";
import SubjectView from "@/components/admin/subjects/SubjectView";
import AssignTeachers from "@/components/admin/subjects/AssignTeachers";
import DeleteConfirm from "@/components/admin/subjects/DeleteConfirm";

/* ─── Constants ─── */
const emptyForm = { name: "", code: "", description: "" };
const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };

export default function AdminSubjects() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin" || user?.role === "SCHOOL_ADMIN" || user?.role === "SUPER_ADMIN";

  const [subjects, setSubjects] = useState([]);
  const [teacherPool, setTeacherPool] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState(null); // "add" | "edit" | "view" | "assign" | null
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [assignSelection, setAssignSelection] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  /* ─── Load data from API ─── */
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [subjectData, teacherData] = await Promise.all([
          subjectService.list(),
          subjectService.fetchTeachers(),
        ]);
        setSubjects(subjectData ?? []);
        setTeacherPool(teacherData ?? []);
      } catch {
        setSubjects([]);
        setTeacherPool([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* ─── Filtering ─── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return subjects.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.code?.toLowerCase().includes(q) ||
      s.teachers?.some(t => t.name?.toLowerCase().includes(q))
    );
  }, [subjects, search]);

  /* ───  helpers ─── */
  const close = useCallback(() => { setMode(null); setSelected(null); setSaving(false); }, []);
  const openAdd = useCallback(() => { setForm(emptyForm); setMode("add"); }, []);
  const openEdit = useCallback((s) => { setForm({ name: s.name, code: s.code, description: s.description || "" }); setSelected(s); setMode("edit"); }, []);
  const openView = useCallback((s) => { setSelected(s); setMode("view"); }, []);
  const openAssign = useCallback((s) => { setSelected(s); setAssignSelection(s.teachers?.map(t => t.id) || []); setMode("assign"); }, []);

  /* ─── CRUD handlers ─── */
  const handleSave = useCallback(async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Subject Name and Code are required.");
      return;
    }
    setSaving(true);
    try {
      if (mode === "add") {
        const created = await subjectService.create(form);
        setSubjects(prev => [...prev, created]);
        toast.success(`${form.name} created successfully!`);
      } else if (mode === "edit" && selected) {
        const updated = await subjectService.update(selected.id, form);
        setSubjects(prev => prev.map(s => s.id === selected.id ? { ...s, ...updated } : s));
        toast.success(`${form.name} updated successfully!`);
      }
      close();
    } finally {
      setSaving(false);
    }
  }, [form, mode, selected, close]);

  const handleDelete = useCallback(async (id) => {
    await subjectService.remove(id);
    setSubjects(prev => prev.filter(s => s.id !== id));
    toast.success("Subject deleted.");
    setDeleteConfirm(null);
  }, []);

  const handleAssignSave = useCallback(async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const currentIds = (selected.teachers ?? []).map(t => t.id);
      const toAdd = assignSelection.filter(id => !currentIds.includes(id));
      const toRemove = currentIds.filter(id => !assignSelection.includes(id));
      for (const teacherId of toAdd) {
        await subjectService.assignTeacher(selected.id, teacherId);
      }
      for (const teacherId of toRemove) {
        await subjectService.removeTeacher(selected.id, teacherId);
      }
      const assigned = teacherPool.filter(t => assignSelection.includes(t.id));
      setSubjects(prev => prev.map(s => s.id === selected.id ? { ...s, teachers: assigned } : s));
      toast.success("Teachers updated!");
      close();
    } finally {
      setSaving(false);
    }
  }, [selected, assignSelection, teacherPool, close]);

  const toggleTeacher = useCallback((tid) => {
    setAssignSelection(prev => prev.includes(tid) ? prev.filter(id => id !== tid) : [...prev, tid]);
  }, []);

  const removeTeacherFromSubject = useCallback(async (subjectId, teacherId) => {
    await subjectService.removeTeacher(subjectId, teacherId);
    setSubjects(prev =>
      prev.map(s => s.id === subjectId ? { ...s, teachers: s.teachers.filter(t => t.id !== teacherId) } : s)
    );
    toast.success("Teacher removed from subject.");
  }, []);

  /* ─── Render ─── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <span className="ml-2 text-sm text-muted-foreground">Loading subjects…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" /> Subjects
          </h1>
          <p className="text-sm text-muted-foreground">Manage subjects, assign teachers, and track usage across classes</p>
        </div>
        {isAdmin && (
          <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> Add Subject
          </button>
        )}
      </div>

      <SubjectStats subjects={subjects} />

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, code, or teacher..."
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-card text-foreground outline-none focus:border-primary transition-colors"
        />
      </div>

      {subjects.length === 0 && (
        <motion.div {...anim} className="text-center py-16 bg-card rounded-xl border border-border">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No subjects yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Add your first subject to get started.</p>
          {isAdmin && (
            <button onClick={openAdd} className="px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90">
              <Plus className="w-4 h-4 inline mr-1.5" /> Add Subject
            </button>
          )}
        </motion.div>
      )}

      <SubjectTable subjects={filtered} isAdmin={isAdmin} onView={openView} onEdit={openEdit} onAssign={openAssign} onDelete={setDeleteConfirm} />

      {subjects.length > 0 && filtered.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">No subjects match your search.</p>
        </div>
      )}

      <AnimatePresence>
        {deleteConfirm && <DeleteConfirm onConfirm={() => handleDelete(deleteConfirm)} onCancel={() => setDeleteConfirm(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {(mode === "add" || mode === "edit") && (
          <SubjectForm mode={mode} form={form} setForm={setForm} onSave={handleSave} onClose={close} saving={saving} />
        )}
        {mode === "view" && (
          <SubjectView subject={selected} isAdmin={isAdmin} onRemoveTeacher={removeTeacherFromSubject} onClose={close} />
        )}
        {mode === "assign" && (
          <AssignTeachers subject={selected} teacherPool={teacherPool} selection={assignSelection} onToggle={toggleTeacher} onSave={handleAssignSave} onClose={close} saving={saving} />
        )}
      </AnimatePresence>
    </div>
  );
}
