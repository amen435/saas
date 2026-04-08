import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, TrendingUp, TrendingDown, Award, AlertTriangle, Edit3, Save, X, Check } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";
import { toast } from "sonner";
import api from "@/services/api";
import { classService } from "@/services/classService";
import { gradeService } from "@/services/gradeService";
import { subjectService } from "@/services/subjectService";
import GradeStructureEditor from "@/components/teacher/GradeStructureEditor";

const PASS_MARK = 50;
const PIE_COLORS = ["hsl(142, 71%, 45%)", "hsl(0, 84%, 60%)"];

function pickId(obj) {
  return obj?.id ?? obj?._id ?? obj?.componentId ?? obj?.studentId ?? obj?.classId ?? null;
}

function pickName(obj) {
  return (
    obj?.name ||
    obj?.fullName ||
    obj?.user?.fullName ||
    [obj?.firstName, obj?.lastName].filter(Boolean).join(" ") ||
    obj?.username ||
    obj?.email ||
    "Student"
  );
}

function normalizeComponents(raw = []) {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((c) => {
      const id = pickId(c);
      const component =
        c?.componentName || c?.component || c?.name || c?.title || c?.label || "Component";
      const weight =
        Number(c?.weight ?? c?.maxMarks ?? c?.totalMarks ?? c?.points ?? c?.maximum) || 0;
      const classId = c?.classId ?? c?.class?.id ?? c?.class?._id ?? c?.class?._id;
      return id
        ? {
            id,
            component,
            weight,
            classId,
            componentType: c?.componentType ?? c?.type ?? "",
            teacherId: c?.teacherId ?? c?.teacher?.id ?? c?.teacher?._id ?? null,
            subjectId: c?.subjectId ?? c?.subject?.id ?? c?.subject?._id ?? null,
            academicYear: c?.academicYear ?? c?.academic_year ?? "",
            description: c?.description ?? "",
          }
        : null;
    })
    .filter(Boolean);
}

function normalizeStudents(raw = []) {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((s) => {
      const id = pickId(s);
      if (!id) return null;
      const name = pickName(s);

      // Build marks map if backend already provides marks.
      const marks = {};
      const providedMarks = s?.marks || s?.grades || s?.components || s?.scores;
      if (Array.isArray(providedMarks)) {
        for (const m of providedMarks) {
          const compId = m?.componentId ?? m?.component?._id ?? m?.component?.id ?? m?.id ?? m?._id;
          const val = Number(m?.marksObtained ?? m?.score ?? m?.value ?? m?.marks ?? 0);
          if (compId != null) marks[compId] = val;
        }
      } else if (providedMarks && typeof providedMarks === "object") {
        for (const [k, v] of Object.entries(providedMarks)) {
          marks[k] = Number(v ?? 0);
        }
      }

      return { id, name, marks };
    })
    .filter(Boolean);
}

