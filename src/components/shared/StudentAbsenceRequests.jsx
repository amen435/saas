import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Loader2, Eye, ChevronDown, ChevronUp, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const statusBadge = {
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
  pending: "bg-warning/10 text-warning",
};

const statusIcon = {
  approved: CheckCircle,
  rejected: XCircle,
  pending: Loader2,
};

export default function StudentAbsenceRequests({ title = "Parent Absence Requests" }) {
  const [requests, setRequests] = useState([]);
  const [expanded, setExpanded] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewingRequest, setViewingRequest] = useState(null);

  const pendingCount = requests.filter(r => r.status === "pending").length;

  const filtered = requests.filter(r => {
    const matchSearch = r.studentName.toLowerCase().includes(search.toLowerCase()) ||
      r.studentId.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleAction = (id, action) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: action } : r));
    toast.success(`Request ${action}`);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border">
      {/* Header */}
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 text-left">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-heading">{title}</h3>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning/10 text-warning">
              {pendingCount} pending
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-5 pb-5 space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student..." className="pl-10 h-9 text-xs" />
                </div>
                <div className="flex gap-1">
                  {["all", "pending", "approved", "rejected"].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all ${
                        statusFilter === s ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-heading"
                      }`}>{s}</button>
                  ))}
                </div>
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2.5 px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Student</th>
                      <th className="text-left py-2.5 px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Class</th>
                      <th className="text-left py-2.5 px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                      <th className="text-left py-2.5 px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Reason</th>
                      <th className="text-left py-2.5 px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="text-right py-2.5 px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => {
                      const Icon = statusIcon[r.status];
                      return (
                        <tr key={r.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-3">
                            <div>
                              <p className="font-medium text-heading text-sm">{r.studentName}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{r.studentId} · Parent: {r.parentName}</p>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-xs text-muted-foreground">{r.class}</td>
                          <td className="py-3 px-3 text-xs text-heading">
                            {new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </td>
                          <td className="py-3 px-3 text-xs text-muted-foreground max-w-[200px] truncate">
                            {r.reason}
                            {r.attachment && <span className="ml-1 text-primary">📎</span>}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${statusBadge[r.status]}`}>
                              <Icon className={`w-3 h-3 ${r.status === "pending" ? "animate-spin" : ""}`} />
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex gap-1.5 justify-end">
                              <button onClick={() => setViewingRequest(r)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="View details">
                                <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                              </button>
                              {r.status === "pending" && (
                                <>
                                  <button onClick={() => handleAction(r.id, "approved")}
                                    className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-success/10 text-success hover:bg-success/20 transition-colors">
                                    Approve
                                  </button>
                                  <button onClick={() => handleAction(r.id, "rejected")}
                                    className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filtered.map(r => {
                  const Icon = statusIcon[r.status];
                  return (
                    <div key={r.id} className="rounded-xl border border-border p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-heading">{r.studentName}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{r.studentId} · {r.class}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${statusBadge[r.status]}`}>
                          <Icon className={`w-3 h-3 ${r.status === "pending" ? "animate-spin" : ""}`} />
                          {r.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-heading">{r.reason} {r.attachment && "📎"}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Date: {new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {" · "}Submitted: {new Date(r.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                      {r.status === "pending" && (
                        <div className="flex gap-2">
                          <button onClick={() => handleAction(r.id, "approved")}
                            className="flex-1 py-2 rounded-lg text-xs font-semibold bg-success/10 text-success hover:bg-success/20 transition-colors">
                            Approve
                          </button>
                          <button onClick={() => handleAction(r.id, "rejected")}
                            className="flex-1 py-2 rounded-lg text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No absence requests found</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Detail Modal */}
      <AnimatePresence>
        {viewingRequest && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            onClick={() => setViewingRequest(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card rounded-xl border border-border p-6 max-w-md w-full shadow-xl"
              onClick={e => e.stopPropagation()}>
              <h3 className="font-semibold text-heading mb-4">Request Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Student</span><span className="font-medium text-heading">{viewingRequest.studentName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">ID</span><span className="font-mono text-heading">{viewingRequest.studentId}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Requested by</span><span className="text-heading">{viewingRequest.parentName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Class</span><span className="text-heading">{viewingRequest.class}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Absence Date</span><span className="text-heading">{new Date(viewingRequest.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Submitted</span><span className="text-heading">{new Date(viewingRequest.submittedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span></div>
                <div><span className="text-muted-foreground">Reason</span><p className="text-heading mt-1">{viewingRequest.reason}</p></div>
                {viewingRequest.attachment && <p className="text-xs text-primary">📎 Attachment included</p>}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full capitalize ${statusBadge[viewingRequest.status]}`}>{viewingRequest.status}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                {viewingRequest.status === "pending" && (
                  <>
                    <button onClick={() => { handleAction(viewingRequest.id, "approved"); setViewingRequest(null); }}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold bg-success/10 text-success hover:bg-success/20">Approve</button>
                    <button onClick={() => { handleAction(viewingRequest.id, "rejected"); setViewingRequest(null); }}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20">Reject</button>
                  </>
                )}
                <button onClick={() => setViewingRequest(null)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold border border-border text-heading hover:bg-muted">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
