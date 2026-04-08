import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Home, Search, Users, School } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { classService } from "@/services/classService";

const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

function mapClassToHomeroomRow(cls) {
  const teacher = cls?.homeroomTeacher;
  const user = teacher?.user || {};

  return {
    id: cls?.classId,
    classId: cls?.classId,
    classLabel:
      cls?.className ||
      `Grade ${cls?.gradeLevel ?? ""}${cls?.section ? `-${cls.section}` : ""}`.trim(),
    academicYear: cls?.academicYear || "—",
    teacherId: teacher?.teacherId || null,
    teacherName: user?.fullName || "Unassigned",
    teacherUserId: user?.userId || "—",
    phone: user?.phone || "—",
    role: user?.role || "—",
    status: user?.isActive === false ? "Inactive" : teacher ? "Active" : "Unassigned",
  };
}

export default function AdminHomeroom() {
  const [search, setSearch] = useState("");

  const { data: classesRaw = [], isLoading, error, refetch } = useQuery({
    queryKey: ["admin-homeroom-classes"],
    queryFn: () => classService.getAll({ isActive: true }),
  });

  const rows = useMemo(
    () => (Array.isArray(classesRaw) ? classesRaw : []).map(mapClassToHomeroomRow),
    [classesRaw]
  );

  const filtered = rows.filter((row) => {
    const q = search.toLowerCase();
    return (
      row.classLabel.toLowerCase().includes(q) ||
      row.teacherName.toLowerCase().includes(q) ||
      row.teacherUserId.toLowerCase().includes(q)
    );
  });

  const assignedCount = rows.filter((row) => row.teacherId).length;
  const unassignedCount = rows.length - assignedCount;
  const activeCount = rows.filter((row) => row.status === "Active").length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-heading flex items-center gap-2">
            <Home className="w-6 h-6 text-primary" /> Homeroom Teachers
          </h1>
          <p className="text-sm text-text-secondary">Loading homeroom assignments...</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-4 h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        Failed to load homeroom assignments.{" "}
        <button onClick={() => refetch()} className="underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading flex items-center gap-2">
            <Home className="w-6 h-6 text-primary" /> Homeroom Teachers
          </h1>
          <p className="text-sm text-text-secondary">
            View the real homeroom teacher assignments for each class in your school
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Classes", value: rows.length, icon: School },
          { label: "Assigned", value: assignedCount, icon: Home },
          { label: "Unassigned", value: unassignedCount, icon: Home },
          { label: "Active Teachers", value: activeCount, icon: Users },
        ].map((item) => (
          <div key={item.label} className="bg-card rounded-xl border border-border p-4">
            <item.icon className="w-4 h-4 text-primary mb-2" />
            <p className="text-xl font-bold text-heading">{item.value}</p>
            <p className="text-[10px] text-text-secondary">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search class, teacher, or user ID..."
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-card text-heading outline-none focus:border-primary"
        />
      </div>

      <motion.div {...anim} className="hidden md:block bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-heading text-left">Class</th>
              <th className="px-4 py-3 text-xs font-semibold text-heading text-left">Academic Year</th>
              <th className="px-4 py-3 text-xs font-semibold text-heading text-left">Teacher</th>
              <th className="px-4 py-3 text-xs font-semibold text-heading text-left">User ID</th>
              <th className="px-4 py-3 text-xs font-semibold text-heading text-left">Phone</th>
              <th className="px-4 py-3 text-xs font-semibold text-heading text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="border-t border-border hover:bg-muted/20">
                <td className="px-4 py-3 text-sm font-medium text-heading">{row.classLabel}</td>
                <td className="px-4 py-3 text-xs text-heading">{row.academicYear}</td>
                <td className="px-4 py-3 text-sm text-heading">{row.teacherName}</td>
                <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{row.teacherUserId}</td>
                <td className="px-4 py-3 text-xs text-heading">{row.phone}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                      row.status === "Active"
                        ? "bg-green-500/10 text-green-600"
                        : row.status === "Unassigned"
                          ? "bg-warning/10 text-warning"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-text-secondary">
                  No homeroom assignment found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </motion.div>

      <div className="md:hidden space-y-3">
        {filtered.map((row) => (
          <motion.div key={row.id} {...anim} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-heading">{row.classLabel}</p>
                <p className="text-[10px] text-text-secondary">{row.academicYear}</p>
              </div>
              <span
                className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                  row.status === "Active"
                    ? "bg-green-500/10 text-green-600"
                    : row.status === "Unassigned"
                      ? "bg-warning/10 text-warning"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {row.status}
              </span>
            </div>
            <div className="text-[11px] text-text-secondary space-y-0.5">
              <p>Teacher: <span className="text-heading">{row.teacherName}</span></p>
              <p>User ID: <span className="font-mono text-heading">{row.teacherUserId}</span></p>
              <p>Phone: <span className="text-heading">{row.phone}</span></p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
