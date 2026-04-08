import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, CartesianGrid } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import { attendanceService } from "@/services/attendanceService";
import { gradeService } from "@/services/gradeService";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingSpinner } from "@/components/shared/LoadingStates";

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
  return d.toISOString().slice(0, 10);
}

function buildMonthDays(month, year) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const out = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const dow = new Date(year, month, i).getDay(); // 0=Sun..6=Sat
    if (dow === 0 || dow === 6) out.push({ day: i, status: "weekend" });
    else out.push({ day: i, status: null });
  }
  return out;
}

function CircleProgress({ pct, label, color, size = 80 }) {
  const safePct = Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0;
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (safePct / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={6} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="text-center -mt-14">
        <p className="text-lg font-bold text-heading">{Math.round(safePct)}%</p>
      </div>
      <p className="text-[10px] text-text-secondary mt-6">{label}</p>
    </div>
  );
}

function getGradeLetterFromAverage(avg) {
  const a = Number(avg ?? 0);
  if (a >= 90) return "A";
  if (a >= 80) return "B";
  if (a >= 70) return "C";
  if (a >= 60) return "D";
  return "F";
}

function heatColor(status) {
  const s = status ? String(status).toUpperCase() : "";
  if (s === "PRESENT") return "bg-success/15 text-success";
  if (s === "LATE") return "bg-warning/15 text-warning";
  if (s === "ABSENT") return "bg-destructive/15 text-destructive";
  return "bg-muted/30 text-muted-foreground";
}

