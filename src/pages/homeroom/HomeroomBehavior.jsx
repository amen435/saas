import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Plus, Edit, Trash2, Search, Star, ThumbsDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const categories = ["Tardiness", "Discipline", "Homework", "Leadership", "Academic", "Helping", "Bullying", "Other"];

export default function HomeroomBehavior() {
  const [records, setRecords] = useState([]);
  const [studentNames] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ student: "", type: "negative", category: "Tardiness", note: "", severity: "medium" });

  const filtered = records.filter((r) => {
    const matchSearch = r.student.toLowerCase().includes(search.toLowerCase()) || r.note.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || r.type === filter;
    return matchSearch && matchFilter;
  }).sort((a, b) => b.date.localeCompare(a.date));

  const openAdd = () => { setEditing(null); setForm({ student: "", type: "negative", category: "Tardiness", note: "", severity: "medium" }); setDialogOpen(true); };
  const openEdit = (r) => { setEditing(r); setForm({ student: r.student, type: r.type, category: r.category, note: r.note, severity: r.severity }); setDialogOpen(true); };

  const handleSave = () => {
    if (!form.student || !form.note) { toast.error("Student and note are required"); return; }
    if (editing) {
      setRecords(records.map((r) => r.id === editing.id ? { ...r, ...form } : r));
      toast.success("Record updated");
    } else {
      setRecords([...records, { id: Date.now(), ...form, date: new Date().toISOString().split("T")[0] }]);
      toast.success("Behavior record added");
    }
    setDialogOpen(false);
  };

  const positiveCount = records.filter((r) => r.type === "positive").length;
  const negativeCount = records.filter((r) => r.type === "negative").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading">Behavior Tracking</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor and record student behavior notes</p>
        </div>
        <Button onClick={openAdd} className="gradient-primary text-primary-foreground gap-2"><Plus className="w-4 h-4" /> Add Record</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-heading">{records.length}</p>
          <p className="text-[11px] text-muted-foreground">Total Records</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-success">{positiveCount}</p>
          <p className="text-[11px] text-muted-foreground">Positive</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-destructive">{negativeCount}</p>
          <p className="text-[11px] text-muted-foreground">Negative</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student or note..." className="pl-10" />
        </div>
        <div className="flex gap-1">
          {["all", "positive", "negative"].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${filter === f ? "gradient-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:bg-muted"}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Records List */}
      <div className="space-y-3">
        {filtered.map((r) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl border border-border p-4 flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${r.type === "positive" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
              {r.type === "positive" ? <Star className="w-5 h-5" /> : <ThumbsDown className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-heading">{r.student}</p>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${r.severity === "high" ? "bg-destructive/10 text-destructive" : r.severity === "medium" ? "bg-warning/10 text-warning" : "bg-info/10 text-info"}`}>
                  {r.severity}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">{r.category}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{r.note}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{r.date}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => openEdit(r)} className="p-1.5 rounded-md hover:bg-muted"><Edit className="w-3.5 h-3.5 text-muted-foreground" /></button>
              <button onClick={() => { setRecords(records.filter((x) => x.id !== r.id)); toast("Record deleted"); }} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Record" : "Add Behavior Record"}</DialogTitle>
            <DialogDescription>Log positive or negative behavior notes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Student *</Label>
              <select value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm">
                <option value="">Select student</option>
                <option value="">Select student</option>
                {studentNames.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm">
                  <option value="positive">Positive</option><option value="negative">Negative</option>
                </select>
              </div>
              <div><Label>Severity</Label>
                <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm">
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                </select>
              </div>
            </div>
            <div><Label>Category</Label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm">
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><Label>Note *</Label><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Describe the behavior..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="gradient-primary text-primary-foreground">{editing ? "Save" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
