import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Plus, Search, Edit2, Trash2, X, Eye, 
  User, Phone, Mail, GraduationCap, MapPin, 
  Calendar, CheckCircle2, AlertCircle, Filter, 
  ChevronRight, MoreVertical, ShieldCheck
} from "lucide-react";
import { useAdminStudents, useHomeroomAllStudents } from "@/hooks/useStudents";
import { PageSkeleton } from "@/components/shared/LoadingStates";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { studentService } from "@/services/studentService";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const anim = {
  container: {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  },
  item: {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }
};

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

const EmptyState = ({ isSearch }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center justify-center py-20 px-4 text-center bg-card/50 rounded-3xl border border-dashed border-border"
  >
    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
      {isSearch ? <Search className="w-10 h-10 text-primary/40" /> : <Users className="w-10 h-10 text-primary/40" />}
    </div>
    <h3 className="text-xl font-bold text-heading mb-2">
      {isSearch ? "No students match your search" : "No students in your class yet"}
    </h3>
    <p className="text-text-secondary max-w-sm">
      {isSearch 
        ? "Try adjusting your search terms or filters to find what you're looking for." 
        : "Once students are enrolled in your class, they will appear here with all their details."}
    </p>
  </motion.div>
);

export default function StudentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeRole, user } = useAuth();
  
  const isAdmin = ["SCHOOL_ADMIN", "SUPER_ADMIN"].includes(activeRole || user?.role);
  const isHomeroom = ["HOMEROOM_TEACHER", "TEACHER"].includes(activeRole || user?.role);

  // Use appropriate hook based on role
  const adminQuery = useAdminStudents({ isActive: true });
  const homeroomQuery = useHomeroomAllStudents({ isActive: true });
  
  const { data: studentsRaw = [], isLoading, error, refetch } = isAdmin ? adminQuery : homeroomQuery;
  
  const students = useMemo(() => studentsRaw.map(mapApiStudentToDisplay), [studentsRaw]);

  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const deleteMutation = useMutation({
    mutationFn: (id) => studentService.deleteAdminStudent(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      toast.success(res?.message || "Student removed successfully!");
      refetch();
    },
    onError: (err) => {
      console.error("Failed to remove student", err);
    },
  });

  const filtered = students.filter((s) => {
    const term = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) || 
      s.parent.toLowerCase().includes(term) ||
      s.grade.toLowerCase().includes(term) ||
      String(s.studentId).includes(term)
    );
  });

  const openAdd = () => navigate('/admin/students/add');
  const openView = (s) => { setSelected(s); setModal("view"); };
  const openEdit = (s) => { 
    if (!isAdmin) return;
    // For now, let's just keep the toast if someone hacks the UI, but we won't show the button
    navigate(`/admin/students/edit/${s.id}`); 
  };

  const handleDelete = (id) => {
    if (!isAdmin) return;
    if (confirm("Are you sure you want to remove this student? This action cannot be undone.")) {
      setDeletingId(id);
      deleteMutation.mutate(id, {
        onSettled: () => setDeletingId(null),
      });
    }
  };

  if (isLoading) {
    return <PageSkeleton hasStats tableRows={6} />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold text-heading mb-2">Failed to load students</h2>
        <p className="text-text-secondary mb-6">There was an error fetching the student list.</p>
        <Button onClick={() => refetch()} variant="outline">Retry Loading</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-card rounded-[2rem] border border-border p-8 md:p-12">
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
              <GraduationCap className="w-3.5 h-3.5" />
              {isHomeroom ? "Your Class Students" : "Student Management"}
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-heading tracking-tight">
              {isHomeroom ? "Class Roster" : "School Students"}
            </h1>
            <p className="text-text-secondary text-lg max-w-md">
              {isHomeroom 
                ? "View and manage all students currently enrolled in your homeroom class."
                : "Manage enrollment, student profiles, and class assignments across the school."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-72 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary group-focus-within:text-primary transition-colors" />
              <Input 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="Search by name, grade..." 
                className="pl-11 h-12 rounded-2xl border-border bg-background focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
              />
            </div>
            {isAdmin && (
              <Button onClick={openAdd} className="h-12 px-6 rounded-2xl gradient-primary text-primary-foreground font-bold shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all w-full sm:w-auto">
                <Plus className="w-5 h-5 mr-2" /> Add Student
              </Button>
            )}
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-0" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-64 h-64 bg-secondary/5 rounded-full blur-3xl -z-0" />
      </section>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Students", value: students.length, icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Active", value: students.filter(s => s.status === "Active").length, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
          { label: "Classes Represented", value: new Set(students.map(s => s.grade)).size, icon: GraduationCap, color: "text-violet-500", bg: "bg-violet-50" },
          { label: "Male / Female", value: `${students.filter(s => s.gender === "Male").length} / ${students.filter(s => s.gender === "Female").length}`, icon: User, color: "text-orange-500", bg: "bg-orange-50" },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4"
          >
            <div className={`w-12 h-12 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-heading leading-none mb-1">{stat.value}</p>
              <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Student List Grid */}
      <AnimatePresence mode="wait">
        {filtered.length > 0 ? (
          <motion.div 
            variants={anim.container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {filtered.map((s) => (
              <motion.div 
                key={s.id}
                variants={anim.item}
                layout
                className="group relative bg-card rounded-3xl border border-border p-5 hover:shadow-card-hover hover:border-primary/20 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-primary text-xl font-black">
                        {s.name.charAt(0)}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-card flex items-center justify-center ${s.status === "Active" ? "bg-emerald-500" : "bg-amber-500"}`}>
                        {s.status === "Active" ? <CheckCircle2 className="w-3 h-3 text-white" /> : <AlertCircle className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-heading group-hover:text-primary transition-colors leading-tight">{s.name}</h3>
                      <p className="text-xs text-text-secondary font-medium mt-0.5">ID: {s.studentId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openView(s)} className="p-2 rounded-xl hover:bg-primary/10 text-primary transition-colors" title="View Details">
                      <Eye className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <>
                        <button onClick={() => openEdit(s)} className="p-2 rounded-xl hover:bg-primary/10 text-primary transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="p-2 rounded-xl hover:bg-destructive/10 text-destructive transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-2.5 rounded-2xl bg-muted/30 border border-border/50">
                    <p className="text-[10px] text-text-secondary font-bold uppercase tracking-tighter mb-1 flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" /> Grade
                    </p>
                    <p className="text-xs font-bold text-heading">{s.grade}</p>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-muted/30 border border-border/50">
                    <p className="text-[10px] text-text-secondary font-bold uppercase tracking-tighter mb-1 flex items-center gap-1">
                      <User className="w-3 h-3" /> Gender
                    </p>
                    <p className="text-xs font-bold text-heading">{s.gender}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-6 h-6 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-text-secondary">Parent:</span>
                    <span className="font-semibold text-heading truncate">{s.parent}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-6 h-6 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                      <Phone className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-text-secondary">Contact:</span>
                    <span className="font-semibold text-heading">{s.parentPhone}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-dashed border-border">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted text-[10px] font-bold text-text-secondary">
                    <Calendar className="w-3 h-3" /> Joined {s.enrollDate}
                  </div>
                  <button onClick={() => openView(s)} className="flex items-center gap-1 text-[11px] font-bold text-primary group-hover:translate-x-1 transition-transform">
                    Full Profile <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <EmptyState isSearch={search.length > 0} />
        )}
      </AnimatePresence>

      {/* Details Modal */}
      <AnimatePresence>
        {modal === "view" && selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setModal(null)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-card rounded-[2.5rem] border border-border p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setModal(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-muted hover:bg-muted-foreground/10 transition-colors"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>

              <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-10">
                <div className="w-32 h-32 rounded-[2rem] bg-gradient-to-br from-primary to-secondary p-1">
                  <div className="w-full h-full rounded-[1.8rem] bg-card flex items-center justify-center text-primary text-5xl font-black shadow-inner">
                    {selected.name.charAt(0)}
                  </div>
                </div>
                <div className="text-center md:text-left space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {selected.status} Student
                  </div>
                  <h2 className="text-3xl font-black text-heading tracking-tight">{selected.name}</h2>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-text-secondary">
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-primary" /> {selected.grade}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <User className="w-4 h-4 text-primary" /> {selected.gender}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-primary" /> Since {selected.enrollDate}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-text-secondary uppercase tracking-widest px-1">Academic Info</h3>
                  <div className="bg-muted/40 rounded-3xl p-5 border border-border/50 space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-text-secondary">Student ID</span>
                      <span className="font-bold text-heading">{selected.studentId}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-text-secondary">Current Class</span>
                      <span className="font-bold text-heading">{selected.grade}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-text-secondary">Enrollment Date</span>
                      <span className="font-bold text-heading">{selected.enrollDate}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black text-text-secondary uppercase tracking-widest px-1">Guardian Details</h3>
                  <div className="bg-muted/40 rounded-3xl p-5 border border-border/50 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center border border-border shadow-sm">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Full Name</p>
                        <p className="text-sm font-bold text-heading">{selected.parent}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center border border-border shadow-sm">
                        <Phone className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Phone Number</p>
                        <p className="text-sm font-bold text-heading">{selected.parentPhone}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="mt-10 pt-6 border-t border-dashed border-border flex flex-wrap gap-3">
                  <Button onClick={() => { setModal(null); openEdit(selected); }} className="flex-1 rounded-2xl h-12 font-bold gap-2">
                    <Edit2 className="w-4 h-4" /> Edit Profile
                  </Button>
                  <Button onClick={() => handleDelete(selected.id)} variant="destructive" className="flex-1 rounded-2xl h-12 font-bold gap-2 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white border-none shadow-none transition-all">
                    <Trash2 className="w-4 h-4" /> Deactivate
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
