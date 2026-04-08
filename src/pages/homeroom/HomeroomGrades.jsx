import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, TrendingUp, Trophy } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import api from "@/services/api";
import { gradeService } from "@/services/gradeService";

function unwrapApi(response) {
  return response?.data ?? response ?? null;
}

function extractData(response) {
  return response?.data?.data || response?.data || response;
}

function pickArray(payload, keys = ["data"]) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function pickNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export default function HomeroomGrades() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classStudents, setClassStudents] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [semester, setSemester] = useState("ALL");

  const [overview, setOverview] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [atRiskStudents, setAtRiskStudents] = useState([]);
  const [trends, setTrends] = useState([]);
  const [studentDetail, setStudentDetail] = useState(null);
  const [subjectReport, setSubjectReport] = useState(null);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedClass = useMemo(
    () => classes.find((c) => String(c?.classId ?? c?.id) === String(selectedClassId)) || null,
    [classes, selectedClassId]
  );

  const selectedSubject = useMemo(
    () => subjects.find((s) => String(s?.subjectId ?? s?.id ?? s?._id) === String(selectedSubjectId)) || null,
    [subjects, selectedSubjectId]
  );

  const requestParams = useMemo(() => {
    if (!selectedClass || !selectedSubject) return null;
    return {
      classId: Number(selectedClass?.classId ?? selectedClass?.id),
      subjectId: Number(selectedSubject?.subjectId ?? selectedSubject?.id ?? selectedSubject?._id),
      teacherId: Number(selectedClass?.homeroomTeacherId ?? selectedClass?.teacherId ?? selectedClass?.assignedTeacherId),
      academicYear: String(selectedClass?.academicYear || ""),
    };
  }, [selectedClass, selectedSubject]);

  const fetchInitialFilters = async () => {
    const [classRes, subjectRes] = await Promise.all([api.get("/homeroom/my-homeroom-classes"), api.get("/subjects")]);
    // eslint-disable-next-line no-console
    console.log("my-homeroom-classes:", classRes);
    // eslint-disable-next-line no-console
    console.log("subjects:", subjectRes);

    const classData = extractData(classRes);
    const subjectData = extractData(subjectRes);
    const classList = pickArray(classData, ["data", "classes"]);
    const subjectList = pickArray(subjectData, ["data", "subjects"]);

    setClasses(classList);
    setSubjects(subjectList);

    if (classList.length > 0 && !selectedClassId) {
      setSelectedClassId(String(classList[0]?.classId ?? classList[0]?.id ?? ""));
    }
    if (subjectList.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(String(subjectList[0]?.subjectId ?? subjectList[0]?.id ?? subjectList[0]?._id ?? ""));
    }
  };

  const fetchDashboardData = async (params) => {
    const [reportRes, rankingRes] = await Promise.all([
      api.get("/grades/class-report", {
        params: {
          ...params,
          ...(semester !== "ALL" ? { semester } : {}),
        },
      }),
      gradeService.getOverallRankings({
        classId: params.classId,
        academicYear: params.academicYear,
        ...(semester !== "ALL" ? { semester } : {}),
      }),
    ]);

    // eslint-disable-next-line no-console
    console.log("class-report:", reportRes);
    // eslint-disable-next-line no-console
    console.log("rankings:", rankingRes);

    const report = extractData(reportRes) || {};
    const rankingList = pickArray(extractData(rankingRes), ["data", "rankings", "students"]);

    const totalStudents = pickNumber(report?.totalStudents, rankingList.length);
    const passCount = pickNumber(report?.passCount, 0);
    const failCount = pickNumber(report?.failCount, 0);
    const students = Array.isArray(report?.students) ? report.students : [];
    const avg =
      students.length > 0
        ? students.reduce((sum, s) => sum + pickNumber(s?.percentage, 0), 0) / students.length
        : rankingList.length > 0
          ? rankingList.reduce((sum, s) => sum + pickNumber(s?.percentage, 0), 0) / rankingList.length
          : 0;

    setOverview({ classAverage: avg, totalStudents, passCount, failCount });
    setSubjectReport(report);
    setRankings(rankingList);

    try {
      const atRiskRes = await api.get(`/ai/analytics/at-risk-students/${params.classId}`, {
        params: { academicYear: params.academicYear },
      });
      // eslint-disable-next-line no-console
      console.log("ai at-risk-students:", atRiskRes);
      const aiAtRiskData = extractData(atRiskRes);
      const aiAtRisk = pickArray(aiAtRiskData, ["atRiskStudents", "students", "data"]);
      setAtRiskStudents(aiAtRisk);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log("at-risk fallback:", e?.message);
      const fallbackAtRisk = students.filter((s) => String(s?.status).toUpperCase() === "FAIL");
      setAtRiskStudents(fallbackAtRisk);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError("");
      try {
        await fetchInitialFilters();
      } catch (e) {
        setError(e.message || "Failed to load initial filters");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const loadClassStudents = async () => {
      if (!selectedClassId) {
        setClassStudents([]);
        return;
      }
      try {
        const response = await api.get(`/homeroom/classes/${selectedClassId}/students`);
        // eslint-disable-next-line no-console
        console.log("class-students:", response);
        const list = pickArray(extractData(response), ["data", "students"]);
        setClassStudents(list);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log("class-students failed:", e?.message);
        setClassStudents([]);
      }
    };
    loadClassStudents();
  }, [selectedClassId]);

  useEffect(() => {
    const load = async () => {
      if (!requestParams || !requestParams.teacherId || !requestParams.academicYear) return;
      setLoading(true);
      setError("");
      try {
        await fetchDashboardData(requestParams);
      } catch (e) {
        setError(e.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [requestParams, semester]);

  useEffect(() => {
    if (!selectedStudentId) return;
    const existsInClass = classStudents.some((s) => String(s?.studentId) === String(selectedStudentId));
    if (!existsInClass) {
      setSelectedStudentId("");
    }
  }, [classStudents, selectedStudentId]);

  useEffect(() => {
    const loadStudentDetail = async () => {
      if (!selectedStudentId || !requestParams?.academicYear) {
        setStudentDetail(null);
        return;
      }
      setDetailLoading(true);
      try {
        const response = await api.get(`/grades/student-summary/${selectedStudentId}`, {
          params: {
            academicYear: requestParams.academicYear,
            ...(semester !== "ALL" ? { semester } : {}),
          },
        });
        // eslint-disable-next-line no-console
        console.log("student-summary:", response);
        setStudentDetail(extractData(response) || null);
      } catch (e) {
        setStudentDetail(null);
        // eslint-disable-next-line no-console
        console.log("student-summary failed:", e?.message);
      } finally {
        setDetailLoading(false);
      }
    };
    loadStudentDetail();
  }, [selectedStudentId, requestParams, semester]);

  useEffect(() => {
    const loadTrends = async () => {
      const targetStudentId = selectedStudentId || rankings?.[0]?.studentId;
      if (!targetStudentId) {
        setTrends([]);
        return;
      }
      try {
        const response = await api.get(`/ai/analytics/performance-trends/${targetStudentId}`);
        // eslint-disable-next-line no-console
        console.log("performance-trends:", response);
        const trendData = extractData(response);
        const trendRows = pickArray(trendData, ["trends", "data"]);
        setTrends(trendRows);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log("performance-trends failed:", e?.message);
        setTrends([]);
      }
    };
    loadTrends();
  }, [selectedStudentId, rankings]);

  const trendData = useMemo(
    () =>
      trends.map((t, i) => ({
        label: String(t?.academicYear || t?.label || `Point ${i + 1}`),
        average: pickNumber(t?.average, 0),
      })),
    [trends]
  );

  const normalizedRankings = useMemo(
    () =>
      rankings.map((row, index) => ({
        rank: pickNumber(row?.rank, index + 1),
        name: row?.fullName || row?.studentName || row?.name || "Student",
        average: pickNumber(row?.average ?? row?.avg ?? row?.percentage, 0),
        studentId: row?.studentId ?? "",
      })),
    [rankings]
  );

  const classStudentOptions = useMemo(() => {
    const byId = new Map();

    classStudents.forEach((student) => {
      const id = student?.studentId;
      if (!id) return;
      byId.set(String(id), {
        studentId: String(id),
        name: student?.user?.fullName || student?.fullName || student?.name || `Student ${id}`,
      });
    });

    (subjectReport?.students || []).forEach((student) => {
      const id = student?.studentId;
      if (!id || byId.has(String(id))) return;
      byId.set(String(id), {
        studentId: String(id),
        name: student?.studentName || student?.name || `Student ${id}`,
      });
    });

    normalizedRankings.forEach((student) => {
      const id = student?.studentId;
      if (!id || byId.has(String(id))) return;
      byId.set(String(id), {
        studentId: String(id),
        name: student?.name || `Student ${id}`,
      });
    });

    return Array.from(byId.values());
  }, [classStudents, subjectReport, normalizedRankings]);

  const renderedRankings = useMemo(() => {
    const rankMap = new Map(normalizedRankings.map((r) => [String(r.studentId), r]));
    return classStudentOptions.map((s, index) => {
      const ranked = rankMap.get(String(s.studentId));
      return ranked || { rank: "-", name: s.name, average: 0, studentId: s.studentId, noGrade: true, fallbackIndex: index };
    });
  }, [classStudentOptions, normalizedRankings]);

  const normalizedAtRisk = useMemo(
    () =>
      atRiskStudents
        .map((row) => ({
          name: row?.studentName || row?.fullName || row?.name || "Student",
          average: pickNumber(row?.averageScore ?? row?.average ?? row?.avg ?? row?.percentage, 0),
          riskLevel: row?.riskLevel || row?.status || "At Risk",
          studentId: row?.studentId ?? "",
        }))
        .filter((row) => row.average < 65)
        .map((row) => ({
          ...row,
          riskLevel: "At Risk (<65)",
        })),
    [atRiskStudents]
  );

  const detailSubjects = useMemo(() => {
    const list = studentDetail?.subjects;
    return Array.isArray(list) ? list : [];
  }, [studentDetail]);

  // eslint-disable-next-line no-console
  console.log("render rankings:", rankings);
  // eslint-disable-next-line no-console
  console.log("render classStudentOptions:", classStudentOptions);

  if (loading || !overview) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading">Performance Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Read-only analytics and student insights for homeroom monitoring</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-border bg-card text-sm text-heading"
          >
            {classes.map((c) => {
              const id = c?.classId ?? c?.id;
              const label = c?.className || `Class ${id}`;
              return (
                <option key={id} value={id}>
                  {label}
                </option>
              );
            })}
          </select>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-border bg-card text-sm text-heading"
          >
            {subjects.map((s) => {
              const id = s?.subjectId ?? s?.id ?? s?._id;
              return (
                <option key={id} value={id}>
                  {s?.subjectName || s?.name || `Subject ${id}`}
                </option>
              );
            })}
          </select>
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-border bg-card text-sm text-heading"
          >
            <option value="ALL">Full Year</option>
            <option value="SEMESTER_1">Semester 1</option>
            <option value="SEMESTER_2">Semester 2</option>
          </select>
        </div>
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      {!loading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-xs uppercase text-text-secondary">Class Average</p>
              <p className="text-2xl font-bold text-heading mt-2">{pickNumber(overview?.classAverage, 0).toFixed(1)}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-xs uppercase text-text-secondary">Total Students</p>
              <p className="text-2xl font-bold text-heading mt-2">{pickNumber(overview?.totalStudents, 0)}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-xs uppercase text-text-secondary">Passed</p>
              <p className="text-2xl font-bold text-emerald-600 mt-2">{pickNumber(overview?.passCount, 0)}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-xs uppercase text-text-secondary">Failed</p>
              <p className="text-2xl font-bold text-destructive mt-2">{pickNumber(overview?.failCount, 0)}</p>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-heading">Overall Class Rankings</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase">Rank</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase">Student</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase">Average Score</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(renderedRankings) && renderedRankings.length > 0 ? (
                  renderedRankings.map((student) => (
                    <tr key={`${student.studentId}-${student.rank}`} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3 text-sm font-medium text-heading">#{student.rank}</td>
                      <td className="px-5 py-3 text-sm text-heading">{student.name}</td>
                      <td className="px-5 py-3 text-sm text-text-secondary">{student.noGrade ? "-" : student.average.toFixed(1)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-sm text-muted-foreground">
                      No ranking data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-heading mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              At-Risk Students
            </h3>
            {normalizedAtRisk.length > 0 ? (
              <div className="space-y-2">
                {normalizedAtRisk.map((student) => (
                  <div
                    key={student.studentId || student.name}
                    className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3"
                  >
                    <p className="text-sm font-medium text-destructive">{student.name}</p>
                    <p className="text-xs text-destructive">
                      Avg: {student.average.toFixed(1)} • {student.riskLevel}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No at-risk students detected</p>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-heading mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Performance Trends
            </h3>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Line type="monotone" dataKey="average" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">No trend data available</p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              <h3 className="text-sm font-semibold text-heading">Student Detail (Optional)</h3>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-sm text-heading"
              >
                <option value="">Select student</option>
                {classStudentOptions.map((student) => (
                  <option key={student.studentId || student.name} value={student.studentId}>
                    {student.name}
                  </option>
                ))}
              </select>
              {!classStudentOptions.length && (
                <p className="text-sm text-muted-foreground">No students found for the selected class.</p>
              )}
              {detailLoading && selectedStudentId && <p className="text-sm text-muted-foreground">Loading student detail...</p>}
              {!detailLoading && selectedStudentId && (
                <div className="space-y-2">
                  <p className="text-sm text-heading">Average: {pickNumber(studentDetail?.summary?.average, 0).toFixed(1)}</p>
                  <div className="space-y-1">
                    {detailSubjects.length > 0 ? (
                      detailSubjects.map((subject) => (
                        <div key={subject?.subjectId} className="flex items-center justify-between text-sm">
                          <span className="text-text-secondary">{subject?.subjectName || "Subject"}</span>
                          <span className="text-heading">{pickNumber(subject?.average, 0).toFixed(1)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No subject breakdown available</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              <h3 className="text-sm font-semibold text-heading">Subject Report (Optional)</h3>
              <p className="text-sm text-heading">Subject Average: {pickNumber(overview?.classAverage, 0).toFixed(1)}</p>
              <p className="text-sm text-text-secondary">
                Pass Count: {pickNumber(subjectReport?.passCount, 0)} | Fail Count: {pickNumber(subjectReport?.failCount, 0)}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
