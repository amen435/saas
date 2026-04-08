import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BarChart, Bar, CartesianGrid, LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Bell, CalendarCheck, GraduationCap, School, TrendingUp, Users } from "lucide-react";
import { announcementService } from "@/services/announcementService";
import { aiService } from "@/services/aiService";
import { gradeService } from "@/services/gradeService";
import { teacherAttendanceService } from "@/services/teacherAttendanceService";
import { useAuth } from "@/contexts/AuthContext";

const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

function getAcademicYear() {
  const year = new Date().getFullYear();
  return `${year}/${year + 1}`;
}

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

function getLastNDates(days) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - index - 1));
    return {
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      value: toISODate(date),
    };
  });
}

function unwrapData(response) {
  return response?.data?.data || response?.data || response || null;
}

export default function AdminDashboard() {
  const { user, activeRole } = useAuth();
  const [semester, setSemester] = useState("ALL");
  const academicYear = useMemo(() => getAcademicYear(), []);
  const last7Days = useMemo(() => getLastNDates(7), []);
  const today = useMemo(() => toISODate(new Date()), []);
  const effectiveRole = String(activeRole || user?.role || "").toUpperCase();
  const isSchoolAdmin = effectiveRole === "SCHOOL_ADMIN";

  const { data: announcementsRes } = useQuery({
    queryKey: ["adminAnnouncements"],
    queryFn: () => announcementService.getAll(),
    enabled: isSchoolAdmin,
  });

  const { data: schoolOverviewRes } = useQuery({
    queryKey: ["adminSchoolOverview", academicYear],
    queryFn: () => aiService.getSchoolOverview(academicYear),
    enabled: isSchoolAdmin,
  });

  const { data: teacherAttendanceTodayRes } = useQuery({
    queryKey: ["adminTeacherAttendanceToday", today],
    queryFn: () => teacherAttendanceService.getSchool({ date: today }),
    enabled: isSchoolAdmin,
  });

  const { data: teacherAttendanceWeeklyRes } = useQuery({
    queryKey: ["adminTeacherAttendanceWeekly", last7Days.map((day) => day.value).join(",")],
    queryFn: async () => {
      const rows = await Promise.all(
        last7Days.map(async (day) => {
          const response = await teacherAttendanceService.getSchool({ date: day.value });
          const data = unwrapData(response);
          const summary = data?.summary || {};
          return {
            day: day.label,
            present: Number(summary.present || 0),
            absent: Number(summary.absent || 0),
            late: Number(summary.late || 0),
          };
        })
      );
      return rows;
    },
    enabled: isSchoolAdmin,
  });

  const { data: schoolRankingsRes } = useQuery({
    queryKey: ["adminSchoolRankings", academicYear, semester],
    queryFn: async () => {
      const response = await gradeService.getOverallSchoolRankings({
        academicYear,
        ...(semester !== "ALL" ? { semester } : {}),
      });
      const data = unwrapData(response);
      // eslint-disable-next-line no-console
      console.log("admin rankings data:", data);
      return Array.isArray(data) ? data : [];
    },
    enabled: isSchoolAdmin,
  });

  const announcements = Array.isArray(announcementsRes)
    ? announcementsRes
    : Array.isArray(announcementsRes?.data)
      ? announcementsRes.data
      : [];

  const schoolOverview = unwrapData(schoolOverviewRes) || {};
  const overview = schoolOverview?.overview || {};
  const teacherAttendanceToday = unwrapData(teacherAttendanceTodayRes) || {};
  const teacherSummary = teacherAttendanceToday?.summary || {};
  const teacherAttendanceWeekly = Array.isArray(teacherAttendanceWeeklyRes) ? teacherAttendanceWeeklyRes : [];

  const topStudents = useMemo(() => {
    const rows = Array.isArray(schoolRankingsRes) ? schoolRankingsRes : [];
    return rows.slice(0, 10).map((student, index) => ({
      rank: Number(student?.schoolRank ?? student?.rank ?? index + 1),
      name: student?.studentName || student?.fullName || student?.name || "Student",
      average: Number(student?.averageScore ?? student?.average ?? 0).toFixed(1),
      className: student?.className || student?.class?.className || "-",
    }));
  }, [schoolRankingsRes]);

  const kpis = [
    {
      label: "Students",
      value: overview.totalStudents ?? 0,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
      hint: "Active students",
    },
    {
      label: "Teachers",
      value: teacherSummary.total ?? 0,
      icon: GraduationCap,
      color: "text-secondary",
      bg: "bg-secondary/10",
      hint: "Attendance roster today",
    },
    {
      label: "Average Grade",
      value: overview.averagePerformance != null ? `${overview.averagePerformance}%` : "-",
      icon: TrendingUp,
      color: "text-success",
      bg: "bg-success/10",
      hint: academicYear,
    },
    {
      label: "Attendance Rate",
      value: overview.attendanceRate != null ? `${overview.attendanceRate}%` : "-",
      icon: CalendarCheck,
      color: "text-warning",
      bg: "bg-warning/10",
      hint: "Last 30 days",
    },
    {
      label: "At-Risk Students",
      value: overview.atRiskStudents ?? 0,
      icon: School,
      color: "text-destructive",
      bg: "bg-destructive/10",
      hint: "2+ failed subjects",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">School Analytics</h1>
          <p className="text-sm text-text-secondary">Live attendance, grades, school overview, and rankings</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-card text-sm text-heading"
          >
            <option value="ALL">Full Year</option>
            <option value="SEMESTER_1">Semester 1</option>
            <option value="SEMESTER_2">Semester 2</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((item, index) => (
          <motion.div key={item.label} {...anim} transition={{ delay: index * 0.04 }} className="bg-card rounded-xl border border-border p-4">
            <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center mb-3`}>
              <item.icon className={`w-5 h-5 ${item.color}`} />
            </div>
            <p className="text-2xl font-bold text-heading">{item.value}</p>
            <p className="text-[11px] text-text-secondary mt-0.5">{item.label}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{item.hint}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div {...anim} transition={{ delay: 0.1 }} className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-heading text-sm">Teacher Attendance Trend</h3>
            <p className="text-[11px] text-muted-foreground">Last 7 days</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={teacherAttendanceWeekly}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip />
              <Bar dataKey="present" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="absent" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="late" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div {...anim} transition={{ delay: 0.14 }} className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-heading text-sm">Teacher Attendance Summary</h3>
            <Link to="/admin/attendance" className="text-xs text-primary hover:underline">
              Open attendance
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Present", value: teacherSummary.present ?? 0 },
              { label: "Absent", value: teacherSummary.absent ?? 0 },
              { label: "Late", value: teacherSummary.late ?? 0 },
              { label: "Not Recorded", value: teacherSummary.notRecorded ?? 0 },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-[11px] text-text-secondary">{item.label}</p>
                <p className="text-xl font-bold text-heading mt-1">{item.value}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div {...anim} transition={{ delay: 0.18 }} className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-heading text-sm">Top 10 Students</h3>
              <p className="text-[11px] text-muted-foreground">
                {academicYear} | {semester === "SEMESTER_1" ? "Semester 1" : semester === "SEMESTER_2" ? "Semester 2" : "Full Year"}
              </p>
            </div>
            <Link to="/admin/grades" className="text-xs text-primary hover:underline">
              Open grades
            </Link>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2 px-3 text-[10px] font-semibold uppercase text-text-secondary">
              <span>Rank</span>
              <span>Average</span>
              <span>Class</span>
              <span>Name</span>
            </div>
            {topStudents.length > 0 ? topStudents.map((student) => (
              <div
                key={`${student.rank}-${student.name}-${student.className}`}
                className="grid grid-cols-4 gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
              >
                <p className="text-xs font-semibold text-heading">#{student.rank}</p>
                <p className="text-xs font-semibold text-success">{student.average}%</p>
                <p className="text-xs text-heading">{student.className}</p>
                <p className="text-xs text-heading">{student.name}</p>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">No ranking data available for this selection.</p>
            )}
          </div>
        </motion.div>

        <motion.div {...anim} transition={{ delay: 0.22 }} className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-heading text-sm flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              Recent Announcements
            </h3>
            <Link to="/admin/messages" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          {announcements.length > 0 ? (
            <div className="space-y-3">
              {announcements.slice(0, 5).map((announcement) => (
                <div key={announcement.announcementId} className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                  <p className="text-sm font-semibold text-heading">{announcement.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{announcement.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No announcements available.</p>
          )}
        </motion.div>
      </div>

      <motion.div {...anim} transition={{ delay: 0.26 }} className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-heading text-sm">Weekly Presence vs Absence</h3>
          <p className="text-[11px] text-muted-foreground">Teacher attendance balance</p>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={teacherAttendanceWeekly}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip />
            <Line type="monotone" dataKey="present" stroke="hsl(var(--success))" strokeWidth={2.5} />
            <Line type="monotone" dataKey="absent" stroke="hsl(var(--destructive))" strokeWidth={2.5} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
