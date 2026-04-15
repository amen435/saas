import { useState } from "react";
import { UserPlus, ArrowLeft, Loader2, Save, User as UserIcon, BookOpen, Shield, Mail, Phone, Fingerprint } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { teacherService } from "@/services/teacherService";
import FormSectionCard from "@/components/shared/face-enrollment/FormSectionCard";
import FacePreviewCard from "@/components/shared/face-enrollment/FacePreviewCard";
import { useAuth } from "@/contexts/AuthContext";

const MOCK_CLASSES = ["Grade 10-A", "Grade 10-B", "Grade 11-A", "Grade 11-B", "Grade 12-A"];

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  subject: "",
  assignedClasses: [],
  status: "Active",
  userId: "",
  username: "",
  password: "",
};

export default function AddTeacherPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initialForm);
  const [faceImage, setFaceImage] = useState(null);

  const mutation = useMutation({
    mutationFn: (payload) => teacherService.createTeacher(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast.success(res?.message || "Teacher onboarded successfully!");
      navigate("/admin/teachers");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err.message || "Failed to add teacher");
    },
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleClassToggle = (className) => {
    setForm(prev => {
      const current = prev.assignedClasses;
      if (current.includes(className)) {
        return { ...prev, assignedClasses: current.filter(c => c !== className) };
      }
      return { ...prev, assignedClasses: [...current, className] };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      toast.error("Full Name and Official Email are mandatory.");
      return;
    }

    if (!form.userId.trim() || !form.username.trim() || !form.password.trim()) {
      toast.error("System credentials (ID, Username, Password) are mandatory.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast.error("Please enter a valid institution email address.");
      return;
    }

    if (!faceImage) {
      toast.error("Face enrollment is mandatory for faculty security identity.");
      return;
    }

    const payload = {
      fullName: `${form.firstName} ${form.lastName}`.trim(),
      email: form.email,
      phone: form.phone,
      specialization: form.subject,
      assignedClasses: form.assignedClasses,
      status: form.status === "Active" ? "ACTIVE" : "INACTIVE",
      isActive: form.status === "Active",
      userId: form.userId,
      username: form.username,
      password: form.password,
      role: "TEACHER",
      schoolId: user?.schoolId,
      faceImageBase64: faceImage,
      photoBase64: faceImage,
    };

    mutation.mutate(payload);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate("/admin/teachers")}
            className="p-2.5 rounded-xl bg-card border border-border hover:bg-muted transition-all active:scale-95 shadow-sm text-muted-foreground hover:text-heading"
          >
             <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-heading flex items-center gap-2.5 tracking-tight">
              <UserPlus className="w-7 h-7 text-primary" /> Faculty Onboarding
            </h1>
            <p className="text-[11px] text-text-secondary font-bold uppercase tracking-widest mt-1 opacity-70">
              Institution Personnel Registration
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Sections */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Section 1: Professional Profile */}
          <FormSectionCard 
            icon={UserIcon} 
            title="Professional Profile" 
            description="Legal identity and contact information for the faculty member"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-heading uppercase tracking-wide">First Name *</label>
                <input 
                  type="text" 
                  name="firstName" 
                  value={form.firstName} 
                  onChange={handleChange} 
                  placeholder="Official first name" 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-heading placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-heading uppercase tracking-wide">Last Name *</label>
                <input 
                  type="text" 
                  name="lastName" 
                  value={form.lastName} 
                  onChange={handleChange} 
                  placeholder="Official last name" 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-heading placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-heading uppercase tracking-wide flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Institution Email *
                </label>
                <input 
                  type="email" 
                  name="email" 
                  value={form.email} 
                  onChange={handleChange} 
                  placeholder="faculty.name@school.edu" 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-heading placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-heading uppercase tracking-wide flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Contact Number
                </label>
                <input 
                  type="tel" 
                  name="phone" 
                  value={form.phone} 
                  onChange={handleChange} 
                  placeholder="+234 567 890" 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-heading placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                />
              </div>
            </div>
          </FormSectionCard>

          {/* Section 2: Academic Specialization */}
          <FormSectionCard 
            icon={BookOpen} 
            title="Academic Specialization" 
            description="Subject expertise and assigned classroom groups"
          >
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-heading uppercase tracking-wide">Subject Specialization</label>
                <input 
                  type="text" 
                  name="subject" 
                  value={form.subject} 
                  onChange={handleChange} 
                  placeholder="e.g. Physics, World History" 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-heading font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-4 md:col-span-2">
                <label className="text-xs font-bold text-heading uppercase tracking-wide">Assigned Classroom Groups</label>
                <div className="flex flex-wrap gap-2.5">
                  {MOCK_CLASSES.map(cls => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => handleClassToggle(cls)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                        form.assignedClasses.includes(cls) 
                          ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]" 
                          : "bg-muted text-muted-foreground border-border hover:bg-muted/80 shadow-sm"
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </FormSectionCard>

          {/* Section 3: Administrative Credentials */}
          <FormSectionCard 
            icon={Shield} 
            title="Executive Account" 
            description="System access identifiers and authentication credentials"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-heading uppercase tracking-wide">Employee ID *</label>
                <input 
                  type="text" 
                  name="userId" 
                  value={form.userId} 
                  onChange={handleChange} 
                  placeholder="ID-1000" 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-heading font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-heading uppercase tracking-wide">System Username *</label>
                <input 
                  type="text" 
                  name="username" 
                  value={form.username} 
                  onChange={handleChange} 
                  placeholder="firstname.lastname" 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-heading uppercase tracking-wide">Account Status</label>
                <select 
                  name="status" 
                  value={form.status} 
                  onChange={handleChange} 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-heading font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option value="Active">Authorized / Active</option>
                  <option value="Inactive">Restricted / Inactive</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-heading uppercase tracking-wide">Initial Password *</label>
                <input 
                  type="text" 
                  name="password" 
                  value={form.password} 
                  onChange={handleChange} 
                  placeholder="Min. 8 characters" 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                />
              </div>
            </div>
          </FormSectionCard>
        </div>

        {/* Right Column: Faculty Identity Setup */}
        <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-8">
          <FacePreviewCard faceImage={faceImage} onFaceImageChange={setFaceImage} />
          
          <div className="space-y-4">
            <button
              onClick={handleSubmit}
              disabled={mutation.isPending || !form.firstName || !faceImage}
              className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl gradient-primary text-primary-foreground font-black text-sm uppercase tracking-widest shadow-[0_10px_30px_-10px_rgba(var(--primary-rgb),0.5)] hover:shadow-[0_15px_35px_-10px_rgba(var(--primary-rgb),0.6)] hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none disabled:translate-y-0"
            >
              {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {mutation.isPending ? "Configuring Account..." : "Confirm & Setup Faculty"}
            </button>
            <div className="p-4 rounded-xl bg-muted/40 border border-border flex gap-3 text-[10px] text-text-secondary leading-relaxed">
               <Fingerprint className="w-6 h-6 shrink-0 text-primary opacity-60" />
               <p>
                 Faculty onboarding requires biometric validation to ensure the integrity of the school attendance and security ecosystem.
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