export default function TeacherGrades() {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedSubjectName, setSelectedSubjectName] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [teacherId, setTeacherId] = useState(null);
  const [subjectsByName, setSubjectsByName] = useState({});
  const [subjectsList, setSubjectsList] = useState([]);
  const [semester, setSemester] = useState("ALL");

  // NOTE: `structure` is now the grade components returned from the backend.
  const [structure, setStructure] = useState([]);
  const [students, setStudents] = useState([]);
  const [trendData, setTrendData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [editingCell, setEditingCell] = useState(null); // { studentId, compId }
  const [editValue, setEditValue] = useState("");
  
  const [structureEditorOpen, setStructureEditorOpen] = useState(false);
  const [structureEditorSaving, setStructureEditorSaving] = useState(false);

  const selectedClass = useMemo(
    () => classes.find((c) => c.classId === selectedClassId) || null,
    [classes, selectedClassId]
  );

  const totalWeight = structure.reduce((a, g) => a + (Number(g.weight) || 0), 0);
  const isValid = totalWeight > 0; // backend-defined components; treat as valid if any

  const enriched = students.map((s) => {
    const total = structure.reduce((a, g) => a + (s.marks[g.id] || 0), 0);
    return { ...s, total, status: total >= PASS_MARK ? "Pass" : "Fail" };
  });

  const classAvg = enriched.length ? (enriched.reduce((a, s) => a + s.total, 0) / enriched.length).toFixed(1) : "0";
  const highest = enriched.length ? Math.max(...enriched.map(s => s.total)) : 0;
  const lowest = enriched.length ? Math.min(...enriched.map(s => s.total)) : 0;
  const passedCount = enriched.filter(s => s.status === "Pass").length;
  const failedCount = enriched.filter(s => s.status === "Fail").length;

  const gradeGroups = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  enriched.forEach(s => {
    if (s.total >= 90) gradeGroups.A++;
    else if (s.total >= 80) gradeGroups.B++;
    else if (s.total >= 70) gradeGroups.C++;
    else if (s.total >= 50) gradeGroups.D++;
    else gradeGroups.F++;
  });
  const gradeDist = Object.entries(gradeGroups).map(([name, count]) => ({ name, count }));
  const passFail = [
    { name: "Passed", value: passedCount },
    { name: "Failed", value: failedCount },
  ];

  const fetchClasses = async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch teacherId (needed for /grades/components query)
      const prof = await api.get("/teacher/profile");
      const profData = prof?.data ?? prof;
      const tId = profData?.teacherId ?? profData?.data?.teacherId ?? profData?.teacher?.teacherId ?? null;
      setTeacherId(tId);
      // eslint-disable-next-line no-console
      console.log("GET /teacher/profile:", profData);
      // eslint-disable-next-line no-console
      console.log("resolved teacherId:", tId);

      // Fetch subjects list once and index by name for mapping subjectName -> subjectId
      const subjects = await subjectService.list();
      const byName = {};
      for (const s of subjects) {
        if (s?.name) byName[String(s.name).trim().toLowerCase()] = s;
        // Also index by code so `subjectTaught` values like "MATH-8" still resolve.
        if (s?.code) byName[String(s.code).trim().toLowerCase()] = s;
      }
      setSubjectsByName(byName);
      setSubjectsList(subjects);
      // eslint-disable-next-line no-console
      console.log("fetched subjects:", subjects);

      // Teacher assigned classes
      const res = await classService.getMyClasses();
      const list = Array.isArray(res) ? res : res?.data || [];
      // Debug
      // eslint-disable-next-line no-console
      console.log("fetched classes:", list);
      setClasses(list);

      if (!selectedClassId && list.length > 0) {
        // Prefer a class that has `subjectTaught` so marks can be loaded immediately.
        // Backend includes homeroom-only classes with `subjectTaught: null`.
        const firstGradableClass = list.find((c) => {
          const v = c?.subjectTaught;
          return v != null && String(v).trim().length > 0;
        });
        const initialClass = firstGradableClass ?? list[0];

        setSelectedClassId(initialClass?.classId ?? null);
        const nextSubjectName = initialClass?.subjectTaught || "";
        setSelectedSubjectName(nextSubjectName);

        if (nextSubjectName) {
          const key = String(nextSubjectName).trim().toLowerCase();
          const resolvedId = byName?.[key]?.id ?? null;
          if (resolvedId != null) {
            setSelectedSubjectId(resolvedId);
          } else {
            // Fallback: try match by name/code against the full subjects list.
            const subj =
              subjects.find((s) => String(s?.name ?? "").trim().toLowerCase() === key) ??
              subjects.find((s) => String(s?.code ?? "").trim().toLowerCase() === key) ??
              null;
            setSelectedSubjectId(subj?.id ?? subj?.subjectId ?? null);
          }
        } else {
          setSelectedSubjectId(null);
        }
      }
    } catch (e) {
      setError(e.message || "Failed to load classes.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Real marks + component structure loader:
   * GET /api/teacher/classes/:classId/grades?subjectName=...
   * Backend returns: { structure, students: [{ id, name, marks: {...}}], trendData }
   */
  const fetchTeacherClassGrades = async ({ classId, subjectName, semester: semesterFilter }) => {
    const normalizedSubjectName = String(subjectName ?? "").trim();
    if (!classId || !normalizedSubjectName) return;

    setLoading(true);
    setError("");
    try {
      // eslint-disable-next-line no-console
      console.log("classId:", classId);
      // eslint-disable-next-line no-console
      console.log("subject:", normalizedSubjectName);

      const response = await api.get(`/teacher/classes/${classId}/grades`, {
        params: {
          subjectName: normalizedSubjectName,
          ...(semesterFilter && semesterFilter !== "ALL" ? { semester: semesterFilter } : {}),
        },
      });
      const data = response.data?.data || response.data;

      // eslint-disable-next-line no-console
      console.log("response:", data);

      setStructure(normalizeComponents(data?.structure || []));
      setStudents(normalizeStudents(data?.students || []));
      setTrendData(data?.trendData || []);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("fetchTeacherClassGrades error:", e);
      setError(e?.response?.data?.error || e.message || "Failed to load grades.");
      setStructure([]);
      setStudents([]);
      setTrendData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsOfClass = async (classId) => {
    if (!classId) return;
    setLoading(true);
    setError("");
    try {
      // Use attendance roster endpoint (works for TEACHER) to get current class students
      const today = new Date().toISOString().slice(0, 10);
      const res = await api.get(`/attendance/class/${classId}`, { params: { date: today } });
      // Debug
      // eslint-disable-next-line no-console
      console.log(`GET /attendance/class/${classId}?date=${today}:`, res);

      const payload = res?.data ?? res;
      const rawStudents = Array.isArray(payload?.students) ? payload.students : [];
      const norm = normalizeStudents(
        rawStudents.map((s) => ({
          studentId: s.studentId,
          userId: s.userId,
          name: s.studentName,
          user: { fullName: s.studentName },
          marks: s.marks, // if backend ever adds marks here in future
        }))
      );
      // eslint-disable-next-line no-console
      console.log("fetched students:", norm);
      setStudents(norm);
    } catch (e) {
      setError(e.message || "Failed to load students.");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchGradeComponents = async ({ classId, subjectId, teacherId: tId, academicYear }) => {
    if (!classId || !subjectId || !tId || !academicYear) return;
    setLoading(true);
    setError("");
    try {
      const raw = await gradeService.getComponents({
        classId,
        subjectId,
        teacherId: tId,
        academicYear,
      });
      // backend returns: { components, totalWeight, ... }
      const data = raw?.components ? raw : raw?.data ?? raw;
      const list = data?.components ?? [];
      const all = normalizeComponents(list);
      const filtered = all.filter(
        (c) =>
          String(c.classId ?? classId) === String(classId) &&
          String(c.teacherId ?? tId) === String(tId)
      );
      // Debug
      // eslint-disable-next-line no-console
      console.log("fetched components:", { query: { classId, subjectId, teacherId: tId, academicYear }, allCount: all.length, filteredCount: filtered.length, filtered });
      setStructure(filtered);
    } catch (e) {
      setError(e.message || "Failed to load grade components.");
      setStructure([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchGrades = async ({ classId, subjectName: explicitSubjectName, semester: semesterFilter } = {}) => {
    if (!classId) return;
    const cls = classes.find((c) => String(c.classId) === String(classId));
    const subjectName = explicitSubjectName ?? cls?.subjectTaught ?? selectedSubjectName ?? "";
    if (!subjectName) return;
    await fetchTeacherClassGrades({ classId, subjectName, semester: semesterFilter ?? semester });
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const refreshGradeComponentsOnly = useCallback(async () => {
    if (!selectedClassId) return;
    const cls = classes.find((c) => String(c.classId) === String(selectedClassId));
    // Prefer the currently selected subject (dropdown). Fallback to class default.
    const subjectName = selectedSubjectName || cls?.subjectTaught || "";
    if (!subjectName) return;

    await fetchTeacherClassGrades({ classId: selectedClassId, subjectName, semester });
  }, [classes, selectedClassId, selectedSubjectName, semester]);

  // Re-fetch grade components right after a successful POST/PUT.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (evt) => {
      if (structureEditorSaving) return;
      const detail = evt?.detail ?? {};
      const payload = detail?.component ?? detail ?? {};

      // eslint-disable-next-line no-console
      console.log("gradeComponentsChanged event:", detail);

      const payloadClassId = payload?.classId ?? detail?.classId;
      const payloadTeacherId = payload?.teacherId ?? detail?.teacherId;

      if (payloadClassId != null && selectedClassId != null && String(payloadClassId) !== String(selectedClassId)) return;
      if (payloadTeacherId != null && teacherId != null && String(payloadTeacherId) !== String(teacherId)) return;

      refreshGradeComponentsOnly();
    };

    window.addEventListener("gradeComponentsChanged", handler);
    return () => window.removeEventListener("gradeComponentsChanged", handler);
  }, [refreshGradeComponentsOnly, selectedClassId, teacherId, structureEditorSaving]);

  // Safety net: if CRUD happens on another page, refresh when the user returns.
  const lastComponentsRefreshRef = useRef(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onFocus = () => {
      const now = Date.now();
      if (now - lastComponentsRefreshRef.current < 1500) return; // basic debounce
      lastComponentsRefreshRef.current = now;
      refreshGradeComponentsOnly();
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshGradeComponentsOnly]);

  const inferComponentTypeFromName = useCallback((name) => {
    const n = String(name || "").toLowerCase();
    if (n.includes("midterm")) return "MIDTERM";
    if (n.includes("final")) return "FINAL";
    if (n.includes("quiz")) return "QUIZ";
    if (n.includes("assignment")) return "ASSIGNMENT";
    return "QUIZ";
  }, []);

  const handleSaveGradeComponents = useCallback(
    async (nextComponents) => {
      if (!teacherId || !selectedClassId) return;
      // eslint-disable-next-line no-console
      console.log("handleSaveGradeComponents: nextComponents=", nextComponents);

      const cls = classes.find((c) => String(c.classId) === String(selectedClassId));
      const academicYearFromClass = cls?.academicYear || cls?.data?.academicYear || "";
      // Prefer the currently selected subject (dropdown). Fallback to class default.
      const subjectNameFromClass = selectedSubjectName || cls?.subjectTaught || "";
      const key = String(subjectNameFromClass || "").trim().toLowerCase();
      let subjectIdFromMap =
        selectedSubjectId ??
        subjectsByName?.[key]?.id ??
        cls?.subjectId ??
        cls?.subject?.subjectId ??
        cls?.subject?.id ??
        null;

      // eslint-disable-next-line no-console
      console.log("handleSaveGradeComponents: subject resolution:", {
        clsSubjectTaught: cls?.subjectTaught,
        subjectNameFromClass,
        key,
        selectedSubjectId,
        subjectsByNameKeyId: subjectsByName?.[key]?.id ?? null,
        subjectIdFromMap,
      });

      if (!academicYearFromClass) {
        toast.error("Academic year is missing for the selected class");
        return;
      }
      if (!subjectIdFromMap) {
        // Fallback: re-load subjects and try a more tolerant name match.
        try {
          const subjects = await subjectService.list();
          const classNorm = key;
          const matched =
            subjects.find((s) => {
              const n = String(s?.name ?? "").trim().toLowerCase();
              if (!n) return false;
              return n === classNorm || n.includes(classNorm) || classNorm.includes(n);
            }) ?? null;

          subjectIdFromMap = matched?.id ?? subjectIdFromMap;
        } catch (e) {
          // ignore; we'll show the toast below
        }
      }

      if (!subjectIdFromMap) {
        toast.error("Subject is missing for the selected class");
        return;
      }

      const existingIds = new Set((structure ?? []).map((c) => c.id).filter((id) => id != null));
      const nextIds = new Set((nextComponents ?? []).map((c) => c.id).filter((id) => id != null));

      const toDelete = (structure ?? []).filter((c) => c.id != null && !nextIds.has(c.id));
      const toCreate = (nextComponents ?? []).filter((c) => c.id == null);
      const toUpdate = (nextComponents ?? []).filter((c) => c.id != null && existingIds.has(c.id));

      // eslint-disable-next-line no-console
      console.log("handleSaveGradeComponents: diffs=", {
        existingCount: structure?.length ?? 0,
        nextCount: nextComponents?.length ?? 0,
        toDeleteCount: toDelete.length,
        toCreateCount: toCreate.length,
        toUpdateCount: toUpdate.length,
        toDeleteIds: toDelete.map((c) => c.id),
        toCreateNames: toCreate.map((c) => c.componentName),
        toUpdateIds: toUpdate.map((c) => c.id),
      });

      setStructureEditorSaving(true);
      try {
        // Deletes first to avoid constraint issues.
        for (const comp of toDelete) {
          // eslint-disable-next-line no-console
          console.log("Deleting componentId:", comp.id);
          try {
            const delRes = await gradeService.deleteComponent(comp.id);
            // eslint-disable-next-line no-console
            console.log("delete component response (hard delete):", delRes?.data ?? delRes);
          } catch (e) {
            // If component has existing marks, hard delete will fail.
            // Fall back to cascading delete with marks so the CRUD actually works.
            // eslint-disable-next-line no-console
            console.warn("deleteComponent failed, trying deleteComponentWithMarks", {
              componentId: comp.id,
              error: e?.response?.data?.error || e?.message || e,
            });
            const delWithMarksRes = await gradeService.deleteComponentWithMarks(comp.id);
            // eslint-disable-next-line no-console
            console.log(
              "delete component response (with-marks):",
              delWithMarksRes?.data ?? delWithMarksRes
            );
          }
        }

        for (const comp of toCreate) {
          // eslint-disable-next-line no-console
          console.log("Creating component:", comp.componentName, comp.weight);
          await gradeService.createComponent({
            classId: selectedClassId,
            subjectId: subjectIdFromMap,
            teacherId: teacherId,
            academicYear: academicYearFromClass,
            componentName: comp.componentName,
            componentType: inferComponentTypeFromName(comp.componentName),
            weight: comp.weight,
            description: comp.description || null,
          });
        }

        for (const comp of toUpdate) {
          // eslint-disable-next-line no-console
          console.log("Updating componentId:", comp.id, comp.componentName, comp.weight);
          await gradeService.updateComponent(comp.id, {
            classId: selectedClassId,
            subjectId: subjectIdFromMap,
            teacherId: teacherId,
            academicYear: academicYearFromClass,
            componentName: comp.componentName,
            componentType: inferComponentTypeFromName(comp.componentName),
            weight: comp.weight,
            description: comp.description || null,
          });
        }

        setStructureEditorOpen(false);
        toast.success("Components updated.");
        await refreshGradeComponentsOnly();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log("handleSaveGradeComponents error:", e);
        toast.error(e?.response?.data?.error || e.message || "Failed to save components");
      } finally {
        setStructureEditorSaving(false);
      }
    },
    [
      classes,
      inferComponentTypeFromName,
      refreshGradeComponentsOnly,
      selectedClassId,
      selectedSubjectId,
      selectedSubjectName,
      subjectsByName,
      structure,
      teacherId,
    ]
  );

  useEffect(() => {
    if (!selectedClassId || !selectedSubjectName) return;
    fetchGrades({ classId: selectedClassId, subjectName: selectedSubjectName, semester });
  }, [selectedClassId, selectedSubjectName, classes, semester]);

  const startEditMark = (studentId, compId, currentValue) => {
    setEditingCell({ studentId, compId });
    setEditValue(String(currentValue || 0));
  };

  const saveMark = async () => {
    if (!editingCell) return;
    const val = parseFloat(editValue);
    if (isNaN(val)) return;
    const comp = structure.find(g => g.id === editingCell.compId);
    if (comp && comp.weight !== undefined && val > Number(comp.weight)) {
      toast.error(`Mark cannot exceed ${comp.weight}`);
      return;
    }

    const body = {
      studentId: editingCell.studentId,
      componentId: editingCell.compId,
      marksObtained: val,
      remarks: "",
    };

    try {
      // Debug: request body
      // eslint-disable-next-line no-console
      console.log("POST /api/grades/marks body:", body);
      const res = await gradeService.postMark(body);
      // Debug: backend response
      // eslint-disable-next-line no-console
      console.log("POST /api/grades/marks response:", res);

      await fetchGrades({ classId: selectedClassId, subjectName: selectedSubjectName });
      toast.success("Mark saved.");
      setEditingCell(null);
      setEditValue("");
    } catch (e) {
      toast.error(e.message || "Failed to save mark.");
    }
  };

  const deleteMark = (studentId, compId) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, marks: { ...(s.marks || {}), [compId]: 0 } } : s))
    );
    toast.success("Mark cleared");
  };

  const handleSaveToBackend = async () => {
    // Marks are saved per-cell via POST /api/grades/marks.
    // Keep button as a manual refresh (and to match existing UI).
    if (!selectedClassId) return;
    setSaving(true);
    try {
      await fetchGrades({ classId: selectedClassId, subjectName: selectedSubjectName, semester });
      toast.success("Refreshed.");
    } catch (e) {
      toast.error(e.message || "Failed to refresh.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-heading">Grades Dashboard</h1>
            <p className="text-sm text-text-secondary">
              Manage student marks and performance · {semester === "SEMESTER_1" ? "Semester 1" : semester === "SEMESTER_2" ? "Semester 2" : "Full Year"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveToBackend}
            disabled={saving || loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save"}
          </button>

          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-border bg-card text-sm text-heading font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[170px]"
          >
            <option value="ALL">Full Year</option>
            <option value="SEMESTER_1">Semester 1</option>
            <option value="SEMESTER_2">Semester 2</option>
          </select>

          {/* Subject filter (drives grades/components fetch) */}
          <select
            value={selectedSubjectId != null ? String(selectedSubjectId) : ""}
            onChange={(e) => {
              const nextIdRaw = e.target.value;
              const nextId = nextIdRaw === "" ? null : nextIdRaw;
              const subj =
                nextId == null
                  ? null
                  : subjectsList.find((s) => String(s?.id ?? s?.subjectId) === String(nextId)) ?? null;
              const nextName = subj?.name ?? "";
              // eslint-disable-next-line no-console
              console.log("[TeacherGrades] subject changed:", { selectedClassId, nextId, nextName });

              setSelectedSubjectId(subj?.id ?? subj?.subjectId ?? null);
              setSelectedSubjectName(nextName);
            }}
            disabled={!selectedClassId || subjectsList.length === 0}
            className="px-4 py-2.5 rounded-xl border border-border bg-card text-sm text-heading font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[240px]"
          >
            <option value="">Select Subject</option>
            {subjectsList.map((s) => (
              <option key={s?.id ?? s?.subjectId} value={String(s?.id ?? s?.subjectId)}>
                {s?.name}
              </option>
            ))}
          </select>

          <select
            value={selectedClassId || ""}
            onChange={(e) => {
              const id = Number(e.target.value);
              setSelectedClassId(id || null);
              const cls = classes.find((c) => c.classId === id);
              const nextSubjectName = cls?.subjectTaught || "";
              setSelectedSubjectName(nextSubjectName);

              if (nextSubjectName) {
                const key = String(nextSubjectName).trim().toLowerCase();
                const resolvedId = subjectsByName?.[key]?.id ?? null;
                if (resolvedId != null) {
                  setSelectedSubjectId(resolvedId);
                } else {
                  // Fallback: try match by name/code against the subjects list.
                  const subj =
                    subjectsList.find((s) => String(s?.name ?? "").trim().toLowerCase() === key) ??
                    subjectsList.find((s) => String(s?.code ?? "").trim().toLowerCase() === key) ??
                    null;
                  setSelectedSubjectId(subj?.id ?? subj?.subjectId ?? null);
                }
              } else {
                setSelectedSubjectId(null);
              }
              // eslint-disable-next-line no-console
              console.log("[TeacherGrades] class changed:", { selectedClassId: id || null, nextSubjectName });
            }}
            className="px-4 py-2.5 rounded-xl border border-border bg-card text-sm text-heading font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[240px]"
          >
            {classes.map((c) => {
              const isGradable = c?.subjectTaught != null && String(c.subjectTaught).trim().length > 0;
              return (
                <option key={c.classId} value={c.classId} disabled={!isGradable}>
                  {c.className} {c.subjectTaught ? `- ${c.subjectTaught}` : ""}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {loading && <div className="text-sm text-muted-foreground">Loading grades...</div>}
      {!loading && error && <div className="text-sm text-destructive">{error}</div>}

      {/* Grade Structure */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl border p-5 ${isValid ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isValid ? <Award className="w-5 h-5 text-success" /> : <AlertTriangle className="w-5 h-5 text-destructive" />}
            <h3 className="text-sm font-semibold text-heading">Grade Structure</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isValid ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
              Components = {structure.length} {structure.length ? "✅" : "❌"}
            </span>
          </div>
          <button
            onClick={() => !structureEditorSaving && setStructureEditorOpen((v) => !v)}
            disabled={!selectedClassId || !teacherId || structureEditorSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-xs font-medium text-heading hover:bg-muted/70 disabled:opacity-60"
          >
            {structureEditorOpen ? <X className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}{" "}
            {structureEditorOpen ? "Done" : "Edit"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {structure.length ? (
            structure.map((g) => (
              <div key={g.id} className="flex items-center gap-2 bg-card rounded-lg border border-border px-3 py-2">
                <span className="text-xs font-medium text-heading">{g.component}</span>
                <span className="text-[11px] text-text-secondary">
                  {g.weight || g.weight === 0 ? `(/${g.weight})` : ""}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground italic">No components</p>
          )}
        </div>
      </motion.div>

      {/* Inline grade structure editor */}
      <AnimatePresence initial={false}>
        {structureEditorOpen && (
          <GradeStructureEditor
            initialComponents={structure}
            saving={structureEditorSaving}
            onCancel={() => setStructureEditorOpen(false)}
            onSave={handleSaveGradeComponents}
          />
        )}
      </AnimatePresence>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Class Average", value: `${classAvg}%`, icon: BarChart3, color: "text-primary", bg: "bg-primary/10" },
          { label: "Highest Mark", value: `${highest}%`, icon: TrendingUp, color: "text-success", bg: "bg-success/10" },
          { label: "Lowest Mark", value: `${lowest}%`, icon: TrendingDown, color: "text-destructive", bg: "bg-destructive/10" },
          { label: "Passed", value: passedCount, icon: TrendingUp, color: "text-success", bg: "bg-success/10" },
          { label: "Failed", value: failedCount, icon: TrendingDown, color: "text-destructive", bg: "bg-destructive/10" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl border border-border p-4">
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-4.5 h-4.5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-heading">{s.value}</p>
            <p className="text-[11px] text-text-secondary font-medium mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Marks Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
        className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3 text-[11px] font-semibold text-text-secondary uppercase text-left">Student</th>
                {structure.map(g => (
                  <th key={g.id} className="px-4 py-3 text-[11px] font-semibold text-text-secondary uppercase text-center">
                    {g.component}<br /><span className="text-[10px] text-muted-foreground font-normal">/{g.weight}</span>
                  </th>
                ))}
                <th className="px-4 py-3 text-[11px] font-semibold text-text-secondary uppercase text-center">Total %</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-text-secondary uppercase text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {enriched.map(s => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                        {s.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-heading">{s.name}</span>
                    </div>
                  </td>
                  {structure.map(g => {
                    const val = s.marks?.[g.id] ?? 0;
                    const isEditing = editingCell?.studentId === s.id && editingCell?.compId === g.id;
                    return (
                      <td key={g.id} className="px-4 py-3 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && saveMark()}
                              className="w-14 px-1.5 py-1 rounded border border-primary bg-background text-xs text-center text-heading focus:outline-none"
                              autoFocus />
                            <button onClick={saveMark} className="text-success"><Check className="w-3 h-3" /></button>
                            <button onClick={() => setEditingCell(null)} className="text-destructive"><X className="w-3 h-3" /></button>
                          </div>
                        ) : (
                          <button onClick={() => startEditMark(s.id, g.id, val)}
                            className="text-sm text-body hover:text-primary cursor-pointer transition-colors">
                            {val}
                          </button>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center">
                    <span className={`text-sm font-bold ${s.total >= PASS_MARK ? "text-success" : "text-destructive"}`}>{s.total}%</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full ${
                      s.status === "Pass" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    }`}>{s.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-heading text-sm mb-4">Grade Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={gradeDist}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(215, 14%, 47%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(215, 14%, 47%)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="count" fill="hsl(217, 91%, 60%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-heading text-sm mb-4">Pass / Fail Ratio</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={passFail} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                {passFail.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-2">
            {passFail.map((p, i) => (
              <span key={p.name} className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                {p.name} ({p.value})
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-heading text-sm mb-4">Performance Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(215, 14%, 47%)" }} axisLine={false} tickLine={false} />
              <YAxis domain={[60, 90]} tick={{ fontSize: 11, fill: "hsl(215, 14%, 47%)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={v => `${v}%`} />
              <Line type="monotone" dataKey="avg" stroke="hsl(263, 70%, 58%)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(263, 70%, 58%)" }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
}
