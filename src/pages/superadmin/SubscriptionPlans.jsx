import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, CreditCard, CheckCircle, XCircle, Search, Calendar, DollarSign, TrendingUp, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toast } from "sonner";

const emptyPlan = { name: "", price: "", billing: "monthly", maxStudents: "", maxTeachers: "", smsQuota: "", aiEnabled: false };

export default function SubscriptionPlans() {
  const [plans, setPlans] = useState([]);
  const [payments] = useState([]);
  const revenueByPlan = [];
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [form, setForm] = useState(emptyPlan);
  const [searchQuery, setSearchQuery] = useState("");

  const openAdd = () => { setEditingPlan(null); setForm(emptyPlan); setDialogOpen(true); };
  const openEdit = (plan) => {
    setEditingPlan(plan);
    setForm({ name: plan.name, price: plan.price, billing: plan.billing, maxStudents: plan.maxStudents, maxTeachers: plan.maxTeachers, smsQuota: plan.smsQuota, aiEnabled: plan.aiEnabled });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.price) { toast.error("Name and price are required."); return; }
    if (editingPlan) {
      setPlans(plans.map((p) => p.id === editingPlan.id ? { ...p, ...form, price: Number(form.price), maxStudents: Number(form.maxStudents), maxTeachers: Number(form.maxTeachers), smsQuota: Number(form.smsQuota) } : p));
      toast.success(`${form.name} plan updated.`);
    } else {
      setPlans([...plans, { id: Date.now(), ...form, price: Number(form.price), maxStudents: Number(form.maxStudents), maxTeachers: Number(form.maxTeachers), smsQuota: Number(form.smsQuota), features: [], active: true, schools: 0 }]);
      toast.success(`${form.name} plan created.`);
    }
    setDialogOpen(false);
  };

  const togglePlan = (id) => setPlans(plans.map((p) => p.id === id ? { ...p, active: !p.active } : p));
  const deletePlan = (id) => { setPlans(plans.filter((p) => p.id !== id)); toast("Plan deleted"); };

  const filteredPayments = payments.filter((p) => p.school.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Subscription & Billing</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage pricing plans, payments, and subscriptions.</p>
        </div>
        <Button onClick={openAdd} className="gradient-primary text-primary-foreground gap-2">
          <Plus className="w-4 h-4" /> CREATE PLAN
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Monthly Revenue", value: "$2,796", icon: DollarSign, color: "bg-success/10 text-success" },
          { label: "Active Subscriptions", value: "18", icon: TrendingUp, color: "bg-primary/10 text-primary" },
          { label: "Trial Schools", value: "3", icon: Calendar, color: "bg-warning/10 text-warning" },
          { label: "Overdue Payments", value: "1", icon: CreditCard, color: "bg-destructive/10 text-destructive" },
        ].map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-card rounded-xl border border-border p-5">
            <div className={`w-8 h-8 rounded-lg ${k.color} flex items-center justify-center mb-2`}><k.icon className="w-4 h-4" /></div>
            <p className="text-xl font-bold text-heading">{k.value}</p>
            <p className="text-[11px] text-muted-foreground">{k.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((plan, i) => (
          <motion.div key={plan.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`bg-card rounded-xl border-2 p-6 relative ${plan.name === "Enterprise" ? "border-primary" : "border-border"}`}>
            {plan.name === "Enterprise" && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 gradient-primary text-primary-foreground text-[10px] font-bold rounded-full">POPULAR</div>}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-heading">{plan.name}</h3>
              <div className="flex gap-1">
                <button onClick={() => openEdit(plan)} className="p-1.5 rounded-lg hover:bg-muted"><Edit className="w-3.5 h-3.5 text-muted-foreground" /></button>
                <button onClick={() => deletePlan(plan.id)} className="p-1.5 rounded-lg hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
              </div>
            </div>
            <div className="mb-4">
              <span className="text-3xl font-bold text-heading">${plan.price}</span>
              <span className="text-sm text-muted-foreground">/{plan.billing}</span>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground mb-4">
              <p>Up to <span className="font-semibold text-heading">{plan.maxStudents.toLocaleString()}</span> students</p>
              <p>Up to <span className="font-semibold text-heading">{plan.maxTeachers}</span> teachers</p>
              <p><span className="font-semibold text-heading">{plan.smsQuota.toLocaleString()}</span> SMS/month</p>
              <p>AI Features: <span className={`font-semibold ${plan.aiEnabled ? "text-success" : "text-destructive"}`}>{plan.aiEnabled ? "Enabled" : "Disabled"}</span></p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-xs text-muted-foreground"><span className="font-semibold text-heading">{plan.schools}</span> schools</span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold ${plan.active ? "text-success" : "text-destructive"}`}>{plan.active ? "ACTIVE" : "INACTIVE"}</span>
                <Switch checked={plan.active} onCheckedChange={() => togglePlan(plan.id)} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-heading mb-4">Revenue by Plan</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueByPlan}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} formatter={(v) => `$${v}`} />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                {revenueByPlan.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-heading mb-4">Plan Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={plans.map((p) => ({ name: p.name, value: p.schools }))} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                <Cell fill="hsl(var(--muted-foreground))" />
                <Cell fill="hsl(var(--info))" />
                <Cell fill="hsl(var(--primary))" />
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-card rounded-xl border border-border">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-heading">Payment History</h3>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search school..." className="pl-10 h-9" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["School", "Plan", "Amount", "Date", "Status"].map((h) => (
                  <th key={h} className="px-5 py-3 text-[11px] font-semibold text-muted-foreground tracking-wider text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-5 py-3 text-sm font-medium text-heading">{p.school}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{p.plan}</td>
                  <td className="px-5 py-3 text-sm font-semibold text-heading">${p.amount}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{p.date}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${p.status === "Paid" ? "text-success" : p.status === "Overdue" ? "text-destructive" : "text-warning"}`}>
                      {p.status === "Paid" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {p.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plan Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Plan" : "Create New Plan"}</DialogTitle>
            <DialogDescription>Configure pricing and limits for this subscription tier.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Plan Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Premium" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Price ($) *</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
              <div><Label>Billing Cycle</Label>
                <Select value={form.billing} onValueChange={(v) => setForm({ ...form, billing: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="yearly">Yearly</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Max Students</Label><Input type="number" value={form.maxStudents} onChange={(e) => setForm({ ...form, maxStudents: e.target.value })} /></div>
              <div><Label>Max Teachers</Label><Input type="number" value={form.maxTeachers} onChange={(e) => setForm({ ...form, maxTeachers: e.target.value })} /></div>
            </div>
            <div><Label>SMS Quota</Label><Input type="number" value={form.smsQuota} onChange={(e) => setForm({ ...form, smsQuota: e.target.value })} /></div>
            <div className="flex items-center justify-between">
              <Label>Enable AI Features</Label>
              <Switch checked={form.aiEnabled} onCheckedChange={(v) => setForm({ ...form, aiEnabled: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="gradient-primary text-primary-foreground">{editingPlan ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
