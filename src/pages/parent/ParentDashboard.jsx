import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CalendarCheck, Star, MessageSquare, Clock } from "lucide-react";
import api from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import ChildSelector from "@/components/parent/ChildSelector";
import { messageService } from "@/services/messageService";
import { gradeService } from "@/services/gradeService";
import { attendanceService } from "@/services/attendanceService";
import { announcementService } from "@/services/announcementService";

const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

const toISODate = (d) => d.toISOString().slice(0, 10);

export default function ParentDashboard() {
  const { user } = useAuth();
  const academicYearFallback = `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;

  const [selectedChild, setSelectedChild] = useState(null);

  const currentMonthRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { startDate: toISODate(start), endDate: toISODate(end) };
  }, []);

  const { data: children, isLoading: childrenLoading } = useQuery({
    queryKey: ["parentChildren"],
    queryFn: async () => {
      // eslint-disable-next-line no-console
      if (import.meta?.env?.DEV) console.debug("[ParentDashboard] GET /parents/me/children");
      const res = await api.get("/parents/me/children");
      // eslint-disable-next-line no-console
      if (import.meta?.env?.DEV) console.debug("[ParentDashboard] response.data (children)", res);
      return res?.data ?? [];
    },
  });

  useEffect(() => {
    if (!selectedChild && Array.isArray(children) && children.length > 0) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);

  const selectedChildObj = Array.isArray(children) ? children.find((c) => c?.id === selectedChild) : null;
  const effectiveAcademicYear = selectedChildObj?.academicYear ?? academicYearFallback;

  const { data: unreadCountRes } = useQuery({
    queryKey: ["parentUnreadCount"],
    queryFn: () => messageService.getUnreadCount(),
  });

  const unreadCount =
    unreadCountRes?.data?.unreadCount ??
    unreadCountRes?.unreadCount ??
    unreadCountRes?.data ??
    0;

  const { data: conversationsRes } = useQuery({
    queryKey: ["parentConversations"],
    queryFn: () => messageService.getConversations(),
  });

  const { data: announcementsRes } = useQuery({
    queryKey: ["parentAnnouncements"],
    queryFn: () => announcementService.getAll(),
  });

  const conversations = Array.isArray(conversationsRes?.data)
    ? conversationsRes.data
    : Array.isArray(conversationsRes)
      ? conversationsRes
      : [];
  const announcements = Array.isArray(announcementsRes)
    ? announcementsRes
    : (Array.isArray(announcementsRes?.data) ? announcementsRes.data : []);
  // eslint-disable-next-line no-console
  console.log("user role:", "PARENT");
  // eslint-disable-next-line no-console
  console.log("announcements:", announcements);

  const { data: gradeSummaryRes } = useQuery({
    queryKey: ["studentSummary", selectedChild, effectiveAcademicYear],
    queryFn: () => gradeService.getStudentSummary(selectedChild, { academicYear: effectiveAcademicYear }),
    enabled: !!selectedChild && !!effectiveAcademicYear,
  });

  const subjects = Array.isArray(gradeSummaryRes?.subjects) ? gradeSummaryRes.subjects : [];
  const avg = typeof gradeSummaryRes?.summary?.average === "number" ? Math.round(gradeSummaryRes.summary.average) : 0;

  const topSubjects = useMemo(() => {
    return [...subjects].sort((a, b) => Number(b.average ?? 0) - Number(a.average ?? 0)).slice(0, 4);
  }, [subjects]);

  const { data: attendanceDataRes } = useQuery({
    queryKey: ["studentAttendanceMonth", selectedChild, currentMonthRange.startDate, currentMonthRange.endDate],
    queryFn: () => attendanceService.getStudentAttendance(selectedChild, currentMonthRange),
    enabled: !!selectedChild,
  });

  const attendanceStats = attendanceDataRes?.statistics ?? { total: 0, present: 0, absent: 0, late: 0 };
  const presentPct = attendanceStats.presentPercentage ? Number(attendanceStats.presentPercentage) : 0;

  if (childrenLoading) {
    return (
      <div className="space-y-6">
        <div className="text-sm text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ChildSelector children={children ?? []} selectedChild={selectedChild} onSelect={setSelectedChild} />

      {/* Welcome */}
      <motion.div {...anim} className="gradient-primary rounded-xl p-6 text-primary-foreground relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <p className="text-xs opacity-80 uppercase tracking-wider">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
          <h1 className="text-2xl font-bold mt-1">
            Welcome back{user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}!
          </h1>
          <p className="text-sm opacity-90 mt-2">Here is your child’s latest real progress.</p>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Attendance (Month)",
            value: `${presentPct}%`,
            icon: CalendarCheck,
            color: "text-success",
            bg: "bg-success/10",
          },
          {
            label: "Average Grade",
            value: `${avg}%`,
            icon: Star,
            color: "text-primary",
            bg: "bg-primary/10",
          },
          {
            label: "Messages",
            value: String(unreadCount || 0),
            icon: MessageSquare,
            color: "text-info",
            bg: "bg-info/10",
          },
          {
            label: "This Month Records",
            value: String(attendanceStats.total ?? 0),
            icon: Clock,
            color: "text-heading",
            bg: "bg-muted",
          },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            {...anim}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl border border-border p-4 hover:shadow-card-hover transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
            </div>
            <p className="text-xl font-bold text-heading">{s.value}</p>
            <p className="text-[11px] text-text-secondary mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Top Subjects */}
          <motion.div {...anim} transition={{ delay: 0.05 }} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-heading flex items-center gap-2">
                <Star className="w-4 h-4 text-muted-foreground" /> Top Subjects
              </h3>
            </div>
            {topSubjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No grades available.</p>
            ) : (
              <div className="space-y-3">
                {topSubjects.map((s) => (
                  <div key={s.subjectId ?? s.subjectName} className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-heading truncate">{s.subjectName ?? "—"}</p>
                      {s.teacherName && <p className="text-xs text-text-secondary mt-0.5 truncate">{s.teacherName}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-heading">{Math.round(Number(s.average ?? 0))}%</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        <div className="space-y-6">
          {/* Recent Messages */}
          <motion.div {...anim} transition={{ delay: 0.1 }} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-heading flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" /> Recent Conversations
              </h3>
            </div>
            {conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No conversations yet.</p>
            ) : (
              <div className="space-y-3">
                {conversations.slice(0, 5).map((m) => (
                  <div key={m.userId ?? m.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MessageSquare className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-heading truncate">{m.fullName ?? m.name ?? m.from ?? "Teacher"}</p>
                      <p className="text-[10px] text-text-secondary truncate mt-0.5">{m.preview ?? m.lastMessage ?? m.subject ?? ""}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{m.updatedAt ?? m.time ?? ""}</p>
                    </div>
                    {m.unread && <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />}
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Attendance Summary */}
          <motion.div {...anim} transition={{ delay: 0.15 }} className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-semibold text-heading mb-4">Attendance Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Present</span>
                <span className="font-semibold text-heading">{attendanceStats.present ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Late</span>
                <span className="font-semibold text-heading">{attendanceStats.late ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Absent</span>
                <span className="font-semibold text-heading">{attendanceStats.absent ?? 0}</span>
              </div>
            </div>
          </motion.div>

          <motion.div {...anim} transition={{ delay: 0.12 }} className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-semibold text-heading mb-4">Announcements</h3>
            {announcements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No announcements yet.</p>
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
      </div>
    </div>
  );
}

