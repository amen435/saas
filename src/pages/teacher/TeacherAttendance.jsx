import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarCheck, Clock, XCircle, CheckCircle, Save, BarChart3, CheckCheck } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import api from "@/services/api";

const filterOptions = ["Day", "Week", "Month", "Semester", "Year"];

const statusConfig = {
  not_recorded: { icon: BarChart3, class: "text-muted-foreground bg-muted/40", label: "Not recorded" },
  present: { icon: CheckCircle, class: "text-success bg-success/10", label: "Present" },
  late: { icon: Clock, class: "text-warning bg-warning/10", label: "Late" },
  absent: { icon: XCircle, class: "text-destructive bg-destructive/10", label: "Absent" },
};

const PIE_COLORS = ["hsl(142, 71%, 45%)", "hsl(0, 84%, 60%)", "hsl(38, 92%, 50%)"];

function toUiStatus(apiStatus) {
  if (!apiStatus) return "not_recorded";
  const s = String(apiStatus).toUpperCase();
  if (s === "PRESENT") return "present";
  if (s === "ABSENT") return "absent";
  if (s === "LATE") return "late";
  return "not_recorded";
}

function toApiStatus(uiStatus) {
  if (uiStatus === "present") return "PRESENT";
  if (uiStatus === "absent") return "ABSENT";
  if (uiStatus === "late") return "LATE";
  return null;
}

export default function TeacherAttendance() {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [filter, setFilter] = useState("Day");
  const [showSaved, setShowSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [students, setStudents] = useState([]);
  const [hasSavedRecord, setHasSavedRecord] = useState(false);

  const selectedClass = useMemo(
    () => classes.find((c) => c.classId === selectedClassId) || null,
    [classes, selectedClassId]
  );

  const fetchClasses = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/teacher/my-classes");
      // eslint-disable-next-line no-console
      console.log("GET /teacher/my-classes:", res);
      const list = res?.data || [];
      setClasses(list);
      if (!selectedClassId && list.length > 0) {
        setSelectedClassId(list[0].classId);
      }
    } catch (e) {
      setError(e.message || "Failed to load classes.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async ({ classId, date }) => {
    if (!classId || !date) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/attendance/class/${classId}`, { params: { date } });
      // eslint-disable-next-line no-console
      console.log(`GET /attendance/class/${classId}?date=${date}:`, res);
      const payload = res?.data || {};
      const list = payload.students || [];
      setHasSavedRecord(Boolean(list.some((s) => s.hasAttendance)));
      setStudents(
        list.map((s) => ({
          studentId: s.studentId,
          name: s.studentName,
          id: s.userId,
          status: toUiStatus(s.status),
        }))
      );
    } catch (e) {
      setError(e.message || "Failed to load attendance.");
      setStudents([]);
      setHasSavedRecord(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedClassId || !selectedDate) return;
    fetchAttendance({ classId: selectedClassId, date: selectedDate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId, selectedDate]);

  const setStatus = (index, status) => {
    setStudents(prev => prev.map((s, i) => (i === index ? { ...s, status } : s)));
  };

  const handleSave = async () => {
    if (!selectedClassId) return;
    setSaving(true);
    try {
      const records = students
        .map((s) => ({
          studentId: s.studentId,
          status: toApiStatus(s.status),
        }))
        .filter((r) => r.status);

      const payload = {
        classId: selectedClassId,
        attendanceDate: selectedDate,
        records,
      };

      const res = await api.post("/attendance/bulk", payload);
      // eslint-disable-next-line no-console
      console.log("POST /attendance/bulk:", res);

      setShowSaved(true);
      toast.success("Attendance Saved Successfully", {
        description: `${selectedClass?.className || "Class"} — ${new Date(selectedDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}`,
      });
      setTimeout(() => setShowSaved(false), 3000);
      await fetchAttendance({ classId: selectedClassId, date: selectedDate });
    } catch (e) {
      toast.error(e.message || "Failed to save attendance.");
    } finally {
      setSaving(false);
    }
  };

  const presentCount = students.filter(s => s.status === "present").length;
  const lateCount = students.filter(s => s.status === "late").length;
  const absentCount = students.filter(s => s.status === "absent").length;
  const total = students.length;

  const pieData = [
    { name: "Present", value: presentCount },
    { name: "Absent", value: absentCount },
    { name: "Late", value: lateCount },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <CalendarCheck className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-heading">Attendance</h1>
            <p className="text-sm text-text-secondary">Mark and track student attendance</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select value={selectedClassId || ""} onChange={(e) => setSelectedClassId(Number(e.target.value) || null)}
            className="px-4 py-2.5 rounded-xl border border-border bg-card text-sm text-heading font-medium focus:outline-none focus:ring-2 focus:ring-primary/30">
            {classes.map((c) => (
              <option key={c.classId} value={c.classId}>
                {c.className} {c.subjectTaught ? `- ${c.subjectTaught}` : ""}
              </option>
            ))}
          </select>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-border bg-card text-sm text-heading font-medium focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving..." : (hasSavedRecord ? "Update Attendance" : "Save Attendance")}
          </button>
        </div>
      </div>

      {loading && <div className="text-sm text-muted-foreground">Loading...</div>}
      {!loading && error && <div className="text-sm text-destructive">{error}</div>}

      {/* Saved confirmation */}
      <AnimatePresence>
        {showSaved && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 p-4 rounded-xl border border-success/30 bg-success/5">
            <CheckCheck className="w-5 h-5 text-success" />
            <div>
              <p className="text-sm font-semibold text-success">Attendance Saved Successfully</p>
              <p className="text-xs text-text-secondary">
                {selectedClass?.className || "Class"}{" "}
                {selectedClass?.section ? `(${selectedClass.section})` : ""} —{" "}
                {new Date(selectedDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Record status banner */}
      {hasSavedRecord && !showSaved && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/20">
          <CheckCircle className="w-4 h-4 text-primary" />
          <p className="text-xs font-medium text-primary">Attendance already recorded for this date. Editing will update the existing record.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Present", value: `${presentCount} / ${total}`, pct: total ? Math.round((presentCount / total) * 100) : 0, icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
          { label: "Late", value: `${lateCount} Students`, pct: total ? Math.round((lateCount / total) * 100) : 0, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
          { label: "Absent", value: `${absentCount} Students`, pct: total ? Math.round((absentCount / total) * 100) : 0, icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
        ].map(s => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-[11px] text-text-secondary font-medium uppercase tracking-wider">{s.label}</p>
                <p className="text-xl font-bold text-heading">{s.value}</p>
                <p className={`text-[11px] font-medium ${s.color}`}>{s.pct}%</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Table */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3 text-[11px] font-semibold text-text-secondary uppercase text-left">Student</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-text-secondary uppercase text-left">ID</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-text-secondary uppercase text-left">Status</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-text-secondary uppercase text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => {
                const cfg = statusConfig[s.status];
                return (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                          {s.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-heading">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-mono bg-muted px-2 py-1 rounded text-heading">{s.id}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full ${cfg.class}`}>
                        <cfg.icon className="w-3 h-3" /> {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <select value={s.status} onChange={(e) => setStatus(i, e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs text-heading focus:outline-none focus:ring-2 focus:ring-primary/30">
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="late">Late</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </motion.div>

        {/* Analytics */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-heading text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Analytics
            </h3>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs text-heading focus:outline-none">
              {filterOptions.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-3">
            {pieData.map((p, i) => (
              <div key={p.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-text-secondary">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                  {p.name}
                </span>
                <span className="font-medium text-heading">{total ? Math.round((p.value / total) * 100) : 0}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
