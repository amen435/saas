import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import { gradeService } from "@/services/gradeService";
import { attendanceService } from "@/services/attendanceService";
import { timetableService } from "@/services/timetableService";
import { announcementService } from "@/services/announcementService";
import { LoadingSpinner } from "@/components/shared/LoadingStates";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarCheck, Star, Clock, TrendingUp, XCircle, BookOpen } from "lucide-react";

const anim = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

function gradeColor(avg) {
  const a = Number(avg ?? 0);
  if (a >= 90) return "text-success";
  if (a >= 80) return "text-primary";
  if (a >= 70) return "text-warning";
  return "text-destructive";
}

function getTodayDayKey() {
  // timetableView.service uses MONDAY..SUNDAY (uppercase) keys
  const map = {
    0: "SUNDAY",
    1: "MONDAY",
    2: "TUESDAY",
    3: "WEDNESDAY",
    4: "THURSDAY",
    5: "FRIDAY",
    6: "SATURDAY",
  };
  return map[new Date().getDay()] ?? "MONDAY";
}

export default function StudentDashboard() {
  const { user } = useAuth();

  const fallbackAcademicYear = useMemo(() => {
    const y = new Date().getFullYear();
    return `${y}/${y + 1}`;
  }, []);

  const studentIdFromUser = user?.studentId ?? user?.userId;

  const {
    data: profileRes,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery({
    queryKey: ["studentProfile", "me"],
    enabled: !!user,
    queryFn: async () => {
      const res = await api.get("/students/me");
      // eslint-disable-next-line no-console
      console.debug("[StudentDashboard] student profile response:", res);
      return res;
    },
  });

  const profile = profileRes?.data?.data ?? profileRes?.data ?? profileRes;
  const parsedStudentIdFromUser = studentIdFromUser != null ? parseInt(studentIdFromUser, 10) : null;
  const studentId = profile?.studentId ?? (Number.isInteger(parsedStudentIdFromUser) ? parsedStudentIdFromUser : null);
  const academicYear = profile?.academicYear ?? fallbackAcademicYear;
  const classId = profile?.classId ?? profile?.class?.classId ?? null;

  const {
    data: gradesRes,
    isLoading: gradesLoading,
    error: gradesError,
  } = useQuery({
    queryKey: ["studentGradesSummary", studentId, academicYear],
    enabled: !!studentId && !!academicYear,
    queryFn: async () => {
      const res = await gradeService.getStudentSummary(studentId, { academicYear });
      // eslint-disable-next-line no-console
      console.debug("[StudentDashboard] grades response:", res);
      return res;
    },
  });

  const {
    data: attendanceRes,
    isLoading: attendanceLoading,
    error: attendanceError,
  } = useQuery({
    queryKey: ["studentAttendance", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const res = await attendanceService.getStudentAttendance(studentId);
      // eslint-disable-next-line no-console
      console.debug("[StudentDashboard] attendance response:", res);
      return res;
    },
  });

  const {
    data: timetableRes,
    isLoading: timetableLoading,
    error: timetableError,
  } = useQuery({
    queryKey: ["studentTimetable", classId, academicYear],
    enabled: !!academicYear && !!classId,
    queryFn: async () => {
      const res = await timetableService.getClassTimetable(classId, { academicYear });
      // eslint-disable-next-line no-console
      console.debug("[StudentDashboard] timetable response:", res);
      // eslint-disable-next-line no-console
      console.debug("[StudentDashboard] classId:", classId);
      return res;
    },
  });

  const { data: announcementsRes } = useQuery({
    queryKey: ["studentAnnouncements"],
    queryFn: () => announcementService.getAll(),
  });

  const { data: homeworkListRaw } = useQuery({
    queryKey: ["classHomework", "studentDashboard", classId],
    enabled: !!classId,
    queryFn: async () => {
      const response = await api.get(`/ai/homework/class/${classId}`);
      // eslint-disable-next-line no-console
      console.log("homework response:", response.data);
      const body = response.data?.data ?? response.data;
      const data = Array.isArray(body) ? body : [];
      // eslint-disable-next-line no-console
      console.log("mapped homework:", data);
      return data;
    },
  });

  const homeworkCount = Array.isArray(homeworkListRaw) ? homeworkListRaw.length : 0;

  const grades = gradesRes ?? {};
  const subjects = Array.isArray(grades?.subjects) ? grades.subjects : [];
  const overallAverage = grades?.summary?.average ?? null;
  const overallRank = grades?.overallRank?.rank ?? null;
  const overallRankTotal = grades?.overallRank?.totalStudents ?? null;

  const attendance = attendanceRes ?? {};
  const stats = attendance?.statistics ?? {};
  const totalAttendance = Number(stats?.total ?? (stats.present + stats.absent + stats.late) ?? 0);
  const presentCount = Number(stats?.present ?? 0);
  const absentCount = Number(stats?.absent ?? 0);
  const presentPct =
    typeof stats?.presentPercentage === "string"
      ? stats.presentPercentage
      : totalAttendance > 0
        ? ((presentCount / totalAttendance) * 100).toFixed(0)
        : "0.00";

  const timetable = timetableRes?.data?.data ?? timetableRes?.data ?? timetableRes ?? {};
  const announcements = Array.isArray(announcementsRes)
    ? announcementsRes
    : (Array.isArray(announcementsRes?.data) ? announcementsRes.data : []);
  // eslint-disable-next-line no-console
  console.log("user role:", "STUDENT");
  // eslint-disable-next-line no-console
  console.log("announcements:", announcements);
  const todayKey = getTodayDayKey();
  const todayRaw = timetable?.schedule?.[todayKey] ?? [];
  const todaySlots = Array.isArray(todayRaw) ? todayRaw : Object.values(todayRaw || {});
  const todaysClasses = todaySlots.filter((e) => e?.type === "class" || (e?.subject && !e?.status)).slice(0, 6);

  const anyLoading = profileLoading || gradesLoading || attendanceLoading || timetableLoading;
  if (anyLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <Skeleton className="h-8 w-56 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  const fatalError = profileError || gradesError || attendanceError || timetableError;
  if (fatalError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[220px] gap-2">
        <p className="text-sm text-destructive font-medium">Failed to load dashboard data.</p>
        <p className="text-xs text-muted-foreground">
          {profileError?.message || gradesError?.message || attendanceError?.message || timetableError?.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Student Info Card */}
      <motion.div {...anim} className="gradient-primary rounded-xl p-6 text-primary-foreground relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <p className="text-xs opacity-80 uppercase tracking-wider">Student Dashboard</p>
          <h1 className="text-2xl font-bold mt-1">{profile?.fullName ?? user?.fullName ?? "Student"}</h1>
          <p className="text-sm opacity-90 mt-2">
            {profile?.className ? (
              <>
                Class <span className="font-semibold">{profile.className}</span>
              </>
            ) : (
              "Class: --"
            )}
          </p>
          {profile?.schoolName && (
            <p className="text-[11px] opacity-90 mt-1">
              School <span className="font-semibold">{profile.schoolName}</span>
            </p>
          )}
          <p className="text-[11px] opacity-90 mt-1">
            Academic Year <span className="font-semibold">{academicYear}</span>
          </p>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div {...anim} transition={{ delay: 0.05 }} className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5 text-success" />
            </div>
            <span className="text-[10px] text-success font-medium bg-success/10 px-2 py-0.5 rounded-full">
              Present
            </span>
          </div>
          <p className="text-xl font-bold text-heading">{presentPct}%</p>
          <p className="text-[11px] text-text-secondary mt-0.5">
            {presentCount} present · {absentCount} absent
          </p>
        </motion.div>

        <motion.div {...anim} transition={{ delay: 0.1 }} className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Star className="w-5 h-5 text-primary" />
            </div>
            <span className="text-[10px] text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
              Grades
            </span>
          </div>
          <p className="text-xl font-bold text-heading">{overallAverage != null ? `${Math.round(overallAverage)}%` : "—"}</p>
          <p className="text-[11px] text-text-secondary mt-0.5">Overall average</p>
        </motion.div>

        <motion.div {...anim} transition={{ delay: 0.15 }} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-warning" />
            </div>
            <span className="text-[10px] text-warning font-medium bg-warning/10 px-2 py-0.5 rounded-full">
              Rank
            </span>
              </div>
          <p className="text-xl font-bold text-heading">{overallRank != null ? `#${overallRank}` : "—"}</p>
          <p className="text-[11px] text-text-secondary mt-0.5">
            {overallRankTotal ? `Out of ${overallRankTotal} students` : "Class standing"}
          </p>
        </motion.div>

        <motion.div {...anim} transition={{ delay: 0.2 }} className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-destructive" />
            </div>
            <span className="text-[10px] text-destructive font-medium bg-destructive/10 px-2 py-0.5 rounded-full">
              Absences
            </span>
          </div>
          <p className="text-xl font-bold text-heading">{absentCount}</p>
          <p className="text-[11px] text-text-secondary mt-0.5">Total absents</p>
          </motion.div>
      </div>

      <motion.div {...anim} className="bg-card rounded-xl border border-border p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-info" />
          </div>
          <div>
            <p className="text-sm font-semibold text-heading">Homework</p>
            <p className="text-xs text-muted-foreground">
              {classId ? `${homeworkCount} published assignment${homeworkCount === 1 ? "" : "s"}` : "Join a class to see homework."}
            </p>
          </div>
        </div>
        <Link to="/student/homework" className="text-xs font-medium text-primary px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors">
          Open hub
        </Link>
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Timetable preview */}
        <motion.div {...anim} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-heading flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" /> Today Timetable ({todayKey})
              </h3>
            <Link to="/student/timetable" className="text-xs font-medium text-primary hover:underline">
              View Full
            </Link>
            </div>
          {todaysClasses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No classes scheduled for today.</p>
          ) : (
            <div className="space-y-3">
              {todaysClasses.map((slot) => (
                <div key={slot?.timetableId ?? `${slot?.periodNumber}-${slot?.subject?.id}`} className="rounded-xl p-3.5 border border-border bg-muted/20">
                  <p className="text-sm font-semibold text-heading">{slot?.subject?.name ?? "—"}</p>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    {slot?.teacher?.name ?? "—"} · {slot?.room ?? ""}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {slot?.startTime ?? "--"} - {slot?.endTime ?? "--"}
                  </p>
                      </div>
              ))}
            </div>
          )}
          </motion.div>

        {/* Middle: Grades summary */}
        <motion.div {...anim} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-heading flex items-center gap-2">
              <Star className="w-4 h-4 text-muted-foreground" /> Grades Summary
              </h3>
            <Link to="/student/grades" className="text-xs font-medium text-primary hover:underline">
              View All
            </Link>
            </div>

          {subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No grades found for this academic year.</p>
          ) : (
            <div className="space-y-3">
              {subjects.slice(0, 8).map((s) => (
                <div key={s.subjectId ?? s.subjectName} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-background">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-heading truncate">{s.subjectName}</p>
                    {s.teacherName && <p className="text-[11px] text-text-secondary mt-0.5 truncate">{s.teacherName}</p>}
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${gradeColor(s.average)}`}>{Math.round(Number(s.average ?? 0))}%</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Rank: {s.rank ?? "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Right: Attendance summary */}
        <motion.div {...anim} className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-heading flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-muted-foreground" /> Attendance Summary
            </h3>
            <Link to="/student/attendance" className="text-xs font-medium text-primary hover:underline">
              View Full
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3 border border-border bg-success/5">
              <p className="text-[11px] text-text-secondary">Present</p>
              <p className="text-xl font-bold text-success mt-1">{presentCount}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{presentPct}%</p>
            </div>
            <div className="rounded-xl p-3 border border-border bg-destructive/5">
              <p className="text-[11px] text-text-secondary">Absent</p>
              <p className="text-xl font-bold text-destructive mt-1">{absentCount}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {totalAttendance > 0 ? `${Math.round(((absentCount / totalAttendance) * 100))}%` : "—"}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs text-text-secondary mb-2">Tip: Check detailed records from the Attendance page.</p>
            <div className="flex gap-2 flex-wrap">
              <Link
                to="/student/attendance"
                className="text-xs font-bold text-primary px-3 py-2 rounded-lg border border-border hover:bg-muted/30 transition-colors"
              >
                Open Attendance
              </Link>
            </div>
          </div>
          </motion.div>
      </div>

      <motion.div {...anim} className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold text-heading mb-3">Announcements</h3>
        {announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No announcements.</p>
        ) : (
          <div className="space-y-2">
            {announcements.slice(0, 5).map((a) => (
              <div key={a.announcementId} className="rounded-lg border border-border p-3">
                <p className="text-sm font-semibold text-heading">{a.title}</p>
                <p className="text-xs text-text-secondary mt-1">{a.message}</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
