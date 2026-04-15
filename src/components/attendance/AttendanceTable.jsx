import { useEffect, useMemo, useState } from "react";
import { Search, Filter, Camera, Cpu, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AttendanceTable({ data = [], isLoading, classOptions = [] }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [classFilter, setClassFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const normalizedClassOptions = useMemo(
    () => [...new Set((Array.isArray(classOptions) ? classOptions : []).filter(Boolean))],
    [classOptions]
  );

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchSearch = String(item.name || "").toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "ALL" || String(item.role || "").toUpperCase().includes(roleFilter);
      const matchClass = classFilter === "ALL" || String(item.class || "") === classFilter;
      return matchSearch && matchRole && matchClass;
    });
  }, [data, search, roleFilter, classFilter]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, classFilter, data]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "PRESENT":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-success/10 text-success border border-success/20 w-max">
            <CheckCircle2 className="w-3.5 h-3.5" /> Present
          </span>
        );
      case "ABSENT":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-destructive/10 text-destructive border border-destructive/20 w-max">
            <XCircle className="w-3.5 h-3.5" /> Absent
          </span>
        );
      case "LATE":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-warning/10 text-warning border border-warning/20 w-max">
            <AlertTriangle className="w-3.5 h-3.5" /> Late
          </span>
        );
      case "WRONG_CLASS":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-warning/10 text-warning border border-warning/20 w-max">
            <AlertTriangle className="w-3.5 h-3.5" /> Wrong Class
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-muted text-muted-foreground border border-border w-max">
            {status}
          </span>
        );
    }
  };

  const getMethodIcon = (method) => {
    if (method === "WEBCAM") {
      return (
        <span className="flex items-center gap-1.5 text-xs text-text-secondary">
          <Camera className="w-3.5 h-3.5" /> Webcam
        </span>
      );
    }
    if (method === "ESP32_CAM") {
      return (
        <span className="flex items-center gap-1.5 text-xs text-text-secondary">
          <Cpu className="w-3.5 h-3.5" /> ESP32-CAM
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-xs text-text-secondary">
        <Cpu className="w-3.5 h-3.5" /> {method || "System"}
      </span>
    );
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-card flex flex-col h-full overflow-hidden">
      <div className="p-5 border-b border-border flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-muted/20">
        <h3 className="font-semibold text-heading">Real-Time Attendance Log</h3>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="pl-3 pr-8 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
            >
              <option value="ALL">All Roles</option>
              <option value="STUDENT">Students</option>
              <option value="TEACHER">Teachers</option>
            </select>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="pl-3 pr-8 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
            >
              <option value="ALL">All Classes</option>
              {normalizedClassOptions.map((className) => (
                <option key={className} value={className}>{className}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/40 border-b border-border text-xs uppercase tracking-wider text-text-secondary font-semibold">
              <th className="px-5 py-3 rounded-tl-xl whitespace-nowrap">Photo</th>
              <th className="px-5 py-3 whitespace-nowrap">Name</th>
              <th className="px-5 py-3 whitespace-nowrap">Role</th>
              <th className="px-5 py-3 whitespace-nowrap">Class / Subject</th>
              <th className="px-5 py-3 whitespace-nowrap">Status</th>
              <th className="px-5 py-3 whitespace-nowrap">Time</th>
              <th className="px-5 py-3 rounded-tr-xl whitespace-nowrap">Method</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <motion.tr key={`skeleton-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-b border-border">
                    <td className="px-5 py-4"><div className="w-10 h-10 rounded-full bg-muted animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="w-32 h-4 bg-muted animate-pulse rounded" /></td>
                    <td className="px-5 py-4"><div className="w-16 h-4 bg-muted animate-pulse rounded" /></td>
                    <td className="px-5 py-4"><div className="w-24 h-4 bg-muted animate-pulse rounded" /></td>
                    <td className="px-5 py-4"><div className="w-20 h-6 bg-muted animate-pulse rounded" /></td>
                    <td className="px-5 py-4"><div className="w-16 h-4 bg-muted animate-pulse rounded" /></td>
                    <td className="px-5 py-4"><div className="w-24 h-4 bg-muted animate-pulse rounded" /></td>
                  </motion.tr>
                ))
              ) : paginatedData.length > 0 ? (
                paginatedData.map((record, index) => (
                  <motion.tr
                    key={record.id || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="border-b border-border hover:bg-muted/10 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="w-10 h-10 rounded-full bg-muted border border-border overflow-hidden flex items-center justify-center">
                        {record.photoUrl ? (
                          <img src={record.photoUrl} alt={record.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-muted-foreground font-semibold text-sm">{record.name?.charAt(0)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-heading whitespace-nowrap">
                      {record.name}
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded-md bg-secondary/10 text-secondary border border-secondary/20">
                        {record.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-text-secondary whitespace-nowrap">
                      <div>{record.class || "-"}</div>
                      {record.subject && <div className="text-xs opacity-70">{record.subject}</div>}
                    </td>
                    <td className="px-5 py-3">
                      {getStatusBadge(record.status)}
                    </td>
                    <td className="px-5 py-3 text-sm text-text-secondary font-medium whitespace-nowrap">
                      {record.time ? new Date(record.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {getMethodIcon(record.method)}
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                      <Search className="w-12 h-12 mb-3 text-border" />
                      <p className="text-sm font-medium">No records found</p>
                      <p className="text-xs mt-1">Try adjusting your filters or date selection.</p>
                    </div>
                  </td>
                </tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="p-4 border-t border-border flex items-center justify-between text-sm text-text-secondary bg-muted/10">
          <div>
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} records
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium bg-background"
            >
              Prev
            </button>
            <span className="px-3 py-1 text-heading font-medium">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium bg-background"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
