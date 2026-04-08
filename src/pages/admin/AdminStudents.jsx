import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Users, Plus, Search, Edit2, Trash2, X, Save, Eye } from "lucide-react";
import AddStudentForm from "@/components/shared/AddStudentForm";
import { useAdminStudents } from "@/hooks/useStudents";
import { PageSkeleton } from "@/components/shared/LoadingStates";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { studentService } from "@/services/studentService";

const emptyStudent = { name: "", grade: "7-A", gender: "Male", parent: "", parentId: "", parentPhone: "", status: "Active", enrollDate: "" };
const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

function mapApiStudentToDisplay(s) {
  return {
    id: s.studentId,
    studentId: s.studentId,
    name: s?.user?.fullName || "—",
    grade: s?.class?.className || "—",
    gender: s?.gender || "—",
    parent: s?.guardianName || "—",
    parentId: s?.studentCode || "—",
    parentPhone: s?.guardianPhone || "—",
    status: s?.isActive ? "Active" : "Inactive",
    enrollDate: s?.enrollmentDate ? new Date(s.enrollmentDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—",
    raw: s,
  };
}

export default function AdminStudents() {
  const queryClient = useQueryClient();
  const { data: studentsRaw = [], isLoading, error, refetch } = useAdminStudents({ isActive: true });
  const students = useMemo(() => studentsRaw.map(mapApiStudentToDisplay), [studentsRaw]);

  const [search, setSearch] = useState("");
  const [filterGrade, setFilterGrade] = useState("All");
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyStudent);
  const [deletingId, setDeletingId] = useState(null);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => studentService.updateStudent(id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      toast.success(res?.message || "Student updated successfully!");
      setModal(null);
      refetch();
    },
    onError: (err) => {
      console.error("Failed to update student", err);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => studentService.deleteStudent(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      toast.success(res?.message || "Student removed successfully!");
      refetch();
    },
    onError: (err) => {
      console.error("Failed to remove student", err);
    },
  });

  const saving = updateMutation.isPending;

  const allGrades = useMemo(() => {
    const fromStudents = students.map((s) => s.grade).filter(Boolean);
    return [...new Set(fromStudents)].sort();
  }, [students]);

  const classCounts = useMemo(() => {
    const counts = {};
    allGrades.forEach((g) => { counts[g] = 0; });
    students.forEach((s) => { counts[s.grade] = (counts[s.grade] || 0) + 1; });
    return counts;
  }, [students, allGrades]);

  const filtered = students.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.parent.toLowerCase().includes(search.toLowerCase());
    const matchGrade = filterGrade === "All" || s.grade === filterGrade;
    return matchSearch && matchGrade;
  });

  const openAdd = () => { setForm(emptyStudent); setModal("add"); };
  const openEdit = (s) => { setForm({ ...s }); setSelected(s); setModal("edit"); };
  const openView = (s) => { setSelected(s); setModal("view"); };

  const handleSave = () => {
    if (!form.name || !form.grade) {
      toast.error("Name and grade are required.");
      return;
    }
    if (!selected) return;
    const payload = {
      fullName: form.name,
      guardianName: form.parent,
      guardianPhone: form.parentPhone,
    };
    updateMutation.mutate({ id: selected.id, data: payload });
  };

  const handleDelete = (id) => {
    if (confirm("Remove this student?")) {
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
        Failed to load students. <button onClick={() => refetch()} className="underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading flex items-center gap-2"><Users className="w-6 h-6 text-primary" /> Students Management</h1>
          <p className="text-sm text-text-secondary">Manage all students in your school</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90"><Plus className="w-4 h-4" /> Add Student</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Students", value: students.length },
          { label: "Male", value: students.filter((s) => s.gender === "Male").length },
          { label: "Female", value: students.filter((s) => s.gender === "Female").length },
          { label: "Active", value: students.filter((s) => s.status === "Active").length },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4">
            <p className="text-xl font-bold text-heading">{s.value}</p>
            <p className="text-[10px] text-text-secondary">{s.label}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Students Per Class</p>
        <div className="flex flex-wrap gap-2">
          {allGrades.map((g) => (
            <button
              key={g}
              onClick={() => setFilterGrade(filterGrade === g ? "All" : g)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${filterGrade === g ? "gradient-primary text-primary-foreground border-transparent" : "border-border bg-card text-heading hover:border-primary/30"}`}
            >
              {g} <span className="ml-1 opacity-70">({classCounts[g] || 0})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student or parent..." className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-card text-heading outline-none focus:border-primary" />
          </div>
        </div>
        <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} className="px-3 py-2 text-sm rounded-lg border border-border bg-card text-heading outline-none">
          <option value="All">All Grades</option>
          {allGrades.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      <p className="text-xs text-text-secondary">{filtered.length} student{filtered.length !== 1 ? "s" : ""} found</p>

      <motion.div {...anim} className="hidden md:block bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-heading text-left">Student</th>
              <th className="px-4 py-3 text-xs font-semibold text-heading text-center">Grade</th>
              <th className="px-4 py-3 text-xs font-semibold text-heading text-center">Gender</th>
              <th className="px-4 py-3 text-xs font-semibold text-heading text-left">Parent/Guardian</th>
              <th className="px-4 py-3 text-xs font-semibold text-heading text-center">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-heading text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-t border-border hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">{s.name.charAt(0)}</div>
                    <div>
                      <p className="text-xs font-medium text-heading">{s.name}</p>
                      <p className="text-[10px] text-text-secondary">Enrolled: {s.enrollDate}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 text-[10px] font-medium rounded bg-primary/10 text-primary">{s.grade}</span></td>
                <td className="px-4 py-3 text-center text-xs text-heading">{s.gender}</td>
                <td className="px-4 py-3">
                  <p className="text-xs text-heading">{s.parent}</p>
                  <p className="text-[10px] text-text-secondary">{s.parentPhone}</p>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 text-[10px] font-semibold rounded-full ${s.status === "Active" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{s.status}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => openView(s)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary"><Eye className="w-3.5 h-3.5" /></button>
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      disabled={deletingId === s.id}
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
        {filtered.map((s) => (
          <motion.div key={s.id} {...anim} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold">{s.name.charAt(0)}</div>
                <div>
                  <p className="text-sm font-semibold text-heading">{s.name}</p>
                  <p className="text-[10px] text-text-secondary">Grade {s.grade} · {s.gender}</p>
                </div>
              </div>
              <span className={`px-2 py-1 text-[10px] font-semibold rounded-full ${s.status === "Active" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{s.status}</span>
            </div>
            <div className="text-[11px] text-text-secondary mb-3">
              <p>Parent: {s.parent}</p>
              <p>Phone: {s.parentPhone}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openView(s)} className="flex-1 py-2 rounded-lg bg-muted text-xs font-medium text-heading">View</button>
              <button onClick={() => openEdit(s)} className="flex-1 py-2 rounded-lg gradient-primary text-primary-foreground text-xs font-medium">Edit</button>
              <button
                onClick={() => handleDelete(s.id)}
                disabled={deletingId === s.id}
                className="py-2 px-3 rounded-lg bg-destructive/10 text-destructive text-xs font-medium disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {modal === "add" && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <AddStudentForm
              onSuccess={() => { refetch(); setModal(null); }}
              onCancel={() => setModal(null)}
            />
          </div>
        </div>
      )}

      {(modal === "view" || modal === "edit") && selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-xl border border-border p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-heading">{modal === "view" ? "Student Details" : "Edit Student"}</h3>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            {modal === "view" ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xl font-bold">{selected.name.charAt(0)}</div>
                  <div>
                    <p className="text-lg font-bold text-heading">{selected.name}</p>
                    <p className="text-sm text-text-secondary">Grade {selected.grade}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-[10px] text-text-secondary uppercase">Gender</p><p className="text-sm text-heading">{selected.gender}</p></div>
                  <div><p className="text-[10px] text-text-secondary uppercase">Status</p><p className="text-sm text-heading">{selected.status}</p></div>
                  <div><p className="text-[10px] text-text-secondary uppercase">Enrolled</p><p className="text-sm text-heading">{selected.enrollDate}</p></div>
                </div>
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-semibold text-heading mb-2">Parent / Guardian</p>
                  <p className="text-sm text-heading">{selected.parent}</p>
                  <p className="text-[10px] text-text-secondary">{selected.parentPhone}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div><label className="text-[11px] font-medium text-text-secondary">Full Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-heading outline-none focus:border-primary mt-1" /></div>
                <div><label className="text-[11px] font-medium text-text-secondary">Parent Name</label><input value={form.parent} onChange={(e) => setForm({ ...form, parent: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-heading outline-none focus:border-primary mt-1" /></div>
                <div><label className="text-[11px] font-medium text-text-secondary">Phone</label><input value={form.parentPhone} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-heading outline-none focus:border-primary mt-1" /></div>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name}
                  className="w-full py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                >
                  <Save className="w-4 h-4 inline mr-1.5" /> {saving ? "Saving..." : "Update Student"}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
