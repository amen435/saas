import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CalendarCheck,
  Clock,
  XCircle,
  CheckCircle2,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import api from "@/services/api";
import ChildSelector from "@/components/parent/ChildSelector";
import { attendanceService } from "@/services/attendanceService";
import { PageSkeleton } from "@/components/shared/LoadingStates";

const statusColor = (status) => {
  if (!status) return "bg-muted/30 text-muted-foreground";
  const s = String(status).toUpperCase();
  if (s === "PRESENT") return "bg-success/15 text-success";
  if (s === "LATE") return "bg-warning/15 text-warning";
  if (s === "ABSENT") return "bg-destructive/15 text-destructive";
  return "bg-muted/30 text-muted-foreground";
};

const statusBadge = {
  PRESENT: { label: "PRESENT", cls: "bg-success/10 text-success" },
  LATE: { label: "LATE", cls: "bg-warning/10 text-warning" },
  ABSENT: { label: "ABSENT", cls: "bg-destructive/10 text-destructive" },
};

const toISODate = (d) => d.toISOString().slice(0, 10);

const monthTitle = (d) => d.toLocaleString("en-US", { month: "long", year: "numeric" });

const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export default function ParentAttendance() {
  const [selectedChild, setSelectedChild] = useState(null);
  const [view, setView] = useState("This Month");
  const [cursorDate, setCursorDate] = useState(() => new Date());

  const academicDate = useMemo(() => new Date(cursorDate), [cursorDate]);
  const month = academicDate.getMonth();
  const year = academicDate.getFullYear();

  const {
    data: children,
    isLoading: childrenLoading,
    error: childrenError,
  } = useQuery({
    queryKey: ["parentChildren"],
    queryFn: async () => {
      // eslint-disable-next-line no-console
      if (import.meta?.env?.DEV) console.debug("[ParentAttendance] GET /parents/me/children");
      const res = await api.get("/parents/me/children");
      // eslint-disable-next-line no-console
      if (import.meta?.env?.DEV) console.debug("[ParentAttendance] response.data (children)", res);
      return res?.data ?? [];
    },
  });

  useEffect(() => {
    if (!selectedChild && Array.isArray(children) && children.length > 0) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);

  const { startDate, endDate } = useMemo(() => {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);

    if (view === "This Month") {
      return { startDate: toISODate(start), endDate: toISODate(end) };
    }

    if (view === "This Semester") {
      const isFirst = month < 6;
      const s = new Date(year, isFirst ? 0 : 6, 1);
      const e = new Date(year, isFirst ? 5 : 11, 31);
      return { startDate: toISODate(s), endDate: toISODate(e) };
    }

    // Full Year
    const s = new Date(year, 0, 1);
    const e = new Date(year, 11, 31);
    return { startDate: toISODate(s), endDate: toISODate(e) };
  }, [month, view, year]);

  const {
    data: attendanceData,
    isLoading: attendanceLoading,
    error: attendanceError,
  } = useQuery({
    queryKey: ["parentAttendance", selectedChild, view, startDate, endDate],
    queryFn: () => attendanceService.getStudentAttendance(selectedChild, { startDate, endDate }),
    enabled: !!selectedChild && !!startDate && !!endDate,
  });

  const records = Array.isArray(attendanceData?.records) ? attendanceData.records : [];
  const statistics = attendanceData?.statistics ?? { total: 0, present: 0, absent: 0, late: 0 };

  const recordByDay = useMemo(() => {
    const map = new Map(); // YYYY-MM-DD -> status
    for (const r of records) {
      const key = r?.attendanceDate ? toISODate(new Date(r.attendanceDate)) : null;
      if (!key) continue;
      map.set(key, r.status);
    }
    return map;
  }, [records]);

  const calendarCells = useMemo(() => {
    if (view !== "This Month") return [];

    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Monday-first offset
    const jsDay = first.getDay(); // 0=Sun..6=Sat
    const mondayFirstOffset = (jsDay + 6) % 7; // 0=Mon..6=Sun

    const cells = [];
    const totalCells = Math.ceil((mondayFirstOffset + daysInMonth) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
      const dayNumber = i - mondayFirstOffset + 1;
      if (dayNumber < 1 || dayNumber > daysInMonth) {
        cells.push({ day: null, status: null });
        continue;
      }
      const d = new Date(year, month, dayNumber);
      const key = toISODate(d);
      cells.push({ day: dayNumber, status: recordByDay.get(key) ?? null });
    }

    return cells;
  }, [month, recordByDay, view, year]);

  const stats = useMemo(() => {
    const total = Number(statistics.total ?? 0);
    const presentPct = statistics.presentPercentage ?? (total ? ((statistics.present / total) * 100).toFixed(2) : "0");
    const absentPct = statistics.absentPercentage ?? (total ? ((statistics.absent / total) * 100).toFixed(2) : "0");
    const latePct = statistics.latePercentage ?? (total ? ((statistics.late / total) * 100).toFixed(2) : "0");

    return [
      { label: "Total Days", value: String(total), pct: null, icon: CalendarCheck, color: "text-heading", bg: "bg-muted" },
      { label: "Present", value: String(statistics.present ?? 0), pct: `${presentPct}%`, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
      { label: "Absent", value: String(statistics.absent ?? 0), pct: `${absentPct}%`, icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
      { label: "Late", value: String(statistics.late ?? 0), pct: `${latePct}%`, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
    ];
  }, [statistics]);

  const handleExport = () => {
    // Basic export via browser print; keeps UX consistent without needing extra backend endpoints.
    window.print();
  };

  if (childrenLoading) {
    return (
      <div className="space-y-6">
        <PageSkeleton hasStats={true} hasSearch={false} tableRows={8} />
      </div>
    );
  }

  if (childrenError) {
    return (
      <div className="space-y-6">
        <p className="text-destructive">Failed to load children.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ChildSelector children={children ?? []} selectedChild={selectedChild} onSelect={setSelectedChild} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading">Attendance & Analytics</h1>
          <p className="text-sm text-text-secondary">Real attendance tracking for your child</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={view}
            onChange={(e) => setView(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-border bg-card text-heading outline-none"
          >
            <option>This Month</option>
            <option>This Semester</option>
            <option>Full Year</option>
          </select>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-heading hover:bg-muted transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <motion.div
            key={s.label}
            {...anim}
            transition={{ delay: 0.03 }}
            className="bg-card rounded-xl border border-border p-4"
          >
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-heading">{s.value}</p>
            <p className="text-[11px] text-text-secondary">{s.label}</p>
            {s.pct && <p className="text-[10px] text-muted-foreground">{s.pct}</p>}
          </motion.div>
        ))}
      </div>

      {/* Heatmap (This Month only) */}
      {view === "This Month" && (
        <motion.div {...anim} transition={{ delay: 0.1 }} className="bg-card rounded-xl border border-border p-5 max-w-3xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-heading">Attendance Heatmap</h3>
            <div className="flex items-center gap-2">
              <button
                className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"
                onClick={() => setCursorDate(new Date(year, month - 1, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"
                onClick={() => setCursorDate(new Date(year, month + 1, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="text-sm text-text-secondary mb-3">{monthTitle(new Date(year, month, 1))}</div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, idx) => (
              <div key={idx} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {calendarCells.map((c, idx) => (
              <div
                key={idx}
                className={`aspect-square max-w-[48px] rounded-lg flex items-center justify-center text-xs font-medium ${
                  c.day == null ? "opacity-0" : "opacity-100 cursor-default"
                } ${statusColor(c.status)}`}
                title={c.day ? `Day ${c.day}: ${c.status ?? "NO DATA"}` : ""}
              >
                {c.day ?? ""}
              </div>
            ))}
          </div>

          <div className="flex gap-4 mt-4 flex-wrap">
            {[
              { key: "PRESENT", label: "Present" },
              { key: "LATE", label: "Late" },
              { key: "ABSENT", label: "Absent" },
            ].map((l) => (
              <span key={l.key} className="flex items-center gap-1.5 text-[10px] text-text-secondary">
                <span className={`w-2.5 h-2.5 rounded-sm ${statusBadge[l.key]?.cls ?? ""}`} /> {l.label}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent Records */}
      <motion.div {...anim} transition={{ delay: 0.15 }} className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold text-heading mb-4">Recent Attendance</h3>

        {attendanceLoading ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            Loading...
          </div>
        ) : attendanceError ? (
          <p className="text-destructive">Failed to load attendance.</p>
        ) : records.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attendance records found for this range.</p>
        ) : (
          <div className="space-y-3">
            {records.slice(0, 10).map((r, idx) => (
              <div key={`${r.attendanceId ?? idx}-${r.attendanceDate}`} className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-heading">
                    {new Date(r.attendanceDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {r.class?.className ? `Class: ${r.class.className}` : ""}{" "}
                    {r.teacher?.user?.fullName ? `• Teacher: ${r.teacher.user.fullName}` : ""}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${statusBadge[r.status]?.cls ?? "bg-muted text-muted-foreground"}`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

