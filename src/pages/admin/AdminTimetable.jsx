import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Printer } from "lucide-react";
import { toast } from "sonner";
import api from "@/services/api";
import { timetableService } from "@/services/timetableService";
import { classService } from "@/services/classService";
import { LoadingSpinner } from "@/components/shared/LoadingStates";
import { useTeachers } from "@/hooks/useTeachers";

const dayOptions = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

function extractData(response) {
  return response?.data?.data || response?.data || response;
}

export default function AdminTimetable() {
  const queryClient = useQueryClient();
  const defaultAcademicYear = `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
  const [academicYear, setAcademicYear] = useState(defaultAcademicYear);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [form, setForm] = useState({
    classId: "",
    subjectId: "",
    teacherId: "",
    dayOfWeek: "MONDAY",
    periodNumber: "",
    roomNumber: "",
  });

  const { data: classesRes = [] } = useQuery({
    queryKey: ["classes", "timetable-admin"],
    queryFn: () => classService.getAll(),
  });

  const { data: teachersRes = [] } = useTeachers({ isActive: true });

  const { data: subjectsRes = [] } = useQuery({
    queryKey: ["subjects", "timetable-admin"],
    queryFn: async () => {
      const response = await api.get("/subjects");
      const data = extractData(response);
      // eslint-disable-next-line no-console
      console.log("subjects:", data);
      return Array.isArray(data) ? data : [];
    },
  });

  const classes = useMemo(() => {
    const data = extractData(classesRes);
    return Array.isArray(data) ? data : [];
  }, [classesRes]);

  const selectedClass = useMemo(
    () => classes.find((c) => String(c?.classId ?? c?.id) === String(selectedClassId)) || null,
    [classes, selectedClassId]
  );
  useEffect(() => {
    if (selectedClass?.academicYear && selectedClass.academicYear !== academicYear) {
      setAcademicYear(selectedClass.academicYear);
    }
  }, [selectedClass, academicYear]);

  const teachers = useMemo(() => (Array.isArray(teachersRes) ? teachersRes : []), [teachersRes]);
  const subjects = useMemo(() => (Array.isArray(subjectsRes) ? subjectsRes : []), [subjectsRes]);

  useEffect(() => {
    if (!selectedClassId && classes.length) setSelectedClassId(String(classes[0]?.classId ?? classes[0]?.id ?? ""));
    if (!selectedTeacherId && teachers.length) setSelectedTeacherId(String(teachers[0]?.teacherId ?? teachers[0]?.id ?? ""));
    if (!form.classId && classes.length) setForm((p) => ({ ...p, classId: String(classes[0]?.classId ?? classes[0]?.id ?? "") }));
    if (!form.teacherId && teachers.length) setForm((p) => ({ ...p, teacherId: String(teachers[0]?.teacherId ?? teachers[0]?.id ?? "") }));
    if (!form.subjectId && subjects.length) setForm((p) => ({ ...p, subjectId: String(subjects[0]?.subjectId ?? subjects[0]?.id ?? "") }));
  }, [classes, teachers, subjects, selectedClassId, selectedTeacherId, form.classId, form.teacherId, form.subjectId]);

  const { data: periodRes } = useQuery({
    queryKey: ["timetable-periods", academicYear],
    queryFn: () => timetableService.getPeriods({ academicYear }),
  });
  const configuredPeriods = useMemo(() => {
    const data = extractData(periodRes);
    return Array.isArray(data?.periods) ? data.periods : [];
  }, [periodRes]);
  const periods = useMemo(() => {
    if (configuredPeriods.length > 0) return configuredPeriods;
    // Fallback to 7 standard periods when backend config missing for selected academic year.
    return Array.from({ length: 7 }, (_, i) => ({
      periodNumber: i + 1,
      periodName: `P${i + 1}`,
      startTime: "--:--",
      endTime: "--:--",
    }));
  }, [configuredPeriods]);

  const { data: classTableRes, isLoading: loadingClass } = useQuery({
    queryKey: ["timetable", "admin", "class", selectedClassId, academicYear],
    queryFn: () => timetableService.getClassTimetable(selectedClassId, { academicYear }),
    enabled: !!selectedClassId,
  });

  const { data: teacherTableRes, isLoading: loadingTeacher } = useQuery({
    queryKey: ["timetable", "admin", "teacher", selectedTeacherId, academicYear],
    queryFn: () => timetableService.getTeacherTimetable(selectedTeacherId, { academicYear }),
    enabled: !!selectedTeacherId,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => timetableService.create(payload),
    onSuccess: (response) => {
      // eslint-disable-next-line no-console
      console.log("create timetable:", extractData(response));
      toast.success("Timetable entry created");
      queryClient.invalidateQueries({ queryKey: ["timetable", "admin", "class", selectedClassId, academicYear] });
      queryClient.invalidateQueries({ queryKey: ["timetable", "admin", "teacher", selectedTeacherId, academicYear] });
    },
    onError: (error) => toast.error(error.message || "Failed to create timetable"),
  });

  const classSchedule = extractData(classTableRes)?.schedule || {};
  const teacherSchedule = extractData(teacherTableRes)?.schedule || {};
  // eslint-disable-next-line no-console
  console.log("class timetable response:", extractData(classTableRes));
  // eslint-disable-next-line no-console
  console.log("teacher timetable response:", extractData(teacherTableRes));

  const submitCreate = (e) => {
    e.preventDefault();
    if (!configuredPeriods.length) {
      toast.error(`No period configuration found for ${academicYear}. Configure periods first.`);
      return;
    }
    createMutation.mutate({
      classId: Number(form.classId),
      subjectId: Number(form.subjectId),
      teacherId: Number(form.teacherId),
      dayOfWeek: form.dayOfWeek,
      periodNumber: Number(form.periodNumber),
      roomNumber: form.roomNumber || null,
      academicYear,
    });
  };

  if (loadingClass || loadingTeacher) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" /> Timetable Management
          </h1>
          <p className="text-sm text-text-secondary">Academic year: {academicYear}</p>
        </div>
        <button onClick={() => window.print()} className="px-4 py-2 rounded-lg border border-border text-sm">
          <Printer className="w-4 h-4 inline mr-1" /> Print
        </button>
      </div>

      <form onSubmit={submitCreate} className="bg-card rounded-xl border border-border p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          value={academicYear}
          onChange={(e) => setAcademicYear(e.target.value)}
          placeholder="Academic year (e.g. 2025/2026)"
          className="px-3 py-2 rounded border border-border bg-background"
        />
        <select value={form.classId} onChange={(e) => setForm((p) => ({ ...p, classId: e.target.value }))} className="px-3 py-2 rounded border border-border bg-background">
          {classes.map((c) => {
            const id = c?.classId ?? c?.id;
            return <option key={id} value={id}>{c?.className || `Class ${id}`}</option>;
          })}
        </select>
        <select value={form.subjectId} onChange={(e) => setForm((p) => ({ ...p, subjectId: e.target.value }))} className="px-3 py-2 rounded border border-border bg-background">
          {subjects.map((s) => {
            const id = s?.subjectId ?? s?.id;
            return <option key={id} value={id}>{s?.subjectName || s?.name || `Subject ${id}`}</option>;
          })}
        </select>
        <select value={form.teacherId} onChange={(e) => setForm((p) => ({ ...p, teacherId: e.target.value }))} className="px-3 py-2 rounded border border-border bg-background">
          {teachers.map((t) => {
            const id = t?.teacherId ?? t?.id;
            const name = t?.user?.fullName || t?.fullName || "Teacher";
            return <option key={id} value={id}>{name}</option>;
          })}
        </select>
        <select value={form.dayOfWeek} onChange={(e) => setForm((p) => ({ ...p, dayOfWeek: e.target.value }))} className="px-3 py-2 rounded border border-border bg-background">
          {dayOptions.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={form.periodNumber} onChange={(e) => setForm((p) => ({ ...p, periodNumber: e.target.value }))} className="px-3 py-2 rounded border border-border bg-background">
          <option value="">Select period</option>
          {periods.map((p) => (
            <option key={p?.periodNumber} value={p?.periodNumber}>
              {p?.periodName || `P${p?.periodNumber}`} ({p?.startTime || "--:--"} - {p?.endTime || "--:--"})
            </option>
          ))}
        </select>
        <input
          value={form.roomNumber}
          onChange={(e) => setForm((p) => ({ ...p, roomNumber: e.target.value }))}
          placeholder="Room number (optional)"
          className="px-3 py-2 rounded border border-border bg-background"
        />
        <button
          type="submit"
          disabled={createMutation.isPending || !configuredPeriods.length}
          className="md:col-span-3 px-4 py-2 rounded-lg gradient-primary text-primary-foreground disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {createMutation.isPending ? "Creating..." : "Create Timetable Entry"}
        </button>
        {!configuredPeriods.length && (
          <p className="md:col-span-3 text-xs text-destructive">
            Period configuration is empty for {academicYear}. Backend will return 404 "Period not configured" until periods are configured.
          </p>
        )}
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-heading">Class Timetable</h3>
            <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="px-3 py-2 rounded border border-border bg-background text-sm">
              {classes.map((c) => {
                const id = c?.classId ?? c?.id;
                return <option key={id} value={id}>{c?.className || `Class ${id}`}</option>;
              })}
            </select>
          </div>
          <TimetableGrid schedule={classSchedule} />
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-heading">Teacher Timetable</h3>
            <select value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)} className="px-3 py-2 rounded border border-border bg-background text-sm">
              {teachers.map((t) => {
                const id = t?.teacherId ?? t?.id;
                const name = t?.user?.fullName || t?.fullName || "Teacher";
                return <option key={id} value={id}>{name}</option>;
              })}
            </select>
          </div>
          <TimetableGrid schedule={teacherSchedule} />
        </div>
      </div>
    </div>
  );
}

function TimetableGrid({ schedule }) {
  const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
  const referenceDay = days.find((d) => Array.isArray(schedule?.[d]) && schedule[d].length) || "MONDAY";
  const columns = Array.isArray(schedule?.[referenceDay]) ? schedule[referenceDay] : [];

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[900px] text-xs">
        <thead>
          <tr className="bg-muted/40 border-b border-border">
            <th className="px-3 py-2 text-left font-semibold text-heading w-28">Day</th>
            {columns.map((slot, i) => (
              <th key={`head-${i}`} className="px-2 py-2 text-left font-semibold text-heading min-w-[140px]">
                {slot?.type === "break" ? slot?.name || "Break" : slot?.periodName || `P${slot?.periodNumber || i + 1}`}
                <div className="text-[10px] text-muted-foreground font-normal">
                  {slot?.startTime || "--"} - {slot?.endTime || "--"}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day) => {
            const row = Array.isArray(schedule?.[day]) ? schedule[day] : [];
            return (
              <tr key={day} className="border-b border-border/60 last:border-b-0 align-top">
                <td className="px-3 py-2 font-semibold text-heading">{day}</td>
                {columns.map((_, index) => {
                  const slot = row[index];
                  if (!slot) return <td key={`${day}-${index}`} className="px-2 py-2 text-muted-foreground">-</td>;
                  if (slot?.type === "break") {
                    return (
                      <td key={`${day}-${index}`} className="px-2 py-2">
                        <span className="inline-block px-2 py-1 rounded bg-warning/15 text-warning font-medium">
                          {slot?.name || "Break"}
                        </span>
                      </td>
                    );
                  }
                  if (slot?.type === "free") {
                    return (
                      <td key={`${day}-${index}`} className="px-2 py-2 text-muted-foreground">
                        Free
                      </td>
                    );
                  }
                  return (
                    <td key={`${day}-${index}`} className="px-2 py-2">
                      <div className="font-semibold text-heading">{slot?.subject?.name || "-"}</div>
                      <div className="text-muted-foreground">{slot?.teacher?.name || slot?.class?.name || "-"}</div>
                      <div className="text-muted-foreground">{slot?.room || "-"}</div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
