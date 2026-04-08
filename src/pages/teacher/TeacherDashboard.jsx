import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { announcementService } from "@/services/announcementService";
import { useProtectedGet } from "@/hooks/useProtectedGet";
import { Users, CalendarCheck, BookOpen, BarChart3, TrendingUp, TrendingDown, CheckCircle, Clock, ArrowUpRight, Bell, AlertTriangle, Camera } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api from "@/services/api";
import { timetableService } from "@/services/timetableService";
import { aiService } from "@/services/aiService";

const PIE_COLORS = ["hsl(142, 71%, 45%)", "hsl(0, 84%, 60%)", "hsl(38, 92%, 50%)"];

const card = (i) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.05 } });

export default function TeacherDashboard() {
  const { user, activeRole } = useAuth();
  const role = String(activeRole || user?.role || "").toUpperCase();
  // eslint-disable-next-line no-console
  console.log("TeacherDashboard auth:", { userRole: user?.role, activeRole });
  // eslint-disable-next-line no-console
  console.log("user role:", role);

  const { data: announcementsRes } = useQuery({
    queryKey: ["dashboardAnnouncements", "teacher", user?.userId],
    queryFn: () => announcementService.getAll(),
    enabled: !!(user && (activeRole === "TEACHER" || activeRole === "HOMEROOM_TEACHER" || role === "TEACHER" || role === "HOMEROOM_TEACHER")),
  });
  const dashboardAnnouncements = useMemo(() => {
    const raw = announcementsRes;
    const data = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
    // eslint-disable-next-line no-console
    console.log("dashboard announcements:", data);
    return data;
  }, [announcementsRes]);
  const {
    data: classesResponse,
    loading: loadingClasses,
    error: classesError,
  } = useProtectedGet(
    user && (activeRole === "TEACHER" || activeRole === "HOMEROOM_TEACHER") ? "/teacher/my-classes" : null
  );
  // eslint-disable-next-line no-console
  console.log("TeacherDashboard classesResponse:", classesResponse);

  const [selectedClassId, setSelectedClassId] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [todaySummary, setTodaySummary] = useState({ total: 0, present: 0, absent: 0, late: 0 });
  const [weeklyAttendance, setWeeklyAttendance] = useState([]);
  const [gradesSummary, setGradesSummary] = useState({ classAverage: null, passCount: null, failCount: null, gradeDistribution: [] });
  const [students, setStudents] = useState([]);
  const [todayTimetable, setTodayTimetable] = useState([]);

  const rawClasses = classesResponse?.data?.data ?? classesResponse?.data;
  const classes = Array.isArray(rawClasses) ? rawClasses : [];
  const selectedClass = classes.find((c) => c.classId === selectedClassId) || null;

  const { data: teacherHomeworkRaw = [] } = useQuery({
    queryKey: ["teacherHomework", "dashboard", user?.userId],
    queryFn: () => aiService.getTeacherHomework(),
    enabled: !!user && (activeRole === "TEACHER" || activeRole === "HOMEROOM_TEACHER" || role === "TEACHER" || role === "HOMEROOM_TEACHER"),
  });

  const publishedHomeworkCount = useMemo(() => {
    if (!selectedClassId) {
      return teacherHomeworkRaw.filter((h) => h.isPublished).length;
    }
    return teacherHomeworkRaw.filter(
      (h) => h.isPublished && String(h.classId) === String(selectedClassId)
    ).length;
  }, [teacherHomeworkRaw, selectedClassId]);

  const recentHomework = useMemo(() => {
    return teacherHomeworkRaw
      .filter((h) => h.isPublished && (!selectedClassId || String(h.classId) === String(selectedClassId)))
      .slice(0, 5);
  }, [teacherHomeworkRaw, selectedClassId]);

  useEffect(() => {
    const saved = localStorage.getItem("teacher_profile_photo");
    if (saved) setProfilePhoto(saved);
  }, []);

  useEffect(() => {
    if (!selectedClassId && classes.length > 0) {
      setSelectedClassId(classes[0].classId);
    }
  }, [classes, selectedClassId]);

  useEffect(() => {
    const run = async () => {
      if (!selectedClassId) return;
      const today = new Date().toISOString().slice(0, 10);
      const academicYear = selectedClass?.academicYear || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
      try {
        const att = await api.get(`/attendance/class/${selectedClassId}`, { params: { date: today } });
        // eslint-disable-next-line no-console
        console.log("Dashboard attendance today:", att);
        setTodaySummary(att?.data?.summary || { total: 0, present: 0, absent: 0, late: 0 });
      } catch {
        setTodaySummary({ total: 0, present: 0, absent: 0, late: 0 });
      }

      // Fetch roster students for selected class
      try {
        // eslint-disable-next-line no-console
        console.log("[TeacherDashboard] GET /teacher/classes/:classId/students", { selectedClassId });
        const sRes = await api.get(`/teacher/classes/${selectedClassId}/students`);
        const roster = sRes?.data ?? sRes?.data?.data ?? sRes ?? [];
        setStudents(Array.isArray(roster) ? roster : []);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[TeacherDashboard] fetch students failed:", e);
        setStudents([]);
      }

      // Build weekly attendance (last 5 days) from real API calls
      const days = [];
      for (let i = 4; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const day = d.toLocaleDateString("en-US", { weekday: "short" });
        try {
          const att = await api.get(`/attendance/class/${selectedClassId}`, { params: { date: dateStr } });
          const sum = att?.data?.summary || {};
          days.push({ day, present: sum.present || 0, absent: sum.absent || 0 });
        } catch {
          days.push({ day, present: 0, absent: 0 });
        }
      }
      setWeeklyAttendance(days);

      // Grades summary from teacher grades endpoint (only if subject is available)
      if (selectedClass?.subjectTaught) {
        try {
          const g = await api.get(`/teacher/classes/${selectedClassId}/grades`, {
            params: { subjectName: selectedClass.subjectTaught },
          });
          // eslint-disable-next-line no-console
          console.log("Dashboard grades:", g);
          const gradeStudents = g?.data?.students || [];
          const structure = g?.data?.structure || [];
          const totals = gradeStudents.map((s) => structure.reduce((a, comp) => a + (s.marks?.[comp.id] || 0), 0));
          const avg = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : null;
          const passCount = totals.length ? totals.filter((t) => t >= 50).length : null;
          const failCount = totals.length ? totals.filter((t) => t < 50).length : null;
          const groups = { A: 0, B: 0, C: 0, D: 0, F: 0 };
          totals.forEach((t) => {
            if (t >= 90) groups.A += 1;
            else if (t >= 80) groups.B += 1;
            else if (t >= 70) groups.C += 1;
            else if (t >= 50) groups.D += 1;
            else groups.F += 1;
          });
          setGradesSummary({
            classAverage: avg,
            passCount,
            failCount,
            gradeDistribution: Object.entries(groups).map(([name, count]) => ({ name, count })),
          });
        } catch {
          setGradesSummary({ classAverage: null, passCount: null, failCount: null, gradeDistribution: [] });
        }
      } else {
        setGradesSummary({ classAverage: null, passCount: null, failCount: null, gradeDistribution: [] });
      }

      // Teacher timetable preview (today)
      try {
        const profileRes = await api.get("/teacher/profile");
        const profile = profileRes?.data?.data ?? profileRes?.data ?? profileRes;
        const teacherId = profile?.teacherId;
        if (teacherId) {
          const y = new Date().getFullYear();
          const fallbackYear = `${y}/${y + 1}`;
          const resolvedAcademicYear = profile?.academicYear || selectedClass?.academicYear || academicYear || fallbackYear;

          const timetableRes = await timetableService.getTeacherTimetable(teacherId, { academicYear: resolvedAcademicYear });
          // eslint-disable-next-line no-console
          console.log("Teacher dashboard timetable:", { resolvedAcademicYear, timetableRes });
          const timetableData = timetableRes?.data?.data ?? timetableRes?.data ?? timetableRes ?? {};
          const dayMap = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
          const todayKey = dayMap[new Date().getDay()] || "MONDAY";
          const todaySlots = Array.isArray(timetableData?.schedule?.[todayKey]) ? timetableData.schedule[todayKey] : [];
          setTodayTimetable(todaySlots.filter((slot) => slot?.type === "class"));
        } else {
          setTodayTimetable([]);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log("Teacher dashboard timetable failed:", e?.message);
        setTodayTimetable([]);
      }
    };
    run();
  }, [selectedClassId, selectedClass?.subjectTaught, selectedClass?.academicYear]);

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target.result;
      localStorage.setItem("teacher_profile_photo", url);
      setProfilePhoto(url);
    };
    reader.readAsDataURL(file);
  };

  const attendancePie = [
    { name: "Present", value: todaySummary.present || 0 },
    { name: "Absent", value: todaySummary.absent || 0 },
    { name: "Late", value: todaySummary.late || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <label className="relative cursor-pointer group flex-shrink-0">
            {profilePhoto ? (
              <img src={profilePhoto} alt="Profile" className="w-12 h-12 rounded-full border-2 border-border object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full gradient-primary border-2 border-border flex items-center justify-center text-primary-foreground font-bold text-lg">T</div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-3.5 h-3.5 text-white" />
            </div>
            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
          </label>
          <div>
            <h1 className="text-2xl font-bold text-heading">Dashboard Overview</h1>
            <p className="text-sm text-text-secondary">
              Welcome back{user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}. Here's what's happening today.
            </p>
            {loadingClasses && (
              <p className="text-[11px] text-muted-foreground mt-1">Loading your assigned classes...</p>
            )}
            {!loadingClasses && classesError && (
              <p className="text-[11px] text-destructive mt-1">
                Failed to load classes: {classesError}
              </p>
            )}
            {!loadingClasses && !classesError && classesResponse?.data && (
              <p className="text-[11px] text-muted-foreground mt-1">
                You are assigned to {classesResponse.count ?? classesResponse.data.length ?? 0} class
                {(classesResponse.count ?? classesResponse.data.length ?? 0) === 1 ? "" : "es"}.
              </p>
            )}
          </div>
        </div>
        <select
          value={selectedClassId || ""}
          onChange={(e) => setSelectedClassId(Number(e.target.value) || null)}
          className="px-4 py-2.5 rounded-xl border border-border bg-card text-sm text-heading font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[240px]"
        >
          {classes.map((c) => (
            <option key={c.classId} value={c.classId}>
              {c.className} {c.subjectTaught ? `- ${c.subjectTaught}` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Recent Announcements */}
      <motion.div {...card(0)} className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-heading text-sm flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            Recent Announcements
          </h3>
          <Link to="/teacher/messages" className="text-xs text-primary flex items-center gap-1 hover:underline">
            View all <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        {dashboardAnnouncements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No announcements available.</p>
        ) : (
          <div className="space-y-3">
            {dashboardAnnouncements.slice(0, 5).map((item) => (
              <div key={item.announcementId} className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                <p className="text-sm font-semibold text-heading">{item.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: "Total Students", value: selectedClass?._count?.students ?? "—", icon: Users, color: "text-primary", bg: "bg-primary/10" },
          { label: "Present Today", value: todaySummary.present ?? "—", icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
          { label: "Active Homework", value: publishedHomeworkCount, icon: BookOpen, color: "text-info", bg: "bg-info/10" },
          { label: "Class Average", value: gradesSummary.classAverage === null ? "—" : `${gradesSummary.classAverage.toFixed(1)}%`, icon: BarChart3, color: "text-secondary", bg: "bg-secondary/10" },
          { label: "Passed", value: gradesSummary.passCount ?? "—", icon: TrendingUp, color: "text-success", bg: "bg-success/10" },
          { label: "Failed", value: gradesSummary.failCount ?? "—", icon: TrendingDown, color: "text-destructive", bg: "bg-destructive/10" },
        ].map((s, i) => (
          <motion.div key={s.label} {...card(i)} className="bg-card rounded-xl border border-border p-4">
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-4.5 h-4.5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-heading">{s.value}</p>
            <p className="text-[11px] text-text-secondary font-medium mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Attendance Trend */}
        <motion.div {...card(6)} className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-heading text-sm">Weekly Attendance</h3>
            <Link to="/teacher/attendance" className="text-xs text-primary flex items-center gap-1 hover:underline">
              View Details <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyAttendance} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(215, 14%, 47%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(215, 14%, 47%)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(214, 32%, 91%)", fontSize: 12 }} />
              <Bar dataKey="present" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} name="Present" />
              <Bar dataKey="absent" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} name="Absent" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Today's Attendance Pie */}
        <motion.div {...card(7)} className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-heading text-sm mb-2">Today's Attendance</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={attendancePie} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {attendancePie.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {attendancePie.map((entry, i) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                {entry.name} ({entry.value})
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grade Distribution */}
        <motion.div {...card(8)} className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-heading text-sm">Grade Distribution</h3>
            <Link to="/teacher/grades" className="text-xs text-primary flex items-center gap-1 hover:underline">
              View Grades <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={gradesSummary.gradeDistribution}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(215, 14%, 47%)" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="count" fill="hsl(217, 91%, 60%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Student Roster */}
        <motion.div {...card(9)} className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-heading text-sm">Students</h3>
            <p className="text-[11px] text-text-secondary">
              {students?.length ?? 0} total
            </p>
          </div>

          {students?.length ? (
            <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
              {students.map((s) => (
                <div key={s?.studentId ?? s?.id} className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-heading truncate">
                      {s?.user?.fullName ?? s?.fullName ?? s?.studentName ?? s?.name ?? "Student"}
                    </p>
                    <p className="text-[10px] text-text-secondary mt-0.5">
                      ID: {s?.studentId ?? s?.id ?? "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No students found for this class.</p>
          )}
        </motion.div>

        {/* Today's Timetable */}
        <motion.div {...card(9)} className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-heading text-sm">Today's Timetable</h3>
            <Link to="/teacher/timetable" className="text-xs text-primary flex items-center gap-1 hover:underline">
              View Full <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {todayTimetable.length ? (
            <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
              {todayTimetable.slice(0, 6).map((slot, idx) => (
                <div key={slot?.timetableId || idx} className="rounded-lg border border-border px-3 py-2">
                  <p className="text-sm font-medium text-heading">{slot?.subject?.name || "-"}</p>
                  <p className="text-[11px] text-text-secondary">
                    {slot?.class?.name || "-"} • {slot?.startTime || "--"} - {slot?.endTime || "--"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No classes scheduled for today.</p>
          )}
        </motion.div>
      </div>

      {/* Homework Reminders (no mock) */}
      <motion.div {...card(10)} className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-heading text-sm flex items-center gap-2">
            <Bell className="w-4 h-4 text-warning" />
            Homework Reminders
          </h3>
          <Link to="/teacher/homework" className="text-xs text-primary flex items-center gap-1 hover:underline">
            Manage <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        {recentHomework.length === 0 ? (
          <p className="text-xs text-text-secondary">No published homework for this class yet.</p>
        ) : (
          <ul className="space-y-2">
            {recentHomework.map((h) => (
              <li key={h.homeworkId} className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                <p className="text-sm font-medium text-heading">{h.topic}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {h.subjectName || h.subject?.subjectName || "—"}
                  {h.createdAt ? ` · ${new Date(h.createdAt).toLocaleDateString()}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </motion.div>
    </div>
  );
}
