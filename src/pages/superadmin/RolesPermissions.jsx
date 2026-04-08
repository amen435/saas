import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Plus, Edit, Trash2, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const featureModules = ["Dashboard", "Students", "Teachers", "Parents", "Attendance", "Grades", "Timetable", "Homework", "Reports", "Fees", "SMS", "AI Tutor", "Settings"];
const operations = ["View", "Create", "Edit", "Delete"];

export default function RolesPermissions() {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const openAdd = () => { setEditingRole(null); setForm({ name: "", description: "" }); setDialogOpen(true); };
  const openEdit = (role) => { setEditingRole(role); setForm({ name: role.name, description: role.description }); setDialogOpen(true); };

  const handleSave = () => {
    if (!form.name) { toast.error("Role name is required."); return; }
    if (editingRole) {
      const updated = roles.map((r) => r.id === editingRole.id ? { ...r, name: form.name, description: form.description } : r);
      setRoles(updated);
      setSelectedRole(updated.find((r) => r.id === editingRole.id));
      toast.success("Role updated.");
    } else {
      const newRole = { id: Date.now(), name: form.name, description: form.description, color: "bg-muted text-muted-foreground", permissions: Object.fromEntries(featureModules.map((m) => [m, { View: false, Create: false, Edit: false, Delete: false }])) };
      setRoles([...roles, newRole]);
      setSelectedRole(newRole);
      toast.success("Role created.");
    }
    setDialogOpen(false);
  };

  const togglePermission = (module, op) => {
    const updated = roles.map((r) => {
      if (r.id !== selectedRole.id) return r;
      return { ...r, permissions: { ...r.permissions, [module]: { ...r.permissions[module], [op]: !r.permissions[module][op] } } };
    });
    setRoles(updated);
    setSelectedRole(updated.find((r) => r.id === selectedRole.id));
  };

  const deleteRole = (id) => {
    if (id === 1) { toast.error("Cannot delete Super Admin role."); return; }
    setRoles(roles.filter((r) => r.id !== id));
    if (selectedRole?.id === id) setSelectedRole(roles[0] ?? null);
    toast("Role deleted");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Roles & Permissions</h1>
          <p className="text-sm text-muted-foreground mt-1">Define access control rules across the platform.</p>
        </div>
        <Button onClick={openAdd} className="gradient-primary text-primary-foreground gap-2"><Plus className="w-4 h-4" /> ADD ROLE</Button>
      </div>

      {/* Role tabs */}
      <div className="flex gap-2 flex-wrap">
        {roles.map((r) => (
          <button key={r.id} onClick={() => setSelectedRole(r)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${selectedRole?.id === r.id ? "gradient-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:bg-muted"}`}>
            {r.name}
          </button>
        ))}
      </div>

      {/* Selected role info */}
      {!selectedRole && roles.length === 0 && (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground text-sm">
          No roles. Add a role to get started.
        </div>
      )}
      {selectedRole && (
      <div className="bg-card rounded-xl border border-border p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${selectedRole.color} flex items-center justify-center`}><Shield className="w-5 h-5" /></div>
          <div>
            <h3 className="text-sm font-bold text-heading">{selectedRole.name}</h3>
            <p className="text-[11px] text-muted-foreground">{selectedRole.description}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => openEdit(selectedRole)} className="p-2 rounded-lg hover:bg-muted"><Edit className="w-4 h-4 text-muted-foreground" /></button>
          <button onClick={() => deleteRole(selectedRole.id)} className="p-2 rounded-lg hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-muted-foreground" /></button>
        </div>
      </div>
      )}

      {/* Permission Matrix */}
      {selectedRole && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-5 py-3.5 text-[11px] font-semibold text-muted-foreground tracking-wider text-left">MODULE</th>
              {operations.map((op) => (
                <th key={op} className="px-5 py-3.5 text-[11px] font-semibold text-muted-foreground tracking-wider text-center">{op.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {featureModules.map((mod) => (
              <tr key={mod} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-5 py-3 text-sm font-medium text-heading">{mod}</td>
                {operations.map((op) => (
                  <td key={op} className="px-5 py-3 text-center">
                    <button
                      onClick={() => togglePermission(mod, op)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${selectedRole.permissions[mod]?.[op] ? "bg-success/15 text-success" : "bg-muted text-muted-foreground/40"}`}
                    >
                      {selectedRole.permissions[mod]?.[op] ? <Check className="w-4 h-4" /> : <X className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit Role" : "Create Role"}</DialogTitle>
            <DialogDescription>Define role name and description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Role Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Coordinator" /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="gradient-primary text-primary-foreground">{editingRole ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
