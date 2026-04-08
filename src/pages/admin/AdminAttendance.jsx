import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, Save, CalendarCheck, Users, CheckCircle, XCircle, Clock, TrendingUp, BarChart3, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid } from "recharts";
import { toast } from "react-hot-toast";
import adminService from "@/services/adminService";
import { useAuth } from "@/contexts/AuthContext";

const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

function unwrapData(response) {
  return response?.data?.data || response?.data || response || {};
}

export default function AdminAttendance() {
  const { user, activeRole } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");
  const [attendanceMap, setAttendanceMap] = useState({});
  const [trendData, setTrendData] = useState([]);
  const effectiveRole = String(activeRole || user?.role || "").toUpperCase();
  const isSchoolAdmin = effectiveRole === "SCHOOL_ADMIN";

  const { data: teachersRes, isLoading: loadingTeachers } = useQuery({
    queryKey: ["adminTeachers"],
    queryFn: () => adminService.getTeachers(),
    enabled: isSchoolAdmin,
  });

  const { data: attendanceRes, isLoading: loadingAttendance, refetch: refetchAttendance } = useQuery({
    queryKey: ["teacherAttendanceByDate", selectedDate],
    queryFn: () => adminService.getTeacherAttendance(selectedDate),
    enabled: isSchoolAdmin,
  });

  const teachers = useMemo(() => teachersRes?.data || [], [teachersRes]);
  const attendancePayload = useMemo(() => unwrapData(attendanceRes), [attendanceRes]);
  const teacherAttendanceRows = useMemo(() => {
    if (Array.isArray(attendancePayload?.teachers)) return attendancePayload.teachers;
    if (Array.isArray(attendancePayload?.records)) return attendancePayload.records;
    return [];
  }, [attendancePayload]);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("attendance response.data:", attendanceRes);
    // eslint-disable-next-line no-console
    console.log("Fetched attendance:", teacherAttendanceRows);
  }, [attendanceRes, teacherAttendanceRows]);

  useEffect(() => {
    const next = {};
    teacherAttendanceRows.forEach((r) => {
      const id = r?.teacher?.teacherId ?? r?.teacherId;
      if (!id) return;
      next[id] = {
        status: r.status || "PRESENT",
        remarks: r.remarks || "",
        attendanceId: r.attendanceId || r?.teacherAttendanceId || null,
      };
    });

    teachers.forEach((t) => {
      if (!next[t.teacherId]) {
        next[t.teacherId] = { status: "PRESENT", remarks: "", attendanceId: null };
      }
    });
    setAttendanceMap(next);
  }, [teacherAttendanceRows, teachers]);

  useEffect(() => {
    if (!isSchoolAdmin) {
      setTrendData([]);
      return;
    }

    const loadTrend = async () => {
      const points = [];
      for (let i = 6; i >= 0; i -= 1) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const day = d.toISOString().split("T")[0];
        try {
          const res = await adminService.getTeacherAttendance(day);
          const data = unwrapData(res);
          const summary = data?.summary || {};
          const total = Number(summary.total || 0);
          const present = Number(summary.present || 0);
          const late = Number(summary.late || 0);
          const rate = total ? (((present + late) / total) * 100) : 0;
          points.push({
            day: day.slice(5),
            rate: Number(rate.toFixed(2)),
          });
        } catch {
          points.push({ day: day.slice(5), rate: 0 });
        }
      }
      setTrendData(points);
    };
    loadTrend();
  }, [isSchoolAdmin]);

  const filteredTeachers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) => {
      const name = String(t?.user?.fullName || "").toLowerCase();
      const id = String(t?.user?.userId || "").toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [teachers, search]);

  const stats = {
    totalTeachers: attendancePayload?.summary?.total ?? teachers.length,
    present: attendancePayload?.summary?.present ?? 0,
    absent: attendancePayload?.summary?.absent ?? 0,
    late: attendancePayload?.summary?.late ?? 0,
    attendanceRate: Number(
      attendancePayload?.summary?.total
        ? ((((attendancePayload?.summary?.present ?? 0) + (attendancePayload?.summary?.late ?? 0)) / attendancePayload.summary.total) * 100).toFixed(2)
        : 0
    ),
  };

  const barData = [{ name: "Today", present: stats.present, late: stats.late, absent: stats.absent }];
  const pieData = [
    { name: "Present", value: stats.present, color: "hsl(var(--success))" },
    { name: "Late", value: stats.late, color: "hsl(var(--warning))" },
    { name: "Absent", value: stats.absent, color: "hsl(var(--destructive))" },
  ];

  const saveMutation = useMutation({
    mutationFn: (payload) => adminService.recordBulkAttendance(payload),
    onSuccess: async () => {
      toast.success("Attendance saved");
      await queryClient.invalidateQueries({ queryKey: ["teacherAttendanceByDate"] });
      await refetchAttendance();
    },
    onError: (e) => {
      toast.error(e.message || "Failed to save attendance");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (attendanceId) => adminService.deleteAttendance(attendanceId),
    onSuccess: async () => {
      toast.success("Attendance deleted");
      await queryClient.invalidateQueries({ queryKey: ["teacherAttendanceByDate"] });
      await refetchAttendance();
    },
    onError: (e) => {
      toast.error(e.message || "Failed to delete attendance");
    },
  });

  const handleSave = () => {
    const recordsPayload = Object.entries(attendanceMap).map(([teacherId, value]) => ({
      teacherId: parseInt(teacherId, 10),
      status: value.status || "PRESENT",
      remarks: value.remarks || "",
    }));

    saveMutation.mutate({ attendanceDate: selectedDate, records: recordsPayload });
  };

  const handleDelete = async (teacherId) => {
    const current = attendanceMap[teacherId];
    // eslint-disable-next-line no-console
    console.log("Before delete:", attendanceMap);
    if (!current?.attendanceId) return;
    await deleteMutation.mutateAsync(current.attendanceId);
  };

  if (loadingTeachers) {
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
            <h1 className="text-2xl font-bold text-heading">Teacher Attendance</h1>
            <p className="text-sm text-text-secondary">Record and track teacher attendance</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-border bg-card text-sm text-heading font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saveMutation.isPending ? "Saving..." : "Save Attendance"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Teachers", value: stats.totalTeachers, icon: Users, color: "text-heading", bg: "bg-muted" },
          { label: "Present", value: stats.present, icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
          { label: "Absent", value: stats.absent, icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
          { label: "Late", value: stats.late, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
          { label: "Rate", value: `${stats.attendanceRate.toFixed(1)}%`, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
        ].map((s, i) => (
          <motion.div key={s.label} {...anim} transition={{ delay: i * 0.04 }} className="bg-card rounded-xl border border-border p-5">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-heading">{s.value}</p>
            <p className="text-[11px] text-text-secondary font-medium">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-xl border border-border p-6 lg:col-span-2">
          <h3 className="font-semibold text-heading text-sm mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Status Distribution
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="present" fill="hsl(var(--success))" />
              <Bar dataKey="late" fill="hsl(var(--warning))" />
              <Bar dataKey="absent" fill="hsl(var(--destructive))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-heading text-sm mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" innerRadius={45} outerRadius={75}>
                {pieData.map((p) => (
                  <Cell key={p.name} fill={p.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold text-heading text-sm mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Last 7 Days Attendance Rate
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" />
            <YAxis domain={[0, 100]} />
            <Tooltip formatter={(v) => `${v}%`} />
            <Area type="monotone" dataKey="rate" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold text-heading px-5 pt-5">Teachers</h3>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search teacher..."
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm mr-5 mt-5"
          />
        </div>
        {loadingAttendance ? (
          <div className="text-sm text-muted-foreground px-5 pb-5">Loading attendance...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase">Teacher</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase">Status</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase">Remarks</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((t) => (
                  <tr key={t.teacherId} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 text-sm">
                      <div className="font-medium">{t?.user?.fullName || "N/A"}</div>
                      <div className="text-xs text-muted-foreground font-mono">{t?.user?.userId || "-"}</div>
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={attendanceMap[t.teacherId]?.status || "PRESENT"}
                        onChange={(e) =>
                          setAttendanceMap((prev) => ({
                            ...prev,
                            [t.teacherId]: { ...(prev[t.teacherId] || {}), status: e.target.value },
                          }))
                        }
                        className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs text-heading focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="PRESENT">Present</option>
                        <option value="ABSENT">Absent</option>
                        <option value="LATE">Late</option>
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      <input
                        value={attendanceMap[t.teacherId]?.remarks || ""}
                        onChange={(e) =>
                          setAttendanceMap((prev) => ({
                            ...prev,
                            [t.teacherId]: { ...(prev[t.teacherId] || {}), remarks: e.target.value },
                          }))
                        }
                        placeholder="Optional remarks"
                        className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs text-heading focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        disabled={!attendanceMap[t.teacherId]?.attendanceId || deleteMutation.isPending}
                        onClick={() => handleDelete(t.teacherId)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-destructive disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredTeachers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-sm text-muted-foreground">
                      No teachers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
