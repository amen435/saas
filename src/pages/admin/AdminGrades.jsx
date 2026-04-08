import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BarChart3, Download, Save, Search, Plus, Edit2, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { gradeService } from "@/services/gradeService";
import { classService } from "@/services/classService";
import { PageSkeleton } from "@/components/shared/LoadingStates";

const subjectsList = ["Mathematics", "English", "Physics", "Chemistry", "Biology", "History", "Civics", "Amharic"];
const examTypes = ["Midterm", "Final", "Quiz", "Assignment", "Lab Report"];

function mapClassReportToStudents(report, classId) {
  if (!report?.students && !report?.length && !Array.isArray(report)) return [];
  const list = report.students ?? report;
  return (Array.isArray(list) ? list : []).map((s) => ({
    id: s.studentId ?? s.id,
    name: s.fullName ?? s.name ?? "—",
    grades: (s.grades ?? s.subjects ?? []).map((g) => ({
      subject: g.subjectName ?? g.subject ?? "—",
      exams: (g.exams ?? g.scores ?? g.components ?? []).map((e) => ({
        type: e.examType ?? e.type ?? "Exam",
        score: e.score ?? e.marks ?? 0,
        outOf: e.outOf ?? e.maxScore ?? 100,
        date: e.date ?? "—",
      })),
    })),
  }));
}

const getGrade = (pct) => {
  if (pct >= 90) return { letter: "A", color: "text-success" };
  if (pct >= 85) return { letter: "B+", color: "text-primary" };
  if (pct >= 80) return { letter: "B", color: "text-info" };
  if (pct >= 75) return { letter: "C+", color: "text-warning" };
  if (pct >= 70) return { letter: "C", color: "text-warning" };
  return { letter: "D", color: "text-destructive" };
};

