import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { UserPlus, Shield, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { studentService } from "@/services/studentService";
import { classService } from "@/services/classService";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;

/**
 * Shared Add Student form used by both Admin and Homeroom Teacher.
 * @param {Object} props
 * @param {string|number} [props.classId] - Homeroom class ID (required for homeroom; backend POST /api/homeroom/classes/:classId/students)
 * @param {string} [props.fixedClass] - If set, the class field is locked (homeroom use), e.g. "10-A"
 * @param {function} props.onSuccess - Called after successful save with the new student object
 * @param {function} props.onCancel - Called when cancel is clicked
 */
export default function AddStudentForm({ classId, fixedClass, onSuccess, onCancel }) {
  const queryClient = useQueryClient();
  const isHomeroomFlow = !!classId;
  const [form, setForm] = useState(() => ({
    fullName: "",
    userId: `STU-${Math.floor(1000 + Math.random() * 9000)}`,
    username: "",
    selectedClassId: classId ? String(classId) : "",
    password: "",
    confirmPassword: "",
    email: "",
    dateOfBirth: "",
    gender: "",
    parentName: "",
    parentId: `PAR-${Math.floor(1000 + Math.random() * 9000)}`,
    parentPhone: "",
    parentPassword: "",
    confirmParentPassword: "",
  }));
  const [errors, setErrors] = useState({});

  const { data: classesRaw = [] } = useQuery({
    queryKey: ["student-form-classes"],
    queryFn: () => classService.getAll({ isActive: true }),
    enabled: !isHomeroomFlow,
  });

  const classOptions = useMemo(
    () =>
      (Array.isArray(classesRaw) ? classesRaw : [])
        .map((cls) => ({
          id: String(cls?.classId ?? ""),
          label:
            cls?.className ||
            `Grade ${cls?.gradeLevel ?? ""}${cls?.section ? `-${cls.section}` : ""}`.trim(),
        }))
        .filter((cls) => cls.id),
    [classesRaw]
  );

  const mutation = useMutation({
    mutationFn: (data) => studentService.createStudent(classId, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["homeroomAllStudents"] });
      queryClient.invalidateQueries({ queryKey: ["homeroom-students"] });
      queryClient.invalidateQueries({ queryKey: ["homeroomStudents"] });
      queryClient.invalidateQueries({ queryKey: ["adminStudents"] });
      const payload = res?.data ?? res;
      const message = (typeof res?.message === "string" ? res.message : null) || payload?.message || "Student added successfully!";
      toast.success(message);
      onSuccess?.(payload?.data ?? payload);
    },
    onError: (error) => {
      // API errors are globally handled by the axios interceptor + react-hot-toast
      // so we just log here to avoid duplicate error toasts.
      console.error("Failed to add student", error);
    },
  });

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const regenerateUserId = () => {
    const newId = `STU-${Math.floor(1000 + Math.random() * 9000)}`;
    update("userId", newId);
    if (!form.username?.trim()) update("username", newId.toLowerCase().replace(/-/g, "."));
  };

  const regenerateParentId = () => {
    update("parentId", `PAR-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const validate = () => {
    const e = {};
    if (!form.fullName?.trim()) e.fullName = "Required";
    if (!form.userId?.trim()) e.userId = "Required";
    if (!form.username?.trim()) e.username = "Required";
    if (!form.password) e.password = "Required";
    else if (!passwordRegex.test(form.password))
      e.password = "Min 8 chars, uppercase, lowercase, number, special char";
    if (!isHomeroomFlow && !form.selectedClassId) e.selectedClassId = "Required";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords don't match";
    if (!form.parentName?.trim()) e.parentName = "Required";
    if (!form.parentId?.trim()) e.parentId = "Required";
    if (!form.parentPhone?.trim()) e.parentPhone = "Required";
    if (!form.parentPassword) e.parentPassword = "Required";
    else if (!passwordRegex.test(form.parentPassword))
      e.parentPassword = "Min 8 chars, uppercase, lowercase, number, special char";
    if (form.parentPassword !== form.confirmParentPassword) e.confirmParentPassword = "Passwords don't match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      toast.error("Please fill all required fields (Full Name, User ID, Username, Password, Guardian).");
      return;
    }
    // New contract: backend expects both student and parent together:
    //   { student: {...}, parent: {...} }
    const payload = {
      student: {
        classId: classId ?? (form.selectedClassId ? Number(form.selectedClassId) : undefined),
        userId: form.userId.trim(),
        username: form.username.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        email: form.email?.trim() || undefined,
        phone: undefined, // not collected in this form (student.user.phone can stay null)
        studentCode: undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender ? form.gender.toUpperCase() : undefined,
        guardianName: form.parentName?.trim() || undefined, // backward-compatible fallback
        guardianPhone: form.parentPhone?.trim() || undefined, // backward-compatible fallback
        address: undefined,
      },
      parent: {
        // Backend generates username/password if they are not provided by UI.
        userId: form.parentId.trim(),
        fullName: form.parentName?.trim() || undefined,
        phoneNumber: form.parentPhone?.trim() || undefined,
        password: form.parentPassword,
        relationship: undefined,
        occupation: undefined,
        address: undefined,
      },
    };

    mutation.mutate(payload);
  };

  const saving = mutation.isPending;

  const Field = ({ label, field, type = "text", placeholder, disabled, note, value: overrideValue, suffix }) => (
    <div>
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex gap-1.5 mt-1">
        <Input
          type={type}
          value={disabled ? (overrideValue || "") : form[field]}
          onChange={e => update(field, e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`${disabled ? "bg-muted cursor-not-allowed" : ""} ${errors[field] ? "border-destructive" : ""}`}
        />
        {suffix}
      </div>
      {errors[field] && <p className="text-xs text-destructive mt-1">{errors[field]}</p>}
      {note && <p className="text-[10px] text-muted-foreground mt-1">{note}</p>}
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-6 space-y-6">
      {/* Student Info */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-heading uppercase tracking-wider">Student Information</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name *" field="fullName" placeholder="e.g. Abebe Tesfaye" />
          <Field
            label="User ID *" field="userId" placeholder="e.g. boleST001"
            note="Unique ID for login. Click refresh to generate."
            suffix={
              <Button type="button" variant="outline" size="icon" onClick={regenerateUserId} className="shrink-0">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            }
          />
          <Field label="Username *" field="username" placeholder="e.g. student.abebe" />
          <Field type="email" label="Email" field="email" placeholder="optional@email.com" />
          {fixedClass ? (
            <Field label="Class" field="class" disabled value={fixedClass} note="Auto-assigned to your homeroom class" />
          ) : (
            <div>
              <Label className="text-sm font-medium">Class *</Label>
              <select
                value={form.selectedClassId}
                onChange={e => update("selectedClassId", e.target.value)}
                className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1 ${errors.selectedClassId ? "border-destructive" : "border-input"}`}
              >
                <option value="">Select class...</option>
                {classOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              {errors.selectedClassId && <p className="text-xs text-destructive mt-1">{errors.selectedClassId}</p>}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <Label className="text-sm font-medium">Date of birth</Label>
            <Input type="date" value={form.dateOfBirth} onChange={e => update("dateOfBirth", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-sm font-medium">Gender</Label>
            <select value={form.gender} onChange={e => update("gender", e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
              <option value="">Select...</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <Label className="text-sm font-medium">Password *</Label>
            <Input type="password" value={form.password} onChange={e => update("password", e.target.value)}
              placeholder="Min 8 chars, mixed case, number, special" className={`mt-1 ${errors.password ? "border-destructive" : ""}`} />
            {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
            <div className="flex items-center gap-1 mt-1">
              <Shield className="w-3 h-3 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground">Password will be securely hashed</p>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">Confirm Password *</Label>
            <Input type="password" value={form.confirmPassword} onChange={e => update("confirmPassword", e.target.value)}
              placeholder="Re-enter password" className={`mt-1 ${errors.confirmPassword ? "border-destructive" : ""}`} />
            {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>}
          </div>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Parent Info */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-heading uppercase tracking-wider">Parent / Guardian</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name *" field="parentName" placeholder="Enter parent name" />
          <Field
            label="Parent ID *" field="parentId" placeholder="Auto-generated"
            note="Auto-generated unique ID. Click refresh to regenerate."
            suffix={
              <Button type="button" variant="outline" size="icon" onClick={regenerateParentId} className="shrink-0">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            }
          />
          <Field label="Phone Number *" field="parentPhone" placeholder="0911..." />
          <Field
            type="password"
            label="Parent Password *"
            field="parentPassword"
            placeholder="Min 8 chars, mixed case, number, special"
          />
          <Field
            type="password"
            label="Confirm Parent Password *"
            field="confirmParentPassword"
            placeholder="Re-enter password"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving} className="gradient-primary text-primary-foreground gap-2">
          <UserPlus className="w-4 h-4" />
          {saving ? "Adding..." : "Add Student"}
        </Button>
      </div>
    </motion.div>
  );
}
