import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, RefreshCw } from "lucide-react";
import { attendanceService } from "@/services/attendanceService";
import { classService } from "@/services/classService";
import AttendanceSummaryCards from "@/components/attendance/AttendanceSummaryCards";
import WebcamDemoPanel from "@/components/attendance/WebcamDemoPanel";
import AttendanceTable from "@/components/attendance/AttendanceTable";
import WrongClassAlerts from "@/components/attendance/WrongClassAlerts";

export default function AdminAttendancePage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedClassId, setSelectedClassId] = useState("ALL");
  const [expectedRole, setExpectedRole] = useState("ALL");

  const { data: classesRaw = [] } = useQuery({
    queryKey: ["attendanceClasses"],
    queryFn: () => classService.getAll({ isActive: true }),
  });

  const classOptions = useMemo(
    () => (Array.isArray(classesRaw) ? classesRaw : []),
    [classesRaw]
  );

  const selectedClassName = useMemo(() => {
    if (selectedClassId === "ALL") return null;
    const selectedClass = classOptions.find((cls) => String(cls.classId) === String(selectedClassId));
    return selectedClass?.className || null;
  }, [classOptions, selectedClassId]);

  // Fetch summary stats
  const { data: summaryRes, isLoading: loadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ["attendanceSummary", selectedDate, selectedClassId, expectedRole],
    queryFn: () =>
      attendanceService.getSchoolWideAttendanceSummary({
        date: selectedDate,
        classId: selectedClassId === "ALL" ? undefined : selectedClassId,
        role: expectedRole === "ALL" ? undefined : expectedRole,
      }),
    retry: 1,
  });

  // Fetch all attendance records
  const { data: attendanceRes, isLoading: loadingAttendance, refetch: refetchAttendance } = useQuery({
    queryKey: ["allAttendance", selectedDate, selectedClassId, expectedRole],
    queryFn: () =>
      attendanceService.getAllAttendance({
        date: selectedDate,
        classId: selectedClassId === "ALL" ? undefined : selectedClassId,
        role: expectedRole === "ALL" ? undefined : expectedRole,
      }),
    retry: 1,
  });

  // Fetch alerts
  const { data: alertsRes, isLoading: loadingAlerts, refetch: refetchAlerts } = useQuery({
    queryKey: ["attendanceAlerts", selectedDate, selectedClassId],
    queryFn: () =>
      attendanceService.getAttendanceAlerts({
        date: selectedDate,
        classId: selectedClassId === "ALL" ? undefined : selectedClassId,
      }),
    retry: 1,
  });

  // Extract raw data from API response shapes
  const summaryData = summaryRes?.data || summaryRes || {};
  const attendanceData = attendanceRes?.data || attendanceRes?.records || (Array.isArray(attendanceRes) ? attendanceRes : []);
  const alertsData = alertsRes?.data || alertsRes?.alerts || (Array.isArray(alertsRes) ? alertsRes : []);

  const handleRefresh = () => {
    refetchSummary();
    refetchAttendance();
    refetchAlerts();
  };

  const handleRecognitionSuccess = () => {
    // Invalidate queries to trigger a refetch of the tables and stats
    queryClient.invalidateQueries({ queryKey: ["attendanceSummary", selectedDate] });
    queryClient.invalidateQueries({ queryKey: ["allAttendance", selectedDate] });
    queryClient.invalidateQueries({ queryKey: ["attendanceAlerts", selectedDate] });
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
            <CalendarCheck className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-heading">Automated Attendance</h1>
            <p className="text-sm text-text-secondary">Simulate and monitor facial recognition hardware</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-border bg-card text-sm text-heading font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
          >
            <option value="ALL">All Classes</option>
            {classOptions.map((cls) => (
              <option key={cls.classId} value={String(cls.classId)}>
                {cls.className || `Grade ${cls.gradeLevel}${cls.section ? `-${cls.section}` : ""}`}
              </option>
            ))}
          </select>
          <select
            value={expectedRole}
            onChange={(e) => setExpectedRole(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-border bg-card text-sm text-heading font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
          >
            <option value="ALL">All People</option>
            <option value="STUDENT">Students</option>
            <option value="TEACHER">Teachers</option>
          </select>
          <button
            onClick={handleRefresh}
            className="p-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-heading transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-border bg-card text-sm text-heading font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <AttendanceSummaryCards data={summaryData} isLoading={loadingSummary} />

      {/* Split Layout: Camera & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <WebcamDemoPanel
            onRecognitionSuccess={handleRecognitionSuccess}
            selectedClassId={selectedClassId === "ALL" ? null : selectedClassId}
            selectedClassName={selectedClassName}
            expectedRole={expectedRole}
          />
        </div>
        <div className="lg:col-span-1">
          <WrongClassAlerts alerts={alertsData} isLoading={loadingAlerts} />
        </div>
      </div>

      {/* Full Width Table */}
      <div className="min-h-[400px]">
        <AttendanceTable
          data={attendanceData}
          isLoading={loadingAttendance}
          classOptions={classOptions.map((cls) => cls.className).filter(Boolean)}
        />
      </div>
    </div>
  );
}
