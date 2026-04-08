import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Printer, Clock } from "lucide-react";
import ChildSelector from "@/components/parent/ChildSelector";
import { timetableService } from "@/services/timetableService";
import { LoadingSpinner } from "@/components/shared/LoadingStates";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export default function ParentTimetable() {
  const currentYear = new Date().getFullYear();
  const academicYear = `${currentYear}/${currentYear + 1}`;
  const [selectedChild, setSelectedChild] = useState(null);
  const [term, setTerm] = useState("1st Quarter");

  const { data: childrenRes, isLoading } = useQuery({
    queryKey: ["parent-children-timetables", academicYear],
    queryFn: async () => {
      const yearsToTry = [academicYear, `${currentYear - 1}/${currentYear}`];
      let lastResponse = null;
      for (const year of yearsToTry) {
        const response = await timetableService.getAllChildrenTimetables({ academicYear: year });
        const payload = response?.data?.data || response?.data || response || [];
        const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.children) ? payload.children : [];
        const hasAnyTimetableEntries = Array.isArray(rows) && rows.some((r) => Number(r?.totalEntries ?? 0) > 0);
        if (Array.isArray(rows) && rows.length > 0 && hasAnyTimetableEntries) return response;
        lastResponse = response;
      }
      return lastResponse;
    },
  });

  const childrenPayload = childrenRes?.data?.data || childrenRes?.data || childrenRes || [];
  // eslint-disable-next-line no-console
  console.log("parent all-children timetables:", childrenPayload);
  // Supports both old shape ({ children: [...] }) and new shape ([...]).
  const children = Array.isArray(childrenPayload)
    ? childrenPayload
    : Array.isArray(childrenPayload?.children)
      ? childrenPayload.children
      : [];

  const childOptions = useMemo(
    () =>
      children.map((item) => ({
        id: item?.student?.studentId,
        name: item?.student?.name || "Child",
        grade: item?.class?.gradeLevel ?? "-",
        section: item?.class?.section ?? "-",
      })),
    [children]
  );

  const selectedChildData = useMemo(() => {
    const currentId = selectedChild ?? childOptions[0]?.id;
    return children.find((item) => String(item?.student?.studentId) === String(currentId)) || null;
  }, [children, childOptions, selectedChild]);

  const headerSlots = useMemo(() => {
    const schedule = selectedChildData?.schedule || {};
    const reference = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]
      .map((day) => (Array.isArray(schedule?.[day]) ? schedule[day] : []))
      .find((slots) => slots.length > 0) || [];
    if (!Array.isArray(reference) || reference.length === 0) return [];
    return reference.map((slot, index) => ({
      key: index,
      label: slot?.type === "break" ? slot?.name || "Break" : slot?.periodName || `P${slot?.periodNumber || index + 1}`,
    }));
  }, [selectedChildData]);

  const dayMap = useMemo(() => ({
    Monday: "MONDAY",
    Tuesday: "TUESDAY",
    Wednesday: "WEDNESDAY",
    Thursday: "THURSDAY",
    Friday: "FRIDAY",
  }), []);

  const handlePrint = () => window.print();

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <ChildSelector children={childOptions} selectedChild={selectedChild ?? childOptions[0]?.id} onSelect={setSelectedChild} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading">Child's Schedule</h1>
          <p className="text-sm text-text-secondary">Academic Year {academicYear}</p>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Term</p>
            <select value={term} onChange={(e) => setTerm(e.target.value)} className="px-3 py-2 text-xs rounded-lg border border-border bg-card text-heading outline-none">
              <option>1st Quarter</option>
              <option>2nd Quarter</option>
              <option>3rd Quarter</option>
              <option>4th Quarter</option>
            </select>
          </div>
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-heading hover:bg-muted transition-colors mt-4">
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
        </div>
      </div>

      {/* Weekly Timetable Grid */}
      <motion.div {...anim} className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-heading">Weekly Timetable</h3>
        </div>
        {!selectedChildData || headerSlots.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No timetable entries found for the selected child.</div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-xs font-semibold text-heading text-left w-24">Day</th>
                {headerSlots.map((p) => (
                  <th key={p.key} className="px-2 py-3 text-xs font-semibold text-heading text-center">{p.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day) => {
                const periods = selectedChildData?.schedule?.[dayMap[day]] || [];
                return (
                  <tr key={day} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-heading">{day}</td>
                    {periods.map((p, i) => (
                      <td key={i} className="px-2 py-2 text-center">
                        {p?.type === "break" ? (
                          <div className="bg-warning/10 text-warning text-[10px] font-medium rounded-lg py-2 px-1">
                            {p?.name}
                          </div>
                        ) : (
                          <div className="bg-primary/5 border border-primary/10 rounded-lg p-2 min-h-[48px] hover:bg-primary/10 transition-colors cursor-default">
                            <p className="text-[11px] font-bold text-primary leading-tight">{p?.subject?.name || "-"}</p>
                            <p className="text-[9px] text-text-secondary mt-0.5">{p?.teacher?.name || "-"}</p>
                            <p className="text-[9px] text-success">{p?.room || "-"}</p>
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </motion.div>

      {/* Period Legend */}
      <div className="flex flex-wrap gap-4 text-[11px] text-text-secondary">
        <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Periods 1-3: 8:00 - 10:30</span>
        <span className="flex items-center gap-1.5 text-warning">☕ Break: 10:30 - 11:00</span>
        <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Periods 4-5: 11:00 - 12:30</span>
        <span className="flex items-center gap-1.5 text-warning">🍽 Lunch: 12:30 - 1:30</span>
        <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Period 6: 1:30 - 2:30</span>
      </div>

      <p className="text-[10px] text-muted-foreground italic">View only — schedule managed by school admin</p>
    </div>
  );
}
