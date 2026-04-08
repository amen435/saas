import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarCheck,
  Clock,
  XCircle,
  Flame,
  Target,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, CartesianGrid } from "recharts";
import api from "@/services/api";
import StudentAbsenceRequests from "@/components/shared/StudentAbsenceRequests";

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

function toISODate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateKey(value) {
  if (!value) return null;
  if (typeof value === "string") {
    // Keep backend YYYY-MM-DD / ISO strings stable without timezone shift.
    return value.slice(0, 10);
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return toISODate(d);
}

function buildMonthDays(month, year) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const out = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const dow = new Date(year, month, i).getDay();
    out.push({ day: i, isWeekend: dow === 0 || dow === 6, status: null });
  }
  return out;
}

function heatColor(status) {
  const s = status ? String(status).toUpperCase() : "";
  if (s === "PRESENT") return "bg-success/15 text-success";
  if (s === "LATE") return "bg-warning/15 text-warning";
  if (s === "ABSENT") return "bg-destructive/15 text-destructive";
  return "bg-muted/30 text-muted-foreground";
}

export default function TeacherMyAttendance() {
  const [teacherId, setTeacherId] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [error, setError] = useState("");
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [absenceDate, setAbsenceDate] = useState("");
  const [absenceReason, setAbsenceReason] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [absenceRequests, setAbsenceRequests] = useState([]);

  const loadProfile = async () => {
    setLoadingProfile(true);
    setError("");
    try {
      const response = await api.get("/teacher/profile");
      const payload = response?.data || response;
      const data = payload?.data || payload;
      const id = data?.teacherId ?? null;
      setTeacherId(id);
      // eslint-disable-next-line no-console
      console.log("teacherId:", id);
    } catch (e) {
      setError(e.message || "Failed to load teacher profile");
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadAttendance = async (id = teacherId) => {
    if (!id) return;
    setLoadingAttendance(true);
    setError("");
    try {
      const response = await api.get(`/teacher-attendance/teacher/${id}`);
      const data = response?.data?.data || response?.data;
      // eslint-disable-next-line no-console
      console.log("attendance data:", data);
      const next = Array.isArray(data?.records)
        ? data.records
        : Array.isArray(data)
          ? data
          : [];
      setAttendance(next);
      if (next.length > 0) {
        const latest = [...next]
          .map((r) => r?.attendanceDate || r?.date)
          .filter(Boolean)
          .map((v) => new Date(v))
          .filter((d) => !Number.isNaN(d.getTime()))
          .sort((a, b) => b.getTime() - a.getTime())[0];
        if (latest) {
          setCalYear(latest.getFullYear());
          setCalMonth(latest.getMonth());
        }
      }
    } catch (e) {
      setError(e.message || "Failed to load attendance");
      setAttendance([]);
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (teacherId) loadAttendance(teacherId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherId]);

  useEffect(() => {
    const loadAbsenceRequests = async () => {
      if (!teacherId) return;
      try {
        const response = await api.get("/teacher/absence-requests");
        const payload = response?.data || response;
        const data = payload?.data || payload;
        setAbsenceRequests(Array.isArray(data) ? data : data?.requests || []);
      } catch {
        setAbsenceRequests([]);
      }
    };
    loadAbsenceRequests();
  }, [teacherId]);

  const recordByDate = useMemo(() => {
    const map = new Map();
    for (const r of attendance) {
      const dateValue = r?.attendanceDate || r?.date;
      const key = toDateKey(dateValue);
      if (!key) continue;
      map.set(key, String(r?.status ?? r?.attendanceStatus ?? "").toUpperCase());
    }
    return map;
  }, [attendance]);

  const calendarDays = useMemo(() => {
    const base = buildMonthDays(calMonth, calYear);
    return base.map((d) => {
      const key = toISODate(new Date(calYear, calMonth, d.day));
      const mappedStatus = recordByDate.get(key);
      if (mappedStatus) return { ...d, status: mappedStatus };
      return { ...d, status: d.isWeekend ? "weekend" : null };
    });
  }, [calMonth, calYear, recordByDate]);

  const stats = useMemo(() => {
    const weekdays = calendarDays.filter((d) => d.status !== "weekend");
    const present = weekdays.filter((d) => d.status === "PRESENT").length;
    const absent = weekdays.filter((d) => d.status === "ABSENT").length;
    const late = weekdays.filter((d) => d.status === "LATE").length;
    const total = weekdays.length;
    const pct = total ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, late, pct };
  }, [calendarDays]);

  const weeklyBuckets = useMemo(() => {
    const buckets = [
      { week: "W1", present: 0, absent: 0, late: 0 },
      { week: "W2", present: 0, absent: 0, late: 0 },
      { week: "W3", present: 0, absent: 0, late: 0 },
      { week: "W4", present: 0, absent: 0, late: 0 },
      { week: "W5", present: 0, absent: 0, late: 0 },
    ];
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(calYear, calMonth, day);
      const dow = d.getDay();
      if (dow === 0 || dow === 6) continue;
      const key = toISODate(d);
      const status = recordByDate.get(key);
      const idx = Math.min(4, Math.floor((day - 1) / 7));
      if (status === "PRESENT") buckets[idx].present += 1;
      if (status === "ABSENT") buckets[idx].absent += 1;
      if (status === "LATE") buckets[idx].late += 1;
    }
    return buckets.map((b) => {
      const total = b.present + b.absent + b.late;
      const rate = total ? (b.present / total) * 100 : 0;
      return { month: b.week, rate: Math.round(rate * 10) / 10 };
    });
  }, [calYear, calMonth, recordByDate]);

  const streakDays = useMemo(() => {
    const presentDays = calendarDays
      .filter((d) => d.status === "PRESENT")
      .map((d) => d.day)
      .sort((a, b) => a - b);
    if (!presentDays.length) return 0;
    let streak = 0;
    let cursor = presentDays[presentDays.length - 1];
    while (presentDays.includes(cursor)) {
      streak += 1;
      cursor -= 1;
    }
    return streak;
  }, [calendarDays]);

  const correlationData = useMemo(
    () => weeklyBuckets.map((b) => ({ att: b.rate, grade: b.rate })),
    [weeklyBuckets]
  );

  // eslint-disable-next-line no-console
  console.log("render attendance:", attendance);

  const handleSendAbsenceRequest = async () => {
    if (!absenceDate || !absenceReason.trim()) return;
    setSendingRequest(true);
    try {
      const payload = { date: absenceDate, reason: absenceReason.trim() };
      await api.post("/teacher/absence-requests", payload);
      setAbsenceDate("");
      setAbsenceReason("");
      const refresh = await api.get("/teacher/absence-requests");
      const refreshPayload = refresh?.data || refresh;
      const data = refreshPayload?.data || refreshPayload;
      setAbsenceRequests(Array.isArray(data) ? data : data?.requests || []);
    } catch (e) {
      setError(e.message || "Failed to send absence request");
    } finally {
      setSendingRequest(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <CalendarCheck className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-heading">My Attendance</h1>
          <p className="text-sm text-text-secondary">Real attendance heatmap + analytics</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() =>
              setCalMonth((m) => {
                if (m > 0) return m - 1;
                setCalYear((y) => y - 1);
                return 11;
              })
            }
            className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() =>
              setCalMonth((m) => {
                if (m < 11) return m + 1;
                setCalYear((y) => y + 1);
                return 0;
              })
            }
            className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-heading hover:bg-muted transition-colors">
            <Download className="w-3.5 h-3.5" /> Report
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Days", value: stats.total, icon: CalendarCheck, color: "text-heading", bg: "bg-muted" },
          { label: "Present", value: stats.present, pct: `${stats.pct}%`, icon: CalendarCheck, color: "text-success", bg: "bg-success/10" },
          { label: "Absent", value: stats.absent, pct: stats.total ? `${Math.round((stats.absent / stats.total) * 100)}%` : "0%", icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
          { label: "Late", value: stats.late, pct: stats.total ? `${Math.round((stats.late / stats.total) * 100)}%` : "0%", icon: Clock, color: "text-warning", bg: "bg-warning/10" },
        ].map((s, i) => (
          <motion.div key={s.label} {...anim} transition={{ delay: i * 0.05 }} className="bg-card rounded-xl border border-border p-4">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-heading">{s.value}</p>
            <p className="text-[11px] text-text-secondary">{s.label}</p>
            {s.pct && <p className="text-[10px] text-muted-foreground">{s.pct}</p>}
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div {...anim} transition={{ delay: 0.1 }} className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
            <Flame className="w-6 h-6 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold text-heading">🔥 {streakDays} Days</p>
            <p className="text-xs text-text-secondary">Consecutive present days (this month)</p>
          </div>
        </motion.div>
        <motion.div {...anim} transition={{ delay: 0.12 }} className="bg-success/5 border border-success/20 rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
            <CalendarCheck className="w-6 h-6 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold text-success">{stats.pct}%</p>
            <p className="text-xs text-text-secondary">Attendance rate this month</p>
          </div>
        </motion.div>
      </div>

      <motion.div {...anim} transition={{ delay: 0.15 }} className="bg-card rounded-xl border border-border p-5 max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-heading">{months[calMonth]} {calYear}</h3>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <div key={i} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {(() => {
            const first = new Date(calYear, calMonth, 1);
            const jsDay = first.getDay();
            const mondayFirstOffset = (jsDay + 6) % 7;
            return [...Array(mondayFirstOffset)].map((_, i) => <div key={`e-${i}`} />);
          })()}
          {calendarDays.map((d) => (
            <div
              key={d.day}
              className={`aspect-square max-w-[48px] rounded-lg flex items-center justify-center text-xs font-medium ${
                d.status === "weekend" ? "bg-muted/30 text-muted-foreground" : heatColor(d.status)
              }`}
            >
              {d.day}
            </div>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div {...anim} transition={{ delay: 0.2 }} className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-heading mb-4">Monthly Trends</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyBuckets}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
        <motion.div {...anim} transition={{ delay: 0.22 }} className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-heading mb-2">Attendance vs Performance</h3>
          <p className="text-[10px] text-text-secondary mb-4">Correlation trend (demo line from attendance patterns)</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={correlationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="att" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
              <Line type="monotone" dataKey="grade" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <motion.div {...anim} transition={{ delay: 0.3 }} className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-heading">🎯 Attendance Goal: 95%</h3>
            <p className="text-xs text-text-secondary">Current: {stats.pct}%</p>
          </div>
        </div>
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <div className="h-full gradient-primary rounded-full transition-all duration-1000" style={{ width: `${Math.min(Math.max(stats.pct, 0), 100)}%` }} />
        </div>
      </motion.div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/30">
          <h3 className="text-sm font-semibold text-heading">Attendance Records</h3>
        </div>
        {loadingAttendance ? (
          <div className="px-5 py-6 text-sm text-muted-foreground">Loading attendance...</div>
        ) : Array.isArray(attendance) && attendance.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase">Date</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase">Status</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((item) => {
                const statusRaw = String(item?.status ?? item?.attendanceStatus ?? "").toUpperCase();
                const badgeClass =
                  statusRaw === "PRESENT"
                    ? "bg-success/10 text-success"
                    : statusRaw === "LATE"
                      ? "bg-warning/10 text-warning"
                      : "bg-destructive/10 text-destructive";
                const dateValue = item?.date || item?.attendanceDate;
                return (
                  <tr key={item?.attendanceId ?? `${dateValue}-${statusRaw}`} className="border-b border-border/50">
                    <td className="px-5 py-3 text-sm">
                      {dateValue ? new Date(dateValue).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-5 py-3 text-sm">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${badgeClass}`}>
                        {statusRaw || "-"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-text-secondary">{item?.remarks || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="px-5 py-6 text-sm text-muted-foreground">No attendance records found</div>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold text-heading mb-3">Send Absence Request To Admin</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input type="date" value={absenceDate} onChange={(e) => setAbsenceDate(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-background" />
          <input type="text" value={absenceReason} onChange={(e) => setAbsenceReason(e.target.value)} placeholder="Reason..." className="px-3 py-2 rounded-lg border border-border bg-background" />
          <button onClick={handleSendAbsenceRequest} disabled={sendingRequest} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-60">
            {sendingRequest ? "Sending..." : "Send Request"}
          </button>
        </div>
      </div>

      <StudentAbsenceRequests title="Student Absence Requests" />
    </div>
  );
}
