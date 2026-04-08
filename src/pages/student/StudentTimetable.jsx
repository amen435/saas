import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Printer, Clock } from "lucide-react";
import { timetableService } from "@/services/timetableService";
import { LoadingSpinner } from "@/components/shared/LoadingStates";
import { useAuth } from "@/contexts/AuthContext";
import { teacherService } from "@/services/teacherService";
import api from "@/services/api";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const slotMeta = [
  { label: "P1", type: "period", time: "8:00–8:45" },
  { label: "P2", type: "period", time: "8:50–9:35" },
  { label: "P3", type: "period", time: "9:40–10:25" },
  { label: "Break", type: "break", time: "10:25–10:55" },
  { label: "P4", type: "period", time: "10:55–11:40" },
  { label: "P5", type: "period", time: "11:45–12:30" },
  { label: "Lunch", type: "break", time: "12:30–1:30" },
  { label: "P6", type: "period", time: "1:30–2:15" },
  { label: "P7", type: "period", time: "2:20–3:05" },
];

function transformToTimetable(apiData) {
  if (!apiData || typeof apiData !== "object") return {};
  const schedule = apiData?.schedule && typeof apiData.schedule === "object" ? apiData.schedule : apiData;
  const result = {};
  days.forEach((day) => {
    const key = day.toUpperCase();
    const daySlotsRaw = schedule[key] ?? schedule[day] ?? schedule[day.toLowerCase()] ?? [];
    const daySlots = Array.isArray(daySlotsRaw)
      ? daySlotsRaw
      : Object.values(daySlotsRaw || {}).sort((a, b) => (a?.periodNumber || 0) - (b?.periodNumber || 0));
    const periodOnlySlots = daySlots.filter((s) => s && s.type !== "break");
    result[day] = slotMeta.map((meta, i) => {
      if (meta.type === "break") return { type: "break" };
      const periodNumber = Number(String(meta.label).replace("P", ""));
      const cell = periodOnlySlots.find((s) => Number(s?.periodNumber) === periodNumber) ?? periodOnlySlots[i];
      if (!cell || cell.type === "break" || cell.type === "free")
        return { subject: "", teacher: "", room: "" };
      return {
        subject: cell?.subject?.name ?? cell.subjectName ?? cell.subject ?? "",
        teacher: cell?.teacher?.name ?? cell.teacherName ?? cell.teacher ?? "",
        className: cell?.class?.name ?? cell?.className ?? cell?.class ?? "",
        room: cell.room ?? "",
      };
    });
  });
  return result;
}

const emptySlot = { subject: "", teacher: "", room: "" };
const defaultDaySlots = [
  emptySlot, emptySlot, emptySlot, { type: "break" }, emptySlot, emptySlot, { type: "break" }, emptySlot, emptySlot,
];
const emptyTimetableData = Object.fromEntries(days.map((d) => [d, defaultDaySlots]));