export default function StudentAttendance() {
  const { user } = useAuth();
  const studentIdFromUser = user?.studentId ?? user?.userId;
  const studentId = useMemo(() => {
    const n = studentIdFromUser != null ? parseInt(studentIdFromUser, 10) : null;
    return Number.isInteger(n) ? n : null;
  }, [studentIdFromUser]);

  const calYear = new Date().getFullYear();
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

  const academicYear = useMemo(() => `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`, []);

  const {
    data: profileRes,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery({
    queryKey: ["studentProfile", "me", "attendance"],
    enabled: !!user,
    queryFn: async () => {
      const res = await api.get("/students/me");
      return res?.data ?? res;
    },
  });

  const effectiveStudentId = profileRes?.studentId ?? studentId;

  const startDate = useMemo(() => toISODate(new Date(calYear, calMonth, 1)), [calYear, calMonth]);
  const endDate = useMemo(() => toISODate(new Date(calYear, calMonth + 1, 0)), [calYear, calMonth]);

  const {
    data: attendanceRes,
    isLoading: attendanceLoading,
    error: attendanceError,
  } = useQuery({
    queryKey: ["studentAttendanceRange", effectiveStudentId, startDate, endDate],
    enabled: !!effectiveStudentId && !!startDate && !!endDate,
    queryFn: async () => {
      // records + statistics for the given date range
      const res = await attendanceService.getStudentAttendance(effectiveStudentId, { startDate, endDate });
      return res;
    },
  });

  const records = Array.isArray(attendanceRes?.records) ? attendanceRes.records : [];
  const statistics = attendanceRes?.statistics ?? {};

  const recordByDate = useMemo(() => {
    const map = new Map();
    for (const r of records) {
      const key = r?.attendanceDate ? toISODate(new Date(r.attendanceDate)) : null;
      if (!key) continue;
      map.set(key, String(r.status ?? "").toUpperCase());
    }
    return map;
  }, [records]);

  const calendarDays = useMemo(() => {
    const base = buildMonthDays(calMonth, calYear);
    return base.map((d) => {
      if (d.status === "weekend") return d;
      const key = toISODate(new Date(calYear, calMonth, d.day));
      return { ...d, status: recordByDate.get(key) ?? null };
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
      if (dow === 0 || dow === 6) continue; // weekend
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

  const {
    data: gradesRes,
    isLoading: gradesLoading,
    error: gradesError,
  } = useQuery({
    queryKey: ["studentGradesSummary", effectiveStudentId, academicYear],
    enabled: !!effectiveStudentId && !!academicYear,
    queryFn: async () => gradeService.getStudentSummary(effectiveStudentId, { academicYear }),
  });

  const overallAverage = gradesRes?.summary?.average ?? null;
  const gradeLetter = getGradeLetterFromAverage(overallAverage);

  const correlationData = useMemo(() => {
    const avg = overallAverage != null ? Number(overallAverage) : 0;
    return weeklyBuckets.map((b) => ({ att: b.rate, grade: avg }));
  }, [weeklyBuckets, overallAverage]);

  const attendanceRate = stats.total ? (stats.present / stats.total) * 100 : 0;

  const streakDays = useMemo(() => {
    // consecutive PRESENT days within the loaded month (descending from latest PRESENT day)
    const presentDays = calendarDays
      .filter((d) => d.status === "PRESENT")
      .map((d) => d.day)
      .sort((a, b) => a - b);

    if (presentDays.length === 0) return 0;
    let streak = 0;
    let cursor = presentDays[presentDays.length - 1];
    while (presentDays.includes(cursor)) {
      streak += 1;
      cursor -= 1;
    }
    return streak;
  }, [calendarDays]);

  const loading = profileLoading || attendanceLoading || gradesLoading;
  const fatalError = profileError || attendanceError || gradesError;
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-56 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
        <LoadingSpinner />
      </div>
    );
  }
  if (fatalError) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-destructive">Failed to load attendance.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading">My Attendance</h1>
          <p className="text-sm text-text-secondary">Real attendance heatmap + analytics</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCalMonth((m) => (m > 0 ? m - 1 : 11))}
            className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCalMonth((m) => (m < 11 ? m + 1 : 0))}
            className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-heading hover:bg-muted transition-colors">
            <Download className="w-3.5 h-3.5" /> Report
          </button>
        </div>
      </div>

      {/* Top Stats */}
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

      {/* Streak + Grade */}
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
            <p className="text-2xl font-bold text-success">Grade: {gradeLetter}</p>
            <p className="text-xs text-text-secondary">Based on your overall average</p>
          </div>
        </motion.div>
      </div>

      {/* Calendar Heatmap */}
      <motion.div {...anim} transition={{ delay: 0.15 }} className="bg-card rounded-xl border border-border p-5 max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-heading">{months[calMonth]} {calYear}</h3>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <div key={i} className="text-center text-[10px] font-medium text-muted-foreground py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {/* Leading blanks (Mon-first offset) */}
          {(() => {
            const first = new Date(calYear, calMonth, 1);
            const jsDay = first.getDay(); // 0=Sun..6=Sat
            const mondayFirstOffset = (jsDay + 6) % 7; // 0=Mon..6=Sun
            return [...Array(mondayFirstOffset)].map((_, i) => <div key={`e-${i}`} />);
          })()}
          {calendarDays.map((d) => (
            <div
              key={d.day}
              className={`aspect-square max-w-[48px] rounded-lg flex items-center justify-center text-xs font-medium cursor-default transition-all ${
                d.status === "weekend" ? "bg-muted/30 text-muted-foreground" : heatColor(d.status)
              }`}
              title={`${months[calMonth]} ${d.day}: ${d.status ?? "NO DATA"}`}
            >
              {d.status === "weekend" ? "" : d.day}
            </div>
          ))}
        </div>

        <div className="flex gap-4 mt-4 flex-wrap">
          {[
            { label: "Present", cls: "bg-success" },
            { label: "Late", cls: "bg-warning" },
            { label: "Absent", cls: "bg-destructive" },
            { label: "Weekend", cls: "bg-muted" },
          ].map((l) => (
            <span key={l.label} className="flex items-center gap-1.5 text-[10px] text-text-secondary">
              <span className={`w-2.5 h-2.5 rounded-sm ${l.cls}`} /> {l.label}
            </span>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
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

        {/* Comparison */}
        <motion.div {...anim} transition={{ delay: 0.22 }} className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-heading mb-6">Comparison</h3>
          <div className="flex items-center justify-around">
            <CircleProgress pct={attendanceRate} label="You" color="hsl(142 71% 45%)" />
            <div className="flex flex-col items-center justify-center gap-2">
              <p className="text-[10px] text-text-secondary font-medium">Class Avg</p>
              <p className="text-lg font-bold text-muted-foreground">—</p>
            </div>
          </div>
          <p className="text-center text-xs text-text-secondary font-medium mt-4">
            {attendanceRate >= 90 ? "Excellent attendance!" : attendanceRate >= 60 ? "Good attendance." : "Keep improving."}
          </p>
        </motion.div>
      </div>

      {/* Impact Analysis (Attendance vs Overall Grade Average) */}
        <motion.div {...anim} transition={{ delay: 0.24 }} className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold text-heading mb-2">Attendance vs. Overall Grades</h3>
        <p className="text-[10px] text-text-secondary mb-4">Correlation is based on your monthly attendance rate vs overall average.</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={correlationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="att" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: "Attendance %", position: "bottom", fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: "Grade %", angle: -90, position: "insideLeft", fontSize: 10 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
              <Line type="monotone" dataKey="grade" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

      {/* Goal Tracker */}
      <motion.div {...anim} transition={{ delay: 0.3 }} className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-heading">🎯 Attendance Goal: 95%</h3>
            <p className="text-xs text-text-secondary">Current: {Math.round(attendanceRate)}% — {Math.round(Math.max(0, 95 - attendanceRate))}% to goal</p>
          </div>
        </div>
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full gradient-primary rounded-full transition-all duration-1000"
            style={{ width: `${Math.min(Math.max(attendanceRate, 0), 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[10px] text-muted-foreground">0%</span>
          <span className="text-[10px] font-medium text-primary">{Math.round(attendanceRate)}%</span>
          <span className="text-[10px] text-muted-foreground">95% Goal</span>
        </div>
      </motion.div>
    </div>
  );
}

