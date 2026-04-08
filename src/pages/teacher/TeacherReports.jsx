import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FileText, TrendingUp, CalendarCheck, BarChart3, Download } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import api from "@/services/api";

const periods = ["This Week", "This Month", "This Semester", "This Year"];

const PIE_COLORS = ["hsl(142, 71%, 45%)", "hsl(0, 84%, 60%)", "hsl(38, 92%, 50%)"];

function monthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthEnd(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function fmt(d) {
  return d.toISOString().slice(0, 10);
}

export default function TeacherReports() {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [period, setPeriod] = useState("This Semester");

  const [attendanceTrend, setAttendanceTrend] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [gradeTrend, setGradeTrend] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const selectedClass = useMemo(
    () => classes.find((c) => c.classId === selectedClassId) || null,
    [classes, selectedClassId]
  );

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/teacher/my-classes");
        // eslint-disable-next-line no-console
        console.log("GET /teacher/my-classes (reports):", res);
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
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!selectedClassId || !selectedClass?.subjectTaught) return;
      setLoading(true);
      setError("");
      try {
        // Attendance: last 6 months trend (real calls)
        const now = new Date();
        const months = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          months.push(d);
        }
        const attPoints = [];
        let presentTotal = 0;
        let absentTotal = 0;
        let lateTotal = 0;
        let allTotal = 0;

        for (const m of months) {
          const start = fmt(monthStart(m));
          const end = fmt(monthEnd(m));
          const rep = await api.get(`/attendance/report/class/${selectedClassId}`, { params: { startDate: start, endDate: end } });
          // eslint-disable-next-line no-console
          console.log("Attendance report:", rep);
          const students = rep?.data?.students || [];
          const sum = students.reduce(
            (acc, s) => {
              acc.present += Number(s?.statistics?.present || 0);
              acc.absent += Number(s?.statistics?.absent || 0);
              acc.late += Number(s?.statistics?.late || 0);
              acc.total += Number(s?.statistics?.total || 0);
              return acc;
            },
            { present: 0, absent: 0, late: 0, total: 0 }
          );

          const rate = sum.total ? Math.round((sum.present / sum.total) * 100) : 0;
          attPoints.push({ month: m.toLocaleDateString("en-US", { month: "short" }), rate });

          presentTotal += sum.present;
          absentTotal += sum.absent;
          lateTotal += sum.late;
          allTotal += sum.total;
        }

        setAttendanceTrend(attPoints);
        const presentPct = allTotal ? Math.round((presentTotal / allTotal) * 100) : 0;
        const absentPct = allTotal ? Math.round((absentTotal / allTotal) * 100) : 0;
        const latePct = allTotal ? Math.round((lateTotal / allTotal) * 100) : 0;
        setAttendanceSummary([
          { name: "Present", value: presentPct },
          { name: "Absent", value: absentPct },
          { name: "Late", value: latePct },
        ]);

        // Grades: use teacher grades endpoint (already returns trendData + structure + students)
        const g = await api.get(`/teacher/classes/${selectedClassId}/grades`, { params: { subjectName: selectedClass.subjectTaught } });
        // eslint-disable-next-line no-console
        console.log("Grades report data:", g);
        const trend = g?.data?.trendData || [];
        setGradeTrend(trend.map((p) => ({ month: p.month.slice(5), avg: p.avg })));

        const structure = g?.data?.structure || [];
        const students = g?.data?.students || [];
        const perf = structure.map((comp) => {
          const vals = students.map((s) => Number(s?.marks?.[comp.id] || 0));
          const avg = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0;
          return { name: comp.component, avg };
        });
        setPerformanceData(perf);
      } catch (e) {
        setError(e.message || "Failed to load report data.");
        setAttendanceTrend([]);
        setAttendanceSummary([]);
        setGradeTrend([]);
        setPerformanceData([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [selectedClassId, selectedClass?.subjectTaught]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-heading">Reports</h1>
            <p className="text-sm text-text-secondary">Attendance, grades, and performance analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedClassId || ""} onChange={(e) => setSelectedClassId(Number(e.target.value) || null)}
            className="px-4 py-2.5 rounded-xl border border-border bg-card text-sm text-heading font-medium focus:outline-none focus:ring-2 focus:ring-primary/30">
            {classes.map((c) => (
              <option key={c.classId} value={c.classId}>
                {c.className} {c.subjectTaught ? `- ${c.subjectTaught}` : ""}
              </option>
            ))}
          </select>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-border bg-card text-sm text-heading font-medium focus:outline-none focus:ring-2 focus:ring-primary/30">
            {periods.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {loading && <div className="text-sm text-muted-foreground">Loading reports...</div>}
      {!loading && error && <div className="text-sm text-destructive">{error}</div>}

      {/* Attendance Report */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-heading text-sm mb-1 flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-primary" /> Attendance Trend
          </h3>
          <p className="text-[11px] text-text-secondary mb-4">Monthly attendance rate over time</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={attendanceTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(215, 14%, 47%)" }} axisLine={false} tickLine={false} />
              <YAxis domain={[80, 100]} tick={{ fontSize: 11, fill: "hsl(215, 14%, 47%)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v) => `${v}%`} />
              <Line type="monotone" dataKey="rate" stroke="hsl(217, 91%, 60%)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(217, 91%, 60%)" }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-heading text-sm mb-4">Attendance Summary</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={attendanceSummary} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {attendanceSummary.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v) => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1.5 mt-2">
            {attendanceSummary.map((s, i) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-text-secondary">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                  {s.name}
                </span>
                <span className="font-medium text-heading">{s.value}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Grade Report */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-heading text-sm mb-1 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Grade Trend
          </h3>
          <p className="text-[11px] text-text-secondary mb-4">Average class grades over time</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={gradeTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(215, 14%, 47%)" }} axisLine={false} tickLine={false} />
              <YAxis domain={[60, 90]} tick={{ fontSize: 11, fill: "hsl(215, 14%, 47%)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v) => `${v}%`} />
              <Line type="monotone" dataKey="avg" stroke="hsl(263, 70%, 58%)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(263, 70%, 58%)" }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-heading text-sm mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Performance by Assessment
          </h3>
          <p className="text-[11px] text-text-secondary mb-4">Average scores per assessment type</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(215, 14%, 47%)" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(215, 14%, 47%)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v) => `${v}%`} />
              <Bar dataKey="avg" fill="hsl(217, 91%, 60%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
}