const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export default function StudentTimetable() {
  const { user, activeRole } = useAuth();
  const [term, setTerm] = useState("1st Quarter");
  const role = String(activeRole || user?.role || "").toUpperCase();
  const isTeacherRole = role === "TEACHER" || role === "HOMEROOM_TEACHER";
  const isStudentRole = role === "STUDENT";

  const { data: teacherProfileRes, isLoading: teacherProfileLoading } = useQuery({
    queryKey: ["teacher-profile", "timetable", user?.userId],
    queryFn: () => teacherService.getProfile(),
    enabled: isTeacherRole,
  });
  const teacherProfile = teacherProfileRes?.data?.data || teacherProfileRes?.data || teacherProfileRes || null;
  const teacherId = teacherProfile?.teacherId;
  const teacherAcademicYear = teacherProfile?.academicYear || null;

  const { data: studentProfileRes } = useQuery({
    queryKey: ["student-profile", "timetable", user?.userId],
    queryFn: () => api.get("/students/me"),
    enabled: isStudentRole,
  });
  const studentProfile = studentProfileRes?.data?.data || studentProfileRes?.data || studentProfileRes || null;
  const studentClassId = studentProfile?.classId || studentProfile?.class?.classId || null;
  const studentAcademicYear = studentProfile?.academicYear || null;

  const fallbackAcademicYear = `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
  const academicYear = (isTeacherRole ? teacherAcademicYear : studentAcademicYear) || fallbackAcademicYear;

  const { data: res, isLoading, error } = useQuery({
    queryKey: ["timetable", isTeacherRole ? "teacher" : "student", isTeacherRole ? teacherId : "my", academicYear],
    queryFn: async () => {
      if (isTeacherRole) {
        if (!teacherId) return null;
        let response = await timetableService.getTeacherTimetable(teacherId, { academicYear });
        const primaryData = response?.data?.data || response?.data || {};
        const hasPrimaryData = Object.values(primaryData?.schedule || {}).some(
          (daySlots) => (Array.isArray(daySlots) ? daySlots : Object.values(daySlots || {})).some((s) => s?.type === "class")
        );
        if (!hasPrimaryData) {
          const y = new Date().getFullYear();
          const fallbackYears = [`${y - 1}/${y}`, `${y}/${y + 1}`].filter((yr) => yr !== academicYear);
          for (const yr of fallbackYears) {
            const retry = await timetableService.getTeacherTimetable(teacherId, { academicYear: yr });
            const retryData = retry?.data?.data || retry?.data || {};
            const hasRetryData = Object.values(retryData?.schedule || {}).some(
              (daySlots) => (Array.isArray(daySlots) ? daySlots : Object.values(daySlots || {})).some((s) => s?.type === "class")
            );
            if (hasRetryData) {
              response = retry;
              break;
            }
          }
        }
        return response ?? null;
      }
      if (studentClassId) {
        const response = await timetableService.getClassTimetable(studentClassId, { academicYear });
        return response ?? null;
      }
      const fallback = await timetableService.getMyTimetable({ academicYear });
      return fallback ?? null;
    },
    enabled: isTeacherRole ? !!teacherId && !!academicYear : !!academicYear,
  });

  const timetableData = useMemo(() => {
    // eslint-disable-next-line no-console
    console.log("timetable response:", res);
    // eslint-disable-next-line no-console
    console.log("classId:", studentClassId);
    // eslint-disable-next-line no-console
    console.log("teacherId:", teacherId);
    const raw = res?.data?.data || res?.data || res;
    const transformed = transformToTimetable(raw);
    const hasData = Object.keys(transformed).some((d) => (transformed[d] ?? []).length > 0);
    return hasData ? transformed : emptyTimetableData;
  }, [res]);

  if (teacherProfileLoading || isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-heading">My Schedule</h1>
          <p className="text-sm text-text-secondary">Loading timetable...</p>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-heading">My Schedule</h1>
        <p className="text-sm text-destructive">{error.message || "Failed to load timetable."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading">My Schedule</h1>
          <p className="text-sm text-text-secondary">Academic Year {academicYear}</p>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Term</p>
            <select value={term} onChange={e => setTerm(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-border bg-card text-heading outline-none">
              <option>1st Quarter</option><option>2nd Quarter</option><option>3rd Quarter</option><option>4th Quarter</option>
            </select>
          </div>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-heading hover:bg-muted transition-colors mt-4">
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
        </div>
      </div>

      {/* Desktop Table */}
      <motion.div {...anim} className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-heading">Weekly Timetable</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-xs font-semibold text-heading text-left w-24">Day</th>
                {slotMeta.map((s, i) => (
                  <th key={i} className={`px-1 py-3 text-xs font-semibold text-center ${s.type === "break" ? "bg-warning/10 text-warning" : "text-heading"}`}>
                    <div>{s.label}</div>
                    <div className="text-[9px] font-normal opacity-70">{s.time}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map(day => {
                const slots = timetableData[day] || [];
                return (
                  <tr key={day} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-heading">{day}</td>
                    {slots.map((p, i) => (
                      <td key={i} className="px-1 py-1 text-center">
                        {p.type === "break" ? (
                          <div className="bg-warning/10 text-warning text-[10px] font-medium rounded-lg py-4 px-1">
                            {slotMeta[i].label}
                          </div>
                        ) : (
                          <div className="bg-primary/5 border border-primary/10 rounded-lg p-2 min-h-[56px] hover:bg-primary/10 transition-colors cursor-default flex flex-col items-center justify-center">
                            <p className="text-[11px] font-bold text-primary leading-tight">{p.subject}</p>
                            <p className="text-[9px] text-text-secondary mt-0.5">{p.className || p.teacher}</p>
                            <p className="text-[9px] text-muted-foreground">{p.room}</p>
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Period Legend */}
      <div className="flex flex-wrap gap-4 text-[11px] text-text-secondary">
        <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> P1–P3: 8:00–10:25</span>
        <span className="flex items-center gap-1.5 text-warning">☕ Break: 10:25–10:55</span>
        <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> P4–P5: 10:55–12:30</span>
        <span className="flex items-center gap-1.5 text-warning">🍽 Lunch: 12:30–1:30</span>
        <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> P6–P7: 1:30–3:05</span>
      </div>
    </div>
  );
}
