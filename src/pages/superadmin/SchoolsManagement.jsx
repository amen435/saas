import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Edit, Trash2, MoreVertical, Plus, CheckCircle, XCircle, X, CalendarIcon, Eye, EyeOff, RefreshCw, Copy, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { schoolService } from "@/services/schoolService";

const planColors = {
  Premium: "bg-primary text-primary-foreground",
  Standard: "bg-info/15 text-info border border-info/30",
  Free: "bg-muted text-muted-foreground",
};

function generateId(prefix, existingIds) {
  let id;
  do { id = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`; } while (existingIds.has(id));
  return id;
}

const emptyForm = {
  name: "", schoolId: "", region: "", plan: "Standard", adminName: "", adminEmail: "", adminPhone: "", adminId: "", adminPassword: "", expireDate: null,
};

function mapSchoolToUI(s) {
  return {
    id: s.schoolId ?? s.id,
    name: s.schoolName ?? s.name,
    code: s.schoolCode ?? s.code,
    region: s.city ?? s.address ?? s.region ?? "—",
    plan: s.plan ?? "Standard",
    admin: s.adminName ?? s.admin ?? "—",
    adminEmail: s.adminEmail ?? "",
    adminPhone: s.adminPhone ?? "",
    adminId: s.adminId ?? "",
    status: s.isActive === false ? "Inactive" : "Active",
    expireDate: s.expiryDate ?? null,
    smsUsage: s.smsUsage ?? 0,
  };
}

export default function SchoolsManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);

  const loadSchools = useCallback(async () => {
    setLoading(true);
    try {
      const res = await schoolService.getAll();
      const data = res?.data ?? res;
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      setSchools(list.map(mapSchoolToUI));
    } catch {
      setSchools([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchools();
  }, [loadSchools]);

  const filtered = schools.filter((s) =>
    (s.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.region || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.admin || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openAdd = () => {
    setEditingSchool(null);
    const existingSchoolIds = new Set(schools.map(s => s.code));
    const existingAdminIds = new Set(schools.map(s => s.adminId).filter(Boolean));
    const newSchoolId = generateId("SCH", existingSchoolIds);
    const newAdminId = generateId("ADM", existingAdminIds);
    setForm({ ...emptyForm, schoolId: newSchoolId, adminId: newAdminId });
    setShowPassword(false);
    setCreatedCredentials(null);
    setDialogOpen(true);
  };

  const openEdit = (school) => {
    setEditingSchool(school);
    setForm({
      name: school.name,
      schoolId: school.code,
      region: school.region,
      plan: school.plan,
      adminName: school.admin,
      adminEmail: school.adminEmail || "",
      adminPhone: school.adminPhone || "",
      adminId: school.adminId || "",
      adminPassword: "",
      expireDate: school.expireDate || null,
    });
    setCreatedCredentials(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.region || !form.adminName || !form.adminEmail) {
      toast.error("Please fill all required fields.");
      return;
    }
    if (!editingSchool && (!form.adminId || !form.adminPassword)) {
      toast.error("Admin ID and Password are required for new schools.");
      return;
    }
    if (!editingSchool && form.adminPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (!editingSchool && !/^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])/.test(form.adminPassword)) {
      toast.error("Password must contain at least one uppercase letter, one number, and one special character.");
      return;
    }
    setSaving(true);
    try {
      if (editingSchool) {
        const res = await schoolService.update(editingSchool.id, {
          schoolName: form.name,
          schoolCode: form.schoolId,
          address: form.region,
          city: form.region,
          expiryDate: form.expireDate || null,
        });
        const data = res?.data ?? res;
        setSchools(schools.map((s) => (s.id === editingSchool.id ? mapSchoolToUI(data) : s)));
        toast.success(`${form.name} has been updated successfully.`);
        setDialogOpen(false);
        setForm(emptyForm);
        setEditingSchool(null);
      } else {
        // Single API call: backend creates school + school admin in one transaction (POST /api/schools)
        const schoolRes = await schoolService.create({
          schoolCode: form.schoolId,
          schoolName: form.name,
          address: form.region,
          city: form.region,
          expiryDate: form.expireDate || null,
          adminUserId: form.adminId.trim(),
          adminUsername: form.adminId.trim(),
          adminFullName: form.adminName.trim(),
          adminEmail: form.adminEmail?.trim() || undefined,
          adminPhone: form.adminPhone?.trim() || undefined,
          adminPassword: form.adminPassword,
        });
        const schoolData = schoolRes?.data ?? schoolRes;
        setSchools((prev) => [...prev, mapSchoolToUI(schoolData)]);
        setCreatedCredentials({
          schoolName: form.name,
          schoolId: form.schoolId,
          adminId: form.adminId,
          adminUsername: form.adminId,
          adminPassword: form.adminPassword,
        });
        toast.success(`${form.name} and School Admin account have been created successfully.`);
        setForm(emptyForm);
        // Dialog stays open to show credentials; user clicks "Done" to close
      }
    } catch (e) {
      toast.error(e?.message || "Failed to save school.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await schoolService.deactivate(id);
      setSchools(schools.map((s) => (s.id === id ? { ...s, status: "Inactive" } : s)));
      toast.success("School deactivated.");
    } catch (e) {
      toast.error(e?.message || "Failed to deactivate school.");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Schools Directory</h1>
          <p className="text-sm text-muted-foreground mt-1">Managing global access and quotas for {schools.length} active institutions.</p>
        </div>
        <Button onClick={openAdd} className="gradient-primary text-primary-foreground gap-2">
          <Plus className="w-4 h-4" /> ADD NEW SCHOOL
        </Button>
      </div>

      {/* Search */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by school name, region, or admin..." className="pl-10" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading schools…
          </div>
        ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {["INSTITUTION", "REGION / ADMIN", "PLAN", "STATUS", "SMS QUOTA", "ACTIONS"].map((h) => (
                <th key={h} className="px-6 py-3.5 text-[11px] font-semibold text-muted-foreground tracking-wider text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <motion.tr key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">{s.name.charAt(0)}</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">◆ {s.code}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-foreground">{s.region}</p>
                  <p className="text-[10px] text-muted-foreground">{s.admin} {s.adminId ? `(${s.adminId})` : ""}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${planColors[s.plan]}`}>{s.plan.toUpperCase()}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${s.status === "Active" ? "text-green-500" : "text-destructive"}`}>
                    {s.status === "Active" ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {s.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-medium">USAGE</span>
                    <div className="w-20 h-2 bg-muted rounded-full">
                      <div className={`h-full rounded-full transition-all ${s.smsUsage > 80 ? "bg-destructive" : s.smsUsage > 50 ? "bg-orange-400" : "bg-green-500"}`} style={{ width: `${s.smsUsage}%` }} />
                    </div>
                    <span className="text-[11px] font-semibold text-foreground">{s.smsUsage}%</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><Edit className="w-4 h-4 text-muted-foreground" /></button>
                    <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"><Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" /></button>
                    <button className="p-1.5 rounded-lg hover:bg-muted transition-colors"><MoreVertical className="w-4 h-4 text-muted-foreground" /></button>
                  </div>
                </td>
              </motion.tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground text-sm">No schools found.</td></tr>
            )}
          </tbody>
        </table>
        )}
      </div>

      {/* Add/Edit School Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingSchool(null); setCreatedCredentials(null); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSchool ? "Edit School" : "Add New School"}</DialogTitle>
            <DialogDescription>{editingSchool ? "Update institution details and admin information." : "Register a new institution and assign a school administrator."}</DialogDescription>
          </DialogHeader>

          {createdCredentials ? (
            <div className="space-y-4 py-2">
              <div className="bg-success/10 border border-success/30 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-success mb-3">✅ School Created Successfully!</h3>
                <p className="text-xs text-muted-foreground mb-4">Please save these credentials securely. The password cannot be retrieved later.</p>
                <div className="space-y-3">
                  {[
                    { label: "School Name", value: createdCredentials.schoolName },
                    { label: "School ID", value: createdCredentials.schoolId },
                    { label: "Admin ID / Username", value: createdCredentials.adminUsername ?? createdCredentials.adminId },
                    { label: "Admin Password", value: createdCredentials.adminPassword },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between bg-card rounded-lg border border-border px-3 py-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">{item.label}</p>
                        <p className="text-sm font-mono font-semibold text-heading">{item.value}</p>
                      </div>
                      <button onClick={() => copyToClipboard(item.value)} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => { setDialogOpen(false); setCreatedCredentials(null); }} className="gradient-primary text-primary-foreground w-full">Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-2">
                <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">School Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>School Name *</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Addis Ababa Academy" />
                  </div>
                  <div>
                    <Label>School ID *</Label>
                    <div className="flex gap-1.5">
                      <Input value={form.schoolId} onChange={(e) => setForm({ ...form, schoolId: e.target.value })} placeholder="Auto-generated" className="font-mono" />
                      {!editingSchool && (
                        <Button type="button" variant="outline" size="icon" onClick={() => {
                          const existingIds = new Set(schools.map(s => s.code));
                          setForm({ ...form, schoolId: generateId("SCH", existingIds) });
                        }} className="shrink-0">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Auto-generated unique ID</p>
                  </div>
                  <div>
                    <Label>Region *</Label>
                    <Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="e.g. Addis Ababa" />
                  </div>
                  <div>
                    <Label>Plan</Label>
                    <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Free">Free</SelectItem>
                        <SelectItem value="Standard">Standard</SelectItem>
                        <SelectItem value="Premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Plan Expiry Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.expireDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.expireDate ? format(form.expireDate, "PPP") : <span>Pick expiry date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={form.expireDate} onSelect={(date) => setForm({ ...form, expireDate: date })} disabled={(date) => date < new Date()} initialFocus className={cn("p-3 pointer-events-auto")} />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2 pt-2">School Admin</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>Admin Full Name *</Label>
                    <Input value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} placeholder="e.g. Dr. Abebe Kebede" />
                  </div>
                  <div>
                    <Label>Admin Email *</Label>
                    <Input type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} placeholder="admin@school.edu" />
                  </div>
                  <div>
                    <Label>Admin Phone</Label>
                    <Input type="tel" value={form.adminPhone} onChange={(e) => setForm({ ...form, adminPhone: e.target.value })} placeholder="+251 9XX XXX XXX" />
                  </div>
                  <div>
                    <Label>Admin ID *</Label>
                    <div className="flex gap-1.5">
                      <Input value={form.adminId} onChange={(e) => setForm({ ...form, adminId: e.target.value })} placeholder="Auto-generated" className="font-mono" />
                      {!editingSchool && (
                        <Button type="button" variant="outline" size="icon" onClick={() => {
                          const existingIds = new Set(schools.map(s => s.adminId).filter(Boolean));
                          setForm({ ...form, adminId: generateId("ADM", existingIds) });
                        }} className="shrink-0">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Auto-generated unique ID</p>
                  </div>
                  {!editingSchool && (
                    <div className="col-span-2">
                      <Label>Password *</Label>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} placeholder="Min 8 characters" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">Min 8 characters: at least one uppercase, one number, and one special character.</p>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingSchool(null); }}>Cancel</Button>
                <Button onClick={handleSave} className="gradient-primary text-primary-foreground">{editingSchool ? "Save Changes" : "Register School"}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