const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export default function AdminGrades() {
  const academicYear = new Date().getFullYear() + "-" + (new Date().getFullYear() + 1);

  const { data: classesRaw = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: () => classService.getAll(),
  });

  const grades = (Array.isArray(classesRaw) ? classesRaw : [])
    .map((c) => (c.grade && c.section ? `Grade ${c.grade}-${c.section}` : `Grade ${c.classId ?? c.id}`))
    .filter(Boolean);
  const gradeOptions = grades.length ? grades : ["Grade 7-A", "Grade 8-A"];

  const [selectedGrade, setSelectedGrade] = useState(gradeOptions[0] ?? "Grade 7-A");

  const classId = (Array.isArray(classesRaw) ? classesRaw : []).find(
    (c) =>
      `Grade ${c.grade}-${c.section}` === selectedGrade || `Grade ${c.classId ?? c.id}` === selectedGrade
  )?.classId ?? classesRaw[0]?.classId ?? classesRaw[0]?.id;
  const [selectedSubject, setSelectedSubject] = useState("All");

  const { data: classReportRes, isLoading, error, refetch } = useQuery({
    queryKey: ["grades", "class-report", classId, academicYear],
    queryFn: () => gradeService.getClassReport({ classId, academicYear }),
    enabled: !!classId,
  });

  const rawStudents = mapClassReportToStudents(classReportRes?.data ?? classReportRes, classId);
  const students = rawStudents.length
    ? rawStudents
    : [{ id: 0, name: "No students", grades: [] }];
  const [search, setSearch] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [editScore, setEditScore] = useState("");
  const [addExamModal, setAddExamModal] = useState(null);
  const [newExam, setNewExam] = useState({ subject: subjectsList[0], type: examTypes[0], score: "", outOf: "100", date: "" });
  const [expandedStudent, setExpandedStudent] = useState(null);

  const filtered = students.filter((s) => s.name && s.name.toLowerCase().includes(search.toLowerCase()));

  const startEditExam = (studentId, subject, examIdx, currentScore) => {
    setEditingExam({ studentId, subject, examIdx });
    setEditScore(String(currentScore));
  };

  const saveExamEdit = () => {
    if (!editingExam) return;
    // TODO: Call gradeService API to update grade when backend supports it
    setEditingExam(null);
    toast.success("Grade update requires backend API");
  };

  const deleteExam = (studentId, subject, examIdx) => {
    toast.info("Grade delete requires backend API");
  };

  const addExam = () => {
    if (!addExamModal || !newExam.score) return;
    toast.info("Add grade requires backend API");
    setAddExamModal(null);
    setNewExam({ subject: subjectsList[0], type: examTypes[0], score: "", outOf: "100", date: "" });
  };

  const getStudentAvg = (student) => {
    const grades = student.grades ?? [];
    const subs = selectedSubject === "All" ? grades : grades.filter((g) => g.subject === selectedSubject);
    let totalScore = 0, totalOutOf = 0;
    subs.forEach((g) => (g.exams ?? []).forEach((e) => { totalScore += e.score ?? 0; totalOutOf += e.outOf ?? 100; }));
    return totalOutOf ? Math.round((totalScore / totalOutOf) * 100) : 0;
  };

  if (isLoading) {
    return <PageSkeleton hasStats hasSearch tableRows={6} />;
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        Failed to load grades. <button onClick={() => refetch()} className="underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" /> Grades Management
          </h1>
          <p className="text-sm text-text-secondary">Enter, edit, and manage student grades</p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <button onClick={() => setHasChanges(false)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium">
              <Save className="w-4 h-4" /> Save
            </button>
          )}
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-medium text-heading hover:bg-muted transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">CLASS</p>
          <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)} className="px-3 py-2 text-sm rounded-lg border border-border bg-card text-heading outline-none">
            {gradeOptions.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">SUBJECT</p>
          <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="px-3 py-2 text-sm rounded-lg border border-border bg-card text-heading outline-none">
            <option>All</option>
            {subjectsList.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student..." className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-card text-heading outline-none focus:border-primary" />
          </div>
        </div>
      </div>

      {/* Student Cards */}
      <div className="space-y-3">
        {filtered.map((student) => {
          const avg = getStudentAvg(student);
          const gr = getGrade(avg);
          const isExpanded = expandedStudent === student.id;
          const displayGrades = selectedSubject === "All" ? student.grades : student.grades.filter(g => g.subject === selectedSubject);

          return (
            <motion.div key={student.id} {...anim} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              {/* Header Row */}
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/20 transition-colors" onClick={() => setExpandedStudent(isExpanded ? null : student.id)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0">
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-heading">{student.name}</p>
                    <p className="text-[10px] text-text-secondary">{selectedGrade}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={`text-lg font-bold ${gr.color}`}>{avg}%</p>
                    <p className={`text-[10px] font-bold ${gr.color}`}>{gr.letter}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setAddExamModal(student.id); }} className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expanded */}
              {isExpanded && (
                <div className="border-t border-border px-4 py-3 bg-muted/20">
                  {displayGrades.map(g => (
                    <div key={g.subject} className="mb-3 last:mb-0">
                      <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">{g.subject}</p>
                      {g.exams.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground italic">No exams recorded</p>
                      ) : (
                        <div className="space-y-1">
                          {g.exams.map((e, ei) => {
                            const pct = Math.round((e.score / e.outOf) * 100);
                            const eg = getGrade(pct);
                            const isEditing = editingExam?.studentId === student.id && editingExam?.subject === g.subject && editingExam?.examIdx === ei;
                            return (
                              <div key={ei} className="flex items-center justify-between bg-card rounded-lg px-3 py-2 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="text-heading font-medium">{e.type}</span>
                                  <span className="text-muted-foreground">{e.date}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isEditing ? (
                                    <div className="flex items-center gap-1">
                                      <input value={editScore} onChange={(ev) => setEditScore(ev.target.value)} className="w-14 text-xs px-2 py-1 rounded border border-primary outline-none text-center" autoFocus />
                                      <span className="text-muted-foreground">/{e.outOf}</span>
                                      <button onClick={saveExamEdit} className="p-1 rounded bg-success/10 text-success"><Check className="w-3 h-3" /></button>
                                      <button onClick={() => setEditingExam(null)} className="p-1 rounded bg-muted text-muted-foreground"><X className="w-3 h-3" /></button>
                                    </div>
                                  ) : (
                                    <>
                                      <span className={`font-bold ${eg.color}`}>{e.score}/{e.outOf} ({pct}%)</span>
                                      <button onClick={() => startEditExam(student.id, g.subject, ei, e.score)} className="p-1 rounded hover:bg-primary/10 text-primary"><Edit2 className="w-3 h-3" /></button>
                                      <button onClick={() => deleteExam(student.id, g.subject, ei)} className="p-1 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-3 h-3" /></button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Add Exam Modal */}
      {addExamModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setAddExamModal(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-xl border border-border p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-heading">Add Exam/Grade</h3>
              <button onClick={() => setAddExamModal(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <p className="text-xs text-text-secondary mb-4">For: {students.find(s => s.id === addExamModal)?.name}</p>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-text-secondary">Subject</label>
                <select value={newExam.subject} onChange={(e) => setNewExam({ ...newExam, subject: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card text-heading outline-none mt-1">
                  {subjectsList.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-text-secondary">Exam Type</label>
                <select value={newExam.type} onChange={(e) => setNewExam({ ...newExam, type: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card text-heading outline-none mt-1">
                  {examTypes.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-text-secondary">Score</label>
                  <input type="number" value={newExam.score} onChange={(e) => setNewExam({ ...newExam, score: e.target.value })} placeholder="85" className="w-full px-3 py-2 text-sm rounded-lg border border-border outline-none focus:border-primary mt-1" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-text-secondary">Out Of</label>
                  <input type="number" value={newExam.outOf} onChange={(e) => setNewExam({ ...newExam, outOf: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-border outline-none focus:border-primary mt-1" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-text-secondary">Date</label>
                <input type="date" value={newExam.date} onChange={(e) => setNewExam({ ...newExam, date: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-border outline-none focus:border-primary mt-1" />
              </div>
              <button onClick={addExam} disabled={!newExam.score} className="w-full py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                Add Grade
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Class Summary */}
      <motion.div {...anim} transition={{ delay: 0.2 }} className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold text-heading mb-3">Class Summary — {selectedGrade}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-heading">{students.length}</p>
            <p className="text-[11px] text-text-secondary">Total Students</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{Math.round(students.reduce((s, st) => s + getStudentAvg(st), 0) / students.length)}%</p>
            <p className="text-[11px] text-text-secondary">Class Average</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-success">{students.filter(s => getStudentAvg(s) >= 85).length}</p>
            <p className="text-[11px] text-text-secondary">Above 85%</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-destructive">{students.filter(s => getStudentAvg(s) < 70).length}</p>
            <p className="text-[11px] text-text-secondary">Below 70%</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
