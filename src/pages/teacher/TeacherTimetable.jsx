import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Printer, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { teacherService } from "@/services/teacherService";
import { timetableService } from "@/services/timetableService";
import { LoadingSpinner } from "@/components/shared/LoadingStates";

const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const dayLabel = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export default function TeacherTimetable() {
  const { user } = useAuth();
  const [teacherId, setTeacherId] = useState(null);
  const [academicYear, setAcademicYear] = useState(`${new Date().getFullYear()}/${new Date().getFullYear() + 1}`);
  const [timetable, setTimetable] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const loadTeacher = async () => {
      try {
        const profileRes = await teacherService.getProfile();
        const profile = profileRes?.data?.data || profileRes?.data || profileRes || {};
        if (!mounted) return;
        setTeacherId(profile?.teacherId ?? null);
        if (profile?.academicYear) setAcademicYear(profile.academicYear);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed to load teacher profile.");
        setLoading(false);
      }
    };
    loadTeacher();
    return () => {
      mounted = false;
    };
  }, [user?.userId]);

  useEffect(() => {
    let mounted = true;
    const fetchTimetable = async () => {
      if (!teacherId) return;
      setLoading(true);
      setError("");
      try {
        // Teacher flow uses teacherId only (no classId dependency)
        const response = await timetableService.getTeacherTimetable(teacherId, { academicYear });
        const data = response?.data?.data || response?.data || {};
        const periodConfigs = Array.isArray(data?.periods) ? data.periods : [];
        const schedule = data?.schedule || {};
        const entries = days.flatMap((day) => {
          const slots = Array.isArray(schedule?.[day]) ? schedule[day] : [];
          return slots
            .filter((slot) => slot?.type === "class")
            .map((slot) => ({
              timetableId: slot?.timetableId ?? `${day}-${slot?.periodNumber ?? Math.random()}`,
              dayOfWeek: day,
              periodNumber: slot?.periodNumber ?? null,
              periodName: slot?.periodName ?? "",
              subjectName: slot?.subject?.name ?? "",
              className: slot?.class?.name ?? "",
              startTime: slot?.startTime ?? "",
              endTime: slot?.endTime ?? "",
              room: slot?.room ?? "",
            }));
        });

        // eslint-disable-next-line no-console
        console.log("periods:", periodConfigs);
        if (!mounted) return;
        setPeriods(periodConfigs);
        setTimetable(entries);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed to load timetable.");
        setTimetable([]);
        setPeriods([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchTimetable();
    return () => {
      mounted = false;
    };
  }, [teacherId, academicYear]);

  const grouped = useMemo(() => {
    return days.map((day) => ({
      day,
      items: timetable.filter((item) => item.dayOfWeek === day),
    }));
  }, [timetable]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-heading">My Schedule</h1>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-heading">My Schedule</h1>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-col sm:flex-row">
        <div>
          <h1 className="text-2xl font-bold text-heading">My Schedule</h1>
          <p className="text-sm text-text-secondary">
            Teacher ID: {teacherId || "—"} · Academic Year {academicYear}
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-heading hover:bg-muted transition-colors"
        >
          <Printer className="w-3.5 h-3.5" /> Print
        </button>
      </div>

      <motion.div {...anim} className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-heading">Teacher Timetable</h3>
          <p className="text-xs text-text-secondary">
            {timetable.length} class{timetable.length === 1 ? "" : "es"}
          </p>
        </div>

        {timetable.length === 0 ? (
          <p className="text-sm text-muted-foreground">No timetable entries found for this teacher.</p>
        ) : (
          <div className="space-y-4">
            {grouped.map(({ day, items }) => (
              <div key={day} className="rounded-lg border border-border">
                <div className="px-3 py-2 border-b border-border bg-muted/30 text-sm font-semibold text-heading">
                  {dayLabel[day]}
                </div>
                {items.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">No classes</div>
                ) : (
                  <div className="divide-y divide-border">
                    {items.map((period) => (
                      <div key={period.timetableId} className="px-3 py-2 text-sm flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-heading">{period.subjectName || "-"}</p>
                          <p className="text-xs text-text-secondary">{period.className || "-"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {period.startTime || "--"} - {period.endTime || "--"}
                          </p>
                          <p className="text-xs text-muted-foreground">{period.room || "-"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {periods.length > 0 && (
        <div className="flex flex-wrap gap-4 text-[11px] text-text-secondary">
          {periods.map((p) => (
            <span key={p.periodNumber} className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              {p.periodName || `P${p.periodNumber}`}: {p.startTime || "--:--"} - {p.endTime || "--:--"}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
