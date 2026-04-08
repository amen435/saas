import { useState } from "react";
import { motion } from "framer-motion";
import { UserCheck, Plus, Search, Edit2, Trash2, X, Save, Eye, Phone, Mail, Users } from "lucide-react";

const emptyParent = { name: "", phone: "", email: "", children: [], status: "Active" };
const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export default function AdminParents() {
  const [parents, setParents] = useState([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyParent);
  const [childInput, setChildInput] = useState("");

  const filtered = parents.filter((p) => {
    const name = (p.name || "").toLowerCase();
    const childrenList = p.children ?? [];
    const childMatch = childrenList.some((c) => (c || "").toLowerCase().includes(search.toLowerCase()));
    return name.includes(search.toLowerCase()) || childMatch;
  });

  const openAdd = () => { setForm(emptyParent); setModal("add"); };
  const openEdit = (p) => { setForm({ ...p }); setSelected(p); setModal("edit"); };
  const openView = (p) => { setSelected(p); setModal("view"); };

  const addChild = () => {
    if (!childInput.trim()) return;
    setForm({ ...form, children: [...form.children, childInput.trim()] });
    setChildInput("");
  };

  const removeChild = (idx) => setForm({ ...form, children: form.children.filter((_, i) => i !== idx) });

  const handleSave = () => {
    if (!form.name) return;
    if (modal === "add") {
      setParents([...parents, { ...form, id: Date.now() }]);
    } else {
      setParents(parents.map(p => p.id === selected.id ? { ...form, id: selected.id } : p));
    }
    setModal(null);
  };

  const handleDelete = (id) => {
    if (confirm("Remove this parent?")) setParents(parents.filter(p => p.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading flex items-center gap-2"><UserCheck className="w-6 h-6 text-primary" /> Parents Management</h1>
          <p className="text-sm text-text-secondary">Manage parent/guardian accounts and linked children</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90"><Plus className="w-4 h-4" /> Add Parent</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: "Total Parents", value: parents.length, icon: UserCheck },
          { label: "Active", value: parents.filter(p => p.status === "Active").length, icon: Users },
          { label: "Linked Children", value: parents.reduce((s, p) => s + p.children.length, 0), icon: Users },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4">
            <s.icon className="w-4 h-4 text-primary mb-2" />
            <p className="text-xl font-bold text-heading">{s.value}</p>
            <p className="text-[10px] text-text-secondary">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search parent or child..." className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-card text-heading outline-none focus:border-primary" />
      </div>

      {/* Desktop Table */}
      <motion.div {...anim} className="hidden md:block bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-heading text-left">Parent/Guardian</th>
              <th className="px-4 py-3 text-xs font-semibold text-heading text-left">Contact</th>
              <th className="px-4 py-3 text-xs font-semibold text-heading text-left">Children</th>
              <th className="px-4 py-3 text-xs font-semibold text-heading text-center">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-heading text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-t border-border hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">{p.name.charAt(0)}</div>
                    <p className="text-xs font-medium text-heading">{p.name}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-[11px] text-heading flex items-center gap-1"><Phone className="w-3 h-3" /> {p.phone}</p>
                  <p className="text-[10px] text-text-secondary flex items-center gap-1"><Mail className="w-3 h-3" /> {p.email}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {p.children.map(c => <span key={c} className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-primary/10 text-primary">{c}</span>)}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 text-[10px] font-semibold rounded-full ${p.status === "Active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{p.status}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => openView(p)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary"><Eye className="w-3.5 h-3.5" /></button>
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filtered.map(p => (
          <motion.div key={p.id} {...anim} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold">{p.name.charAt(0)}</div>
                <div>
                  <p className="text-sm font-semibold text-heading">{p.name}</p>
                  <p className="text-[10px] text-text-secondary">{p.phone}</p>
                </div>
              </div>
              <span className={`px-2 py-1 text-[10px] font-semibold rounded-full ${p.status === "Active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{p.status}</span>
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              {p.children.map(c => <span key={c} className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-primary/10 text-primary">{c}</span>)}
            </div>
            <div className="flex gap-2">
              <button onClick={() => openView(p)} className="flex-1 py-2 rounded-lg bg-muted text-xs font-medium text-heading">View</button>
              <button onClick={() => openEdit(p)} className="flex-1 py-2 rounded-lg gradient-primary text-primary-foreground text-xs font-medium">Edit</button>
              <button onClick={() => handleDelete(p.id)} className="py-2 px-3 rounded-lg bg-destructive/10 text-destructive text-xs font-medium">Delete</button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-xl border border-border p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-heading">{modal === "view" ? "Parent Details" : modal === "add" ? "Add New Parent" : "Edit Parent"}</h3>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>

            {modal === "view" && selected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xl font-bold">{selected.name.charAt(0)}</div>
                  <div>
                    <p className="text-lg font-bold text-heading">{selected.name}</p>
                    <p className="text-sm text-text-secondary">{selected.status}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div><p className="text-[10px] text-text-secondary uppercase">Phone</p><p className="text-sm text-heading">{selected.phone}</p></div>
                  <div><p className="text-[10px] text-text-secondary uppercase">Email</p><p className="text-sm text-heading">{selected.email}</p></div>
                </div>
                <div><p className="text-[10px] text-text-secondary uppercase mb-1">Linked Children</p>
                  <div className="flex flex-wrap gap-1">{selected.children.map(c => <span key={c} className="px-2 py-1 text-xs font-medium rounded bg-primary/10 text-primary">{c}</span>)}</div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-text-secondary">Full Name *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-border outline-none focus:border-primary mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-text-secondary">Phone</label>
                    <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-border outline-none focus:border-primary mt-1" />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-text-secondary">Email</label>
                    <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-border outline-none focus:border-primary mt-1" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-text-secondary">Children</label>
                  <div className="flex gap-2 mt-1">
                    <input value={childInput} onChange={e => setChildInput(e.target.value)} placeholder="e.g. Ahmed Fikadu (10-A)" className="flex-1 px-3 py-2 text-sm rounded-lg border border-border outline-none focus:border-primary" onKeyDown={e => e.key === "Enter" && addChild()} />
                    <button onClick={addChild} className="px-3 py-2 rounded-lg gradient-primary text-primary-foreground text-xs font-medium"><Plus className="w-4 h-4" /></button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {form.children.map((c, i) => (
                      <span key={i} className="px-2 py-1 text-xs font-medium rounded bg-primary/10 text-primary flex items-center gap-1">
                        {c} <button onClick={() => removeChild(i)}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-text-secondary">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-border outline-none focus:border-primary mt-1">
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>
                <button onClick={handleSave} disabled={!form.name} className="w-full py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                  <Save className="w-4 h-4 inline mr-1.5" /> {modal === "add" ? "Add Parent" : "Update Parent"}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
