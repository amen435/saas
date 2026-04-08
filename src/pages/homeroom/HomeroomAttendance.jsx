import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, ChevronLeft, ChevronRight, Check, X, Clock, Search, Save, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import StudentAbsenceRequests from "@/components/shared/StudentAbsenceRequests";
import { useHomeroomClasses, useHomeroomStudents } from "@/hooks/useStudents";
import { attendanceService } from "@/services/attendanceService";

const periodFilters = ["Day", "Week", "Quarter", "Semester", "Year"];

function getDateRange(period, refDate) {
  const d = new Date(refDate);
  const start = new Date(d);
  const end = new Date(d);
  switch (period) {
    case "Day": break;
    case "Week":
      start.setDate(d.getDate() - d.getDay());
      end.setDate(start.getDate() + 6);
      break;
    case "Quarter":
      start.setMonth(Math.floor(d.getMonth() / 3) * 3, 1);
      end.setMonth(start.getMonth() + 3, 0);
      break;
    case "Semester":
      start.setMonth(d.getMonth() < 6 ? 0 : 6, 1);
      end.setMonth(start.getMonth() + 6, 0);
      break;
    case "Year":
      start.setMonth(0, 1);
      end.setMonth(11, 31);
      break;
  }
  return { start, end };
}

function dateStr(d) { return d.toISOString().split("T")[0]; }

