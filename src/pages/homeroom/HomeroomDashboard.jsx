import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Users, CalendarCheck, AlertTriangle, TrendingUp, BookOpen, MessageSquare, Camera, Eye, Phone } from "lucide-react";
import { AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { useHomeroomClasses, useHomeroomStudents } from "@/hooks/useStudents";
import { parentService } from "@/services/parentService";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ATTENDANCE_KEY = "homeroom_attendance";

function loadAttendance() {
  try { return JSON.parse(localStorage.getItem(ATTENDANCE_KEY)) || {}; } catch { return {}; }
}

export default function HomeroomDashboard() {
  const queryClient = useQueryClient();
  const [profilePhoto, setProfilePhoto] = useState(null);
  const { data: homeroomClasses = [], isLoading: classesLoading } = useHomeroomClasses();
  const firstClass = homeroomClasses[0];
  const classId = firstClass?.classId ?? firstClass?.id;
  const { data: studentsRaw = [], isLoading: studentsLoading } = useHomeroomStudents(classId, { isActive: true });
  const { data: inactiveStudentsRaw = [], isLoading: inactiveStudentsLoading } = useHomeroomStudents(classId, { isActive: false });

  const {
    data: parentsResp,
    isLoading: parentsLoading,
  } = useQuery({
    queryKey: ["homeroomParents", classId],
    queryFn: () => parentService.getByClass(classId),
    enabled: !!classId,
  });

  useEffect(() => {
    const saved = localStorage.getItem("homeroom_profile_photo");
    if (saved) setProfilePhoto(saved);
  }, []);

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target.result;
      localStorage.setItem("homeroom_profile_photo", url);
      setProfilePhoto(url);
    };
    reader.readAsDataURL(file);
  };

  const parents = useMemo(() => {
    const d = parentsResp?.data;
    return Array.isArray(d) ? d : [];
  }, [parentsResp]);

  const students = useMemo(() => {
    const arr = Array.isArray(studentsRaw) ? studentsRaw : [];
    return arr.map((s) => {
      const parentPhone = s.guardianPhone || "";
      const matchedParent = parents.find((p) => {
        const phone = p?.user?.phone ?? p?.phoneNumber ?? null;
        return phone && parentPhone && String(phone) === String(parentPhone);
      });

      return {
        id: s.studentId ?? s.id,
        fullName: s.user?.fullName || "—",
        loginId: s.user?.userId || "—",
        classLabel:
          s.class?.className ||
          (firstClass
            ? `Grade ${firstClass.gradeLevel ?? ""}${firstClass.section ? `-${firstClass.section}` : ""}`.trim()
            : "—"),
        parentName: s.guardianName || "—",
        parentPhone,
        parentId: matchedParent?.parentId ?? null,
        status: s.isActive ? "Active" : "Inactive",
      };
    });
  }, [studentsRaw, firstClass, parents]);

  const inactiveStudents = useMemo(() => {
    const arr = Array.isArray(inactiveStudentsRaw) ? inactiveStudentsRaw : [];
    return arr.map((s) => {
      const parentPhone = s.guardianPhone || "";
      const matchedParent = parents.find((p) => {
        const phone = p?.user?.phone ?? p?.phoneNumber ?? null;
        return phone && parentPhone && String(phone) === String(parentPhone);
      });

      return {
        id: s.studentId ?? s.id,
        fullName: s.user?.fullName || "—",
        loginId: s.user?.userId || "—",
        classLabel:
          s.class?.className ||
          (firstClass
            ? `Grade ${firstClass.gradeLevel ?? ""}${firstClass.section ? `-${firstClass.section}` : ""}`.trim()
            : "—"),
        parentName: s.guardianName || "—",
        parentPhone,
        parentId: matchedParent?.parentId ?? null,
        status: s.isActive ? "Active" : "Inactive",
      };
    });
  }, [inactiveStudentsRaw, firstClass, parents]);

  const totalStudents = students.length + inactiveStudents.length;

  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [studentDialogMode, setStudentDialogMode] = useState("view"); // view | edit
  const [activeStudent, setActiveStudent] = useState(null);
  const [studentForm, setStudentForm] = useState({
    studentFullName: "",
    parentFullName: "",
    parentPhone: "",
  });

  const [parentDialogOpen, setParentDialogOpen] = useState(false);
  const [activeParent, setActiveParent] = useState(null);
  const [parentForm, setParentForm] = useState({
    parentFullName: "",
    parentPhone: "",
    relationship: "",
    occupation: "",
    address: "",
  });

  const updateParentMutation = useMutation({
    mutationFn: async ({ parentId, payload }) => {
      await parentService.update(parentId, {
        fullName: payload.parentFullName,
        phone: payload.parentPhone,
        relationship: payload.relationship || undefined,
        occupation: payload.occupation || undefined,
        address: payload.address || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homeroomParents", classId], exact: false });
      toast.success("Parent updated");
      setParentDialogOpen(false);
    },
    onError: (err) => {
      console.error("Failed to update parent", err);
      toast.error("Failed to update parent");
    },
  });

  // Attendance data for charts
  const attendance = loadAttendance();
  const todayStr = new Date().toISOString().split("T")[0];

  const getTodayStats = () => {
    let p = 0, a = 0, l = 0;
    students.forEach(s => {
      const status = attendance[s.id]?.[todayStr];
      if (status === "P") p++; else if (status === "A") a++; else if (status === "L") l++;
    });
    return { p, a, l, total: students.length };
  };

  const getWeeklyTrend = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      const dayName = d.toLocaleDateString("en", { weekday: "short" });
      let present = 0, absent = 0;
      students.forEach(s => {
        const st = attendance[s.id]?.[ds];
        if (st === "P") present++; else if (st === "A" || st === "L") absent++;
      });
      days.push({ day: dayName, present, absent });
    }
    return days;
  };

  const getStudentComparison = () => {
    return students.slice(0, 10).map(s => {
      const records = attendance[s.id] || {};
      const total = Object.keys(records).length;
      const present = Object.values(records).filter(v => v === "P").length;
      return { name: s.fullName.split(" ")[0], rate: total > 0 ? Math.round((present / total) * 100) : 0 };
    });
  };

  const todayStats = getTodayStats();
  const weeklyTrend = getWeeklyTrend();
  const studentComparison = getStudentComparison();

  const behaviorBreakdown = [
    { name: "Excellent", value: 18, color: "hsl(var(--success))" },
    { name: "Good", value: 14, color: "hsl(var(--info))" },
    { name: "Needs Improvement", value: 6, color: "hsl(var(--warning))" },
    { name: "Concern", value: 2, color: "hsl(var(--destructive))" },
  ];

  const stats = [
    { label: "Total Students", value: totalStudents, icon: Users, change: `${students.filter(s => s.status === "Active").length} active`, color: "text-primary" },
    { label: "Today's Attendance", value: students.length > 0 ? `${Math.round(((todayStats.p) / Math.max(students.length, 1)) * 100)}%` : "N/A", icon: CalendarCheck, change: `${todayStats.p}/${students.length} present`, color: "text-success" },
    { label: "Absent Today", value: todayStats.a, icon: AlertTriangle, change: `${todayStats.l} late`, color: "text-destructive" },
    { label: "Homework Completion", value: "88%", icon: BookOpen, change: "35/40 submitted", color: "text-primary" },
    { label: "Parent Messages", value: "6", icon: MessageSquare, change: "3 unread", color: "text-warning" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <label className="relative cursor-pointer group flex-shrink-0">
            {profilePhoto ? (
              <img src={profilePhoto} alt="Profile" className="w-12 h-12 rounded-full border-2 border-border object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full gradient-primary border-2 border-border flex items-center justify-center text-primary-foreground font-bold text-lg">H</div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-3.5 h-3.5 text-white" />
            </div>
            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
          </label>
          <div>
            <h1 className="text-2xl font-bold text-heading">Homeroom Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {firstClass ? `Grade ${firstClass.gradeLevel ?? ""}${firstClass.section ? ` — Section ${firstClass.section}` : ""}` : "No homeroom class"} • {totalStudents} Students
            </p>
          </div>
        </div>
        <div className="text-xs font-medium text-muted-foreground">
          Student records are read-only for homeroom teachers.
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <TrendingUp className="w-3 h-3 text-success" />
            </div>
            <p className="text-xl font-bold text-heading">{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            <p className="text-[10px] text-success mt-1">{s.change}</p>
          </motion.div>
        ))}
      </div>

      {/* Student List */}
      {(classesLoading || studentsLoading || inactiveStudentsLoading || parentsLoading) && (
        <div className="bg-card rounded-xl border border-border p-5 text-sm text-muted-foreground">
          Loading students…
        </div>
      )}
      {students.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl border border-border overflow-x-auto">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-heading">Students</h3>
            <span className="text-xs text-muted-foreground">{students.length} total</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Student", "ID", "Class", "Parent", "Phone", "Status", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-[11px] font-semibold text-muted-foreground text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">{s.fullName.charAt(0)}</div>
                      <span className="text-sm font-medium text-heading">{s.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{s.loginId}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{s.classLabel}</td>
                  <td className="px-4 py-3 text-sm text-heading">{s.parentName}</td>
                  <td className="px-4 py-3">
                    {s.parentPhone ? (
                      <a href={`tel:${s.parentPhone}`} className="p-1.5 rounded-md bg-success/10 text-success hover:bg-success/20 inline-flex"><Phone className="w-3.5 h-3.5" /></a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success/10 text-success">{s.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setActiveStudent(s);
                          setStudentDialogMode("view");
                          setStudentForm({
                            studentFullName: s.fullName,
                            parentFullName: s.parentName !== "—" ? s.parentName : "",
                            parentPhone: s.parentPhone || "",
                          });
                          setStudentDialogOpen(true);
                        }}
                        className="p-1.5 rounded-md hover:bg-muted"
                        title="View"
                      >
                        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => {
                          setActiveStudent(s);
                          setStudentDialogMode("view");
                          setStudentForm({
                            studentFullName: s.fullName,
                            parentFullName: s.parentName !== "—" ? s.parentName : "",
                            parentPhone: s.parentPhone || "",
                          });
                          setStudentDialogOpen(true);
                        }}
                        className="p-1.5 rounded-md hover:bg-muted"
                        title="View"
                      >
                        <span className="text-xs font-semibold px-2 py-1 rounded-md bg-muted/40 text-heading">View</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* Inactive Students */}
      {inactiveStudents.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl border border-border overflow-x-auto">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-heading">Inactive Students</h3>
            <span className="text-xs text-muted-foreground">{inactiveStudents.length} total</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Student", "ID", "Class", "Parent", "Phone", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-[11px] font-semibold text-muted-foreground text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inactiveStudents.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                        {s.fullName.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-heading">{s.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{s.loginId}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{s.classLabel}</td>
                  <td className="px-4 py-3 text-sm text-heading">{s.parentName}</td>
                  <td className="px-4 py-3">
                    {s.parentPhone ? (
                      <a
                        href={`tel:${s.parentPhone}`}
                        className="p-1.5 rounded-md bg-success/10 text-success hover:bg-success/20 inline-flex"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setActiveStudent(s);
                          setStudentDialogMode("view");
                          setStudentForm({
                            studentFullName: s.fullName,
                            parentFullName: s.parentName !== "—" ? s.parentName : "",
                            parentPhone: s.parentPhone || "",
                          });
                          setStudentDialogOpen(true);
                        }}
                        className="p-1.5 rounded-md hover:bg-muted"
                        title="View"
                      >
                        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => {
                          setActiveStudent(s);
                          setStudentDialogMode("view");
                          setStudentForm({
                            studentFullName: s.fullName,
                            parentFullName: s.parentName !== "—" ? s.parentName : "",
                            parentPhone: s.parentPhone || "",
                          });
                          setStudentDialogOpen(true);
                        }}
                        className="p-1.5 rounded-md hover:bg-muted"
                        title="View"
                      >
                        <span className="text-xs font-semibold px-2 py-1 rounded-md bg-muted/40 text-heading">View</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* Parents List (CRUD basics) */}
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-heading">Parents</h3>
          <span className="text-xs text-muted-foreground">{parents.length} total</span>
        </div>
        <div className="p-4">
          {(parentsLoading || !parents.length) ? (
            <div className="text-sm text-muted-foreground">Loading parents…</div>
          ) : (
            <div className="space-y-3">
              {parents.slice(0, 20).map((p) => (
                <div key={p.parentId} className="flex items-center justify-between gap-3 border border-border/60 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-heading">{p.user?.fullName || "—"}</p>
                    <p className="text-xs text-muted-foreground font-mono">{p.user?.phone || "—"} • {p.children?.length || 0} student(s)</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveParent(p);
                      setParentForm({
                        parentFullName: p.user?.fullName || "",
                        parentPhone: p.user?.phone || "",
                        relationship: p.relationship || "",
                        occupation: p.occupation || "",
                        address: p.address || "",
                      });
                      setParentDialogOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Student/Parent Dialogs */}
      <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>Homeroom teachers can review student and guardian information for their assigned class.</DialogDescription>
          </DialogHeader>
          {activeStudent && (
            <div className="space-y-3 py-2">
              <div>
                <Label>Student Name</Label>
                <Input
                  value={studentForm.studentFullName}
                  onChange={(e) => setStudentForm((prev) => ({ ...prev, studentFullName: e.target.value }))}
                  disabled={studentDialogMode === "view"}
                />
              </div>
              <div>
                <Label>Parent/Guardian Name</Label>
                <Input
                  value={studentForm.parentFullName}
                  onChange={(e) => setStudentForm((prev) => ({ ...prev, parentFullName: e.target.value }))}
                  disabled={studentDialogMode === "view"}
                />
              </div>
              <div>
                <Label>Parent/Guardian Phone</Label>
                <Input
                  value={studentForm.parentPhone}
                  onChange={(e) => setStudentForm((prev) => ({ ...prev, parentPhone: e.target.value }))}
                  disabled={studentDialogMode === "view"}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                Student ID: <span className="font-mono">{activeStudent.loginId}</span>
                {activeStudent.parentId ? (
                  <> • Parent ID: <span className="font-mono">{activeStudent.parentId}</span></>
                ) : (
                  <> • Parent: <span className="font-mono">not found</span></>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStudentDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={parentDialogOpen} onOpenChange={setParentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Parent</DialogTitle>
            <DialogDescription>Update parent account information.</DialogDescription>
          </DialogHeader>
          {activeParent && (
            <div className="space-y-3 py-2">
              <div>
                <Label>Full Name</Label>
                <Input value={parentForm.parentFullName} onChange={(e) => setParentForm((prev) => ({ ...prev, parentFullName: e.target.value }))} />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input value={parentForm.parentPhone} onChange={(e) => setParentForm((prev) => ({ ...prev, parentPhone: e.target.value }))} />
              </div>
              <div>
                <Label>Relationship</Label>
                <Input value={parentForm.relationship} onChange={(e) => setParentForm((prev) => ({ ...prev, relationship: e.target.value }))} />
              </div>
              <div>
                <Label>Occupation</Label>
                <Input value={parentForm.occupation} onChange={(e) => setParentForm((prev) => ({ ...prev, occupation: e.target.value }))} />
              </div>
              <div>
                <Label>Address</Label>
                <Input value={parentForm.address} onChange={(e) => setParentForm((prev) => ({ ...prev, address: e.target.value }))} />
              </div>
              <div className="text-xs text-muted-foreground">
                Linked students: {activeParent.children?.length || 0}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setParentDialogOpen(false)}>
              Close
            </Button>
            {activeParent && (
              <Button
                className="gradient-primary text-primary-foreground"
                onClick={() => {
                  if (!parentForm.parentFullName.trim() || !parentForm.parentPhone.trim()) {
                    toast.error("Parent full name and phone are required.");
                    return;
                  }
                  updateParentMutation.mutate({
                    parentId: activeParent.parentId,
                    payload: {
                      parentFullName: parentForm.parentFullName.trim(),
                      parentPhone: parentForm.parentPhone.trim(),
                      relationship: parentForm.relationship.trim(),
                      occupation: parentForm.occupation.trim(),
                      address: parentForm.address.trim(),
                    },
                  });
                }}
                disabled={updateParentMutation.isPending}
              >
                {updateParentMutation.isPending ? "Saving..." : "Save"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-heading mb-4">Weekly Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weeklyTrend}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="present" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.15} strokeWidth={2} name="Present" />
              <Area type="monotone" dataKey="absent" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.15} strokeWidth={2} name="Absent/Late" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-heading mb-4">Behavior Overview</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={behaviorBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                {behaviorBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2">
            {behaviorBreakdown.map((b, i) => (
              <div key={i} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: b.color }} />
                  <span className="text-muted-foreground">{b.name}</span>
                </div>
                <span className="font-medium text-heading">{b.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Student Attendance Comparison */}
      {studentComparison.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-heading mb-4">Student Attendance Comparison</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={studentComparison}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v) => `${v}%`} />
              <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Attendance %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

    </div>
  );
}
