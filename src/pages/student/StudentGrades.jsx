import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Star, TrendingUp, Printer, Trophy, Medal } from "lucide-react";
import { gradeService } from "@/services/gradeService";
import { useAuth } from "@/contexts/AuthContext";
import { PageSkeleton } from "@/components/shared/LoadingStates";

const getGrade = (s) => (s >= 90 ? "A" : s >= 80 ? "B" : s >= 70 ? "C" : s >= 60 ? "D" : "F");
const gradeColor = (s) =>
  s >= 90 ? "text-success" : s >= 80 ? "text-primary" : s >= 70 ? "text-warning" : "text-destructive";

const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export default function StudentGrades() {
  const { user } = useAuth();
  const studentId = user?.studentId ?? user?.userId;
  const academicYear = `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
  const [semester, setSemester] = useState("ALL");

  const { data, isLoading, error } = useQuery({
    queryKey: ["grades", "student-summary", studentId, academicYear, semester],
    queryFn: async () => {
      const response = await gradeService.getStudentSummary(studentId, {
        academicYear,
        ...(semester !== "ALL" ? { semester } : {}),
      });
      const data = response?.data?.data || response?.data || response;
      console.log("grades data:", data);
      return data;
    },
    enabled: !!studentId,
  });

  const subjects = Array.isArray(data?.subjects) ? data.subjects : [];
  const classRank = data?.classRank ?? data?.overallRank?.classRank ?? data?.overallRank?.rank ?? null;
  const classRankTotal = data?.overallRank?.totalStudents ?? null;
  const schoolRank = data?.schoolRankValue ?? data?.schoolRank?.schoolRank ?? data?.schoolRank?.rank ?? null;
  const schoolRankTotal = data?.schoolRank?.totalStudents ?? null;

  const total = subjects.reduce((sum, s) => sum + Number(s?.average ?? 0), 0);
  const maxTotal = subjects.length * 100;
  const overallAvg =
    typeof data?.summary?.average === "number"
      ? Math.round(data.summary.average)
      : subjects.length
        ? Math.round(total / subjects.length)
        : 0;

  const printRef = useRef(null);
  const handlePrint = () => window.print();
  const semesterLabel =
    semester === "SEMESTER_1" ? "Semester 1" : semester === "SEMESTER_2" ? "Semester 2" : "Full Year";

  if (isLoading) {
    return (
      <div className="space-y-6" ref={printRef}>
        <div>
          <h1 className="text-2xl font-bold text-heading">Grade Center</h1>
          <p className="text-sm text-text-secondary">Loading grades...</p>
        </div>
        <PageSkeleton hasStats={true} hasSearch={false} tableRows={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6" ref={printRef}>
        <div>
          <h1 className="text-2xl font-bold text-heading">Grade Center</h1>
          <p className="text-sm text-destructive">Failed to load grades.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" ref={printRef}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading">Grade Center</h1>
          <p className="text-sm text-text-secondary">Academic Year {academicYear} · {semesterLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-card text-xs font-medium text-heading"
          >
            <option value="ALL">Full Year</option>
            <option value="SEMESTER_1">Semester 1</option>
            <option value="SEMESTER_2">Semester 2</option>
          </select>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-heading hover:bg-muted transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Overall Average",
            value: `${overallAvg}%`,
            sub: getGrade(overallAvg),
            icon: Star,
            color: "text-primary",
            bg: "bg-primary/10",
          },
          {
            label: "Subjects",
            value: subjects.length,
            sub: semesterLabel,
            icon: TrendingUp,
            color: "text-warning",
            bg: "bg-warning/10",
          },
          {
            label: "Overall Class Rank",
            value: classRank != null ? `#${classRank}` : "—",
            sub: classRankTotal ? `out of ${classRankTotal} students` : "Class standing",
            icon: Trophy,
            color: "text-success",
            bg: "bg-success/10",
          },
          {
            label: "School Rank",
            value: schoolRank != null ? `#${schoolRank}` : "—",
            sub: schoolRankTotal ? `out of ${schoolRankTotal} students` : "School standing",
            icon: Medal,
            color: "text-destructive",
            bg: "bg-destructive/10",
          },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            {...anim}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl border border-border p-4"
          >
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-xl font-bold text-heading">{s.value}</p>
            <p className="text-[11px] text-text-secondary">{s.label}</p>
            <p className="text-[10px] text-muted-foreground">{s.sub}</p>
          </motion.div>
        ))}
      </div>

      <motion.div {...anim} transition={{ delay: 0.1 }} className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-heading">Subject Results</h3>
          <p className="text-xs text-muted-foreground mt-1">Overall class and school ranks are shown above. Rows below show subject-level results.</p>
          {subjects.length === 0 && (
            <p className="text-sm text-muted-foreground mt-1">No grades found for this selection.</p>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-[10px] font-semibold text-text-secondary uppercase text-left">#</th>
                <th className="px-4 py-3 text-[10px] font-semibold text-text-secondary uppercase text-left">Subject</th>
                <th className="px-4 py-3 text-[10px] font-semibold text-text-secondary uppercase text-center">
                  Average / 100
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold text-text-secondary uppercase text-center">
                  Grade
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold text-text-secondary uppercase text-center">Subject Rank</th>
                <th className="px-4 py-3 text-[10px] font-semibold text-text-secondary uppercase text-center">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((sub, i) => {
                const avg = Number(sub?.average ?? 0);
                const rank = sub?.subjectRank ?? sub?.rank ?? null;
                const status = sub?.status ?? (avg >= 60 ? "PASS" : "FAIL");
                return (
                  <tr
                    key={sub.subjectId ?? sub.subjectName ?? i}
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-heading">{sub.subjectName ?? "—"}</span>
                        {sub.teacherName && <span className="text-[10px] text-text-secondary mt-0.5">{sub.teacherName}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-lg font-bold ${gradeColor(avg)}`}>{Math.round(avg)}</span>
                      <span className="text-xs text-muted-foreground"> / 100</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm font-bold ${gradeColor(avg)}`}>{getGrade(avg)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold text-heading">{rank ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          status === "PASS" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {subjects.length > 0 && (
                <tr className="bg-muted/30 font-semibold">
                  <td className="px-4 py-3" colSpan={2}>
                    <span className="text-sm text-heading">Total / Average</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-lg font-bold text-heading">{Math.round(total)}</span>
                    <span className="text-xs text-muted-foreground"> / {maxTotal}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-sm font-bold ${gradeColor(overallAvg)}`}>
                      {overallAvg}% ({getGrade(overallAvg)})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-semibold text-heading">
                      {classRank != null ? `#${classRank}` : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        overallAvg >= 60 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {overallAvg >= 60 ? "PASS" : "FAIL"}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