export default function HomeroomAttendance() {
  const { data: homeroomClasses = [] } = useHomeroomClasses();
  const firstClass = homeroomClasses[0];
  const classId = firstClass?.classId ?? firstClass?.id;
  const { data: studentsRaw = [], isLoading: studentsLoading } = useHomeroomStudents(classId, { isActive: true });

  const students = useMemo(() => {
    const arr = Array.isArray(studentsRaw) ? studentsRaw : [];
    return arr.map((s) => ({
      id: s.studentId ?? s.id, // numeric PK
      fullName: s.user?.fullName || "—",
      studentId: s.user?.userId || "—", // login ID shown in UI
    }));
  }, [studentsRaw]);

  const [attendance, setAttendance] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("Day");
  const [selectedStudent, setSelectedStudent] = useState("all");
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  const todayStr = dateStr(new Date());
  const currentDateStr = dateStr(selectedDate);
  const isToday = currentDateStr === todayStr;

  const fetchAttendanceForDate = async (date) => {
    if (!classId) return;
    try {
      const res = await attendanceService.getHomeroomClassAttendance(classId, { date });
      console.log("[HomeroomAttendance] attendance API response", res);

      const statusToLetter = { PRESENT: "P", ABSENT: "A", LATE: "L" };
      const list = Array.isArray(res?.students) ? res.students : Array.isArray(res?.data?.students) ? res.data.students : [];

      setAttendance((prev) => {
        const next = { ...prev };
        list.forEach((row) => {
          const sid = row.studentId;
          const letter = row.status ? statusToLetter[row.status] : undefined;
          next[sid] = { ...(next[sid] || {}), [date]: letter };
        });
        return next;
      });
      setHasChanges(false);
    } catch (e) {
      console.error("[HomeroomAttendance] failed to fetch attendance", e);
      // axios interceptor already shows toast
    }
  };

  useEffect(() => {
    if (classId && currentDateStr) {
      fetchAttendanceForDate(currentDateStr);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, currentDateStr]);

  const setStatus = (studentId, status) => {
    if (!isToday) {
      toast.error("Can only edit today's attendance");
      return;
    }
    setAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [todayStr]: status },
    }));
    setHasChanges(true);
  };

  const markAllToday = (status) => {
    setAttendance(prev => {
      const updated = { ...prev };
      students.forEach(s => { updated[s.id] = { ...updated[s.id], [todayStr]: status }; });
      return updated;
    });
    setHasChanges(true);
    toast.success(`All marked as ${status === "P" ? "Present" : status === "A" ? "Absent" : "Late"}`);
  };

  const handleSave = async () => {
    if (!classId) {
      toast.error("No homeroom class assigned.");
      return;
    }
    // Check all students are marked
    const unmarked = students.filter(s => !attendance[s.id]?.[todayStr]);
    if (unmarked.length > 0) {
      toast.error(`Please mark attendance for all students. ${unmarked.length} student(s) unmarked.`);
      return;
    }
    const statusMap = { P: "PRESENT", A: "ABSENT", L: "LATE" };
    const records = students.map((s) => ({
      studentId: s.id,
      status: statusMap[attendance[s.id]?.[todayStr]] || null,
    })).filter((r) => r.studentId && r.status);

    if (records.length === 0) {
      toast.error("No attendance records to save.");
      return;
    }

    setSaving(true);
    try {
      await attendanceService.recordHomeroomClassAttendance(classId, {
        date: todayStr,
        records,
      });
      setHasChanges(false);
      toast.success("Attendance saved successfully!");
      await fetchAttendanceForDate(todayStr);
    } catch (e) {
      // axios interceptor already toasts the error
      console.error("Failed to save attendance", e);
    } finally {
      setSaving(false);
    }
  };

  const navigateDate = (dir) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir);
    setSelectedDate(d);
  };

  const filtered = students.filter(s => s.fullName.toLowerCase().includes(search.toLowerCase()));
  const displayStudents = selectedStudent === "all"
    ? filtered
    : filtered.filter(s => String(s.id) === String(selectedStudent));

  // Stats calculation
  const stats = useMemo(() => {
    const range = getDateRange(period, selectedDate);
    const targetStudents = selectedStudent === "all" ? students : students.filter(s => s.id === selectedStudent);
    let totalP = 0, totalA = 0, totalL = 0, totalDays = 0;
    targetStudents.forEach(s => {
      const records = attendance[s.id] || {};
      Object.entries(records).forEach(([d, st]) => {
        const dt = new Date(d);
        if (dt >= range.start && dt <= range.end) {
          totalDays++;
          if (st === "P") totalP++;
          else if (st === "A") totalA++;
          else totalL++;
        }
      });
    });
    return {
      present: totalP, absent: totalA, late: totalL,
      rate: totalDays > 0 ? Math.round((totalP / totalDays) * 100) : 0,
      total: totalDays,
    };
  }, [attendance, period, selectedDate, selectedStudent, students]);

  // Chart data
  const chartData = useMemo(() => {
    const range = getDateRange(period, selectedDate);
    const targetStudents = selectedStudent === "all" ? students : students.filter(s => s.id === selectedStudent);
    const dataMap = {};
    let current = new Date(range.start);
    while (current <= range.end) {
      const ds = dateStr(current);
      let p = 0, a = 0, l = 0;
      targetStudents.forEach(s => {
        const st = attendance[s.id]?.[ds];
        if (st === "P") p++;
        else if (st === "A") a++;
        else if (st === "L") l++;
      });
      const label = period === "Day" ? ds : current.toLocaleDateString("en", { month: "short", day: "numeric" });
      if (p + a + l > 0) dataMap[ds] = { date: label, present: p, absent: a, late: l };
      current.setDate(current.getDate() + 1);
    }
    return Object.values(dataMap);
  }, [attendance, period, selectedDate, selectedStudent, students]);

  if (studentsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CalendarCheck className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-bold text-heading mb-2">Loading Students…</h2>
        <p className="text-sm text-muted-foreground">Fetching your homeroom class students.</p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CalendarCheck className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-bold text-heading mb-2">No Students Yet</h2>
        <p className="text-sm text-muted-foreground">Add students from the Dashboard first to start tracking attendance.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading">Student Attendance</h1>
          <p className="text-sm text-muted-foreground mt-1">Track and manage daily attendance for your class</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isToday && (
            <Button variant="outline" size="sm" onClick={() => markAllToday("P")} className="gap-1.5 text-success border-success/30 hover:bg-success/10">
              <Check className="w-3.5 h-3.5" /> Mark All Present
            </Button>
          )}
        </div>
      </div>

      {/* Date nav */}
      <div className="flex items-center justify-between bg-card rounded-xl border border-border p-4">
        <button onClick={() => navigateDate(-1)} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h3 className="text-sm font-semibold text-heading">
            {selectedDate.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </h3>
          {isToday && <span className="text-[11px] text-success font-bold uppercase tracking-wider">Today</span>}
          {!isToday && <span className="text-[11px] text-muted-foreground">View only — can only edit today</span>}
        </div>
        <button onClick={() => navigateDate(1)} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student..." className="pl-10" />
        </div>
        <div className="flex gap-1">
          {periodFilters.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${period === p ? "gradient-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:bg-muted"}`}>
              {p}
            </button>
          ))}
        </div>
        <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs">
          <option value="all">All Students</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: `${period} Attendance Rate`, value: `${stats.rate}%`, color: stats.rate >= 90 ? "text-success" : stats.rate >= 80 ? "text-warning" : "text-destructive" },
          { label: "Present", value: stats.present, color: "text-success" },
          { label: "Absent", value: stats.absent, color: "text-destructive" },
          { label: "Late", value: stats.late, color: "text-warning" },
        ].map((s, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Attendance Cards — Primary UX */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-heading">
            {isToday ? "Mark Today's Attendance" : `Attendance for ${selectedDate.toLocaleDateString("en", { month: "short", day: "numeric" })}`}
          </h3>
          <span className="text-xs text-muted-foreground">{displayStudents.length} students</span>
        </div>

        {displayStudents.map((student, idx) => {
          const currentStatus = attendance[student.id]?.[currentDateStr];
          return (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.02 }}
              className="bg-card rounded-xl border border-border p-4 flex items-center justify-between gap-4 flex-wrap"
            >
              {/* Student info */}
              <div className="flex items-center gap-3 min-w-[180px]">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                  {student.fullName.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-heading">{student.fullName}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{student.studentId}</p>
                </div>
              </div>

              {/* Status buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setStatus(student.id, "P")}
                  disabled={!isToday}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all border ${
                    currentStatus === "P"
                      ? "bg-success/15 border-success text-success ring-2 ring-success/20"
                      : "border-border text-muted-foreground hover:bg-success/5 hover:text-success hover:border-success/40"
                  } ${!isToday ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <Check className="w-4 h-4" />
                  Present
                </button>
                <button
                  onClick={() => setStatus(student.id, "L")}
                  disabled={!isToday}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all border ${
                    currentStatus === "L"
                      ? "bg-warning/15 border-warning text-warning ring-2 ring-warning/20"
                      : "border-border text-muted-foreground hover:bg-warning/5 hover:text-warning hover:border-warning/40"
                  } ${!isToday ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <Clock className="w-4 h-4" />
                  Late
                </button>
                <button
                  onClick={() => setStatus(student.id, "A")}
                  disabled={!isToday}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all border ${
                    currentStatus === "A"
                      ? "bg-destructive/15 border-destructive text-destructive ring-2 ring-destructive/20"
                      : "border-border text-muted-foreground hover:bg-destructive/5 hover:text-destructive hover:border-destructive/40"
                  } ${!isToday ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <X className="w-4 h-4" />
                  Absent
                </button>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Save Button */}
      {isToday && (
        <div className="sticky bottom-20 md:bottom-4 z-10">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            size="lg"
            className={`w-full gap-2 text-sm font-semibold rounded-xl shadow-lg ${
              hasChanges
                ? "gradient-primary text-primary-foreground"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : hasChanges ? "Save Attendance" : "No Changes to Save"}
          </Button>
        </div>
      )}

      {/* Student Absence Requests */}
      <StudentAbsenceRequests title="Student Absence Requests" />

      {/* Charts */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-heading mb-4">Attendance Trend ({period})</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="present" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} name="Present" />
                <Line type="monotone" dataKey="absent" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} name="Absent" />
                <Line type="monotone" dataKey="late" stroke="hsl(var(--warning))" strokeWidth={2} dot={{ r: 3 }} name="Late" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-heading mb-4">Daily Breakdown ({period})</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="present" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Present" />
                <Bar dataKey="absent" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Absent" />
                <Bar dataKey="late" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} name="Late" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
