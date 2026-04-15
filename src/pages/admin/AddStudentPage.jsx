import { useState } from "react";
import { UserPlus, ArrowLeft, Loader2, Save, User as UserIcon, BookOpen, Heart, Users, Shield, Fingerprint, Lock, IdCard } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { studentService } from "@/services/studentService";
import FormSectionCard from "@/components/shared/face-enrollment/FormSectionCard";
import FacePreviewCard from "@/components/shared/face-enrollment/FacePreviewCard";

const initialForm = {
  fullName: "",
  gender: "Male",
  dob: "",
  classId: "",
  status: "Active",
  // System Credentials
  userId: "",
  username: "",
  password: "",
  // Parent / Guardian Structured Object - Renamed to match backend requirement
  parent: {
    fullName: "",
    relationship: "Father",
    phoneNumber: "",
    email: "",
    address: "",
    userId: "", // Added parentId / userId
    password: "", // Added parent password
  },
  // Emergency Contact Structured Object
  emergencyContact: {
    fullName: "",
    relationship: "",
    phone: "",
  }
};

export default function AddStudentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initialForm);
  const [faceImage, setFaceImage] = useState(null);

  const mutation = useMutation({
    mutationFn: (payload) => studentService.createStudent(null, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      toast.success(res?.message || "Student enrolled successfully!");
      navigate("/admin/students");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err.message || "Failed to add student");
    },
  });

  const handleBaseChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  
  const handleNestedChange = (section, field, value) => {
    setForm(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Core Validation
    if (!form.fullName.trim()) {
      toast.error("Student Full Name is mandatory.");
      return;
    }

    if (!form.userId.trim() || !form.username.trim() || !form.password.trim()) {
      toast.error("Student ID, Username, and Password are required for system access.");
      return;
    }

    if (!form.parent.fullName.trim() || !form.parent.phoneNumber.trim()) {
      toast.error("Parent/Guardian Name and Phone Number are mandatory.");
      return;
    }

    if (!form.parent.userId.trim() || !form.parent.password.trim()) {
      toast.error("Parent Account ID and Password are mandatory.");
      return;
    }

    if (!faceImage) {
      toast.error("A Face Enrollment photo is required for security protocols.");
      return;
    }

    const payload = {
      fullName: form.fullName.trim(),
      gender: form.gender,
      dob: form.dob,
      classId: form.classId,
      userId: form.userId,
      username: form.username,
      password: form.password,
      isActive: form.status === "Active",
      faceImageBase64: faceImage,
      parent: form.parent,
      emergencyContact: form.emergencyContact.fullName ? form.emergencyContact : undefined
    };

    mutation.mutate(payload);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate("/admin/students")}
            className="p-2.5 rounded-xl bg-card border border-border hover:bg-muted transition-all active:scale-95 shadow-sm text-muted-foreground hover:text-heading"
          >
             <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-heading flex items-center gap-2.5 tracking-tight">
              <UserPlus className="w-7 h-7 text-primary" /> System Student Admission
            </h1>
            <p className="text-[11px] text-text-secondary font-bold uppercase tracking-widest mt-1 opacity-70">
              Official School Registration Form
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Comprehensive Admission Forms */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Section 1: Official Student Record */}
          <FormSectionCard 
            icon={UserIcon} 
            title="Student Identification" 
            description="Legal name and basic demographics for the student record"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-heading uppercase tracking-wide">Full Legal Name *</label>
                <input 
                  type="text" 
                  name="fullName" 
                  value={form.fullName} 
                  onChange={handleBaseChange} 
                  placeholder="Official full name of the student" 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-heading placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-heading uppercase tracking-wide">Biological Gender</label>
                <select 
                  name="gender" 
                  value={form.gender} 
                  onChange={handleBaseChange} 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-heading font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-heading uppercase tracking-wide">Date of Birth</label>
                <input 
                  type="date" 
                  name="dob" 
                  value={form.dob} 
                  onChange={handleBaseChange} 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-heading font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-heading uppercase tracking-wide">Enrollment Class</label>
                <input 
                  type="text" 
                  name="classId" 
                  value={form.classId} 
                  onChange={handleBaseChange} 
                  placeholder="e.g. Grade 10-A" 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-heading font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-heading uppercase tracking-wide">Enrollment Status</label>
                <select 
                  name="status" 
                  value={form.status} 
                  onChange={handleBaseChange} 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-heading font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option value="Active">Active / Enrolled</option>
                  <option value="Inactive">Inactive / Pending</option>
                </select>
              </div>
            </div>
          </FormSectionCard>

          {/* Section 2: Account Information */}
          <FormSectionCard 
            icon={Shield} 
            title="System Access Credentials" 
            description="Login details for student dashboard access"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-heading uppercase tracking-wide">Student ID *</label>
                <input 
                  type="text" 
                  name="userId" 
                  value={form.userId} 
                  onChange={handleBaseChange} 
                  placeholder="STU-2024-001" 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-heading font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-heading uppercase tracking-wide">Username *</label>
                <input 
                  type="text" 
                  name="username" 
                  value={form.username} 
                  onChange={handleBaseChange} 
                  placeholder="student.username" 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-heading uppercase tracking-wide">Initial Password *</label>
                <input 
                  type="text" 
                  name="password" 
                  value={form.password} 
                  onChange={handleBaseChange} 
                  placeholder="Min. 8 characters" 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                />
              </div>
            </div>
          </FormSectionCard>

          {/* Section 3: Parent / Guardian Record */}
          <FormSectionCard 
            icon={Users} 
            title="Parent / Guardian Record" 
            description="Primary contact information for student legal guardians"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-heading uppercase tracking-wide">Full Legal Name *</label>
                <input 
                  type="text" 
                  value={form.parent.fullName} 
                  onChange={(e) => handleNestedChange('parent', 'fullName', e.target.value)} 
                  placeholder="Full name of primary guardian" 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-heading placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-heading uppercase tracking-wide">Relationship to Student *</label>
                <select 
                  value={form.parent.relationship} 
                  onChange={(e) => handleNestedChange('parent', 'relationship', e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-heading font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Legal Guardian</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-heading uppercase tracking-wide">Primary Contact Phone *</label>
                <input 
                  type="tel" 
                  value={form.parent.phoneNumber} 
                  onChange={(e) => handleNestedChange('parent', 'phoneNumber', e.target.value)} 
                  placeholder="+234 567 890" 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-heading font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-heading uppercase tracking-wide">Email Address (Optional)</label>
                <input 
                  type="email" 
                  value={form.parent.email} 
                  onChange={(e) => handleNestedChange('parent', 'email', e.target.value)} 
                  placeholder="parent@example.com" 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-heading font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-heading uppercase tracking-wide">Residential Address (Optional)</label>
                <textarea 
                  rows={2}
                  value={form.parent.address} 
                  onChange={(e) => handleNestedChange('parent', 'address', e.target.value)} 
                  placeholder="Full street address, city, state" 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-heading font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              {/* Added Parent Account Credentials */}
              <div className="space-y-2 md:col-span-2 pt-4 border-t border-border mt-2">
                <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Guardian Portal Access</h4>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-heading uppercase tracking-wide flex items-center gap-1.5">
                  <IdCard className="w-3.5 h-3.5 text-primary" /> Parent Account ID *
                </label>
                <input 
                  type="text" 
                  value={form.parent.userId} 
                  onChange={(e) => handleNestedChange('parent', 'userId', e.target.value)} 
                  placeholder="PAR-2024-001" 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-heading font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-heading uppercase tracking-wide flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-primary" /> Portal Password *
                </label>
                <input 
                  type="text" 
                  value={form.parent.password} 
                  onChange={(e) => handleNestedChange('parent', 'password', e.target.value)} 
                  placeholder="Access password" 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                />
              </div>
            </div>
          </FormSectionCard>

          {/* Section 4: Emergency Secondary Contact */}
          <FormSectionCard 
            icon={Heart} 
            title="Emergency Contact (Optional)" 
            description="Alternate contact used if primary guardians are unreachable"
          >
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-heading uppercase tracking-wide">Contact Full Name</label>
                <input 
                  type="text" 
                  value={form.emergencyContact.fullName} 
                  onChange={(e) => handleNestedChange('emergencyContact', 'fullName', e.target.value)} 
                  placeholder="Name of emergency contact" 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-heading font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-heading uppercase tracking-wide">Relationship</label>
                <input 
                  type="text" 
                  value={form.emergencyContact.relationship} 
                  onChange={(e) => handleNestedChange('emergencyContact', 'relationship', e.target.value)} 
                  placeholder="e.g. Uncle, Aunt, Neighbor" 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-heading font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-heading uppercase tracking-wide">Emergency Phone Number</label>
                <input 
                  type="tel" 
                  value={form.emergencyContact.phone} 
                  onChange={(e) => handleNestedChange('emergencyContact', 'phone', e.target.value)} 
                  placeholder="Emergency phone number" 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-heading font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </FormSectionCard>
        </div>

        {/* Right Column: Facial Recognition Enrollment */}
        <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-8">
          <FacePreviewCard faceImage={faceImage} onFaceImageChange={setFaceImage} />
          
          <div className="space-y-4">
            <button
              onClick={handleSubmit}
              disabled={mutation.isPending || !form.fullName || !faceImage}
              className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl gradient-primary text-primary-foreground font-black text-sm uppercase tracking-widest shadow-[0_10px_30px_-10px_rgba(var(--primary-rgb),0.5)] hover:shadow-[0_15px_35px_-10px_rgba(var(--primary-rgb),0.6)] hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none disabled:translate-y-0"
            >
              {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {mutation.isPending ? "Processing Data..." : "Verify & Enroll Student"}
            </button>
            <div className="p-4 rounded-xl bg-muted/40 border border-border flex gap-3 text-[10px] text-text-secondary leading-relaxed">
               <Fingerprint className="w-6 h-6 shrink-0 text-primary opacity-60" />
               <p>
                 Student admission requires biometric validation to ensure the integrity of the school attendance and security ecosystem.
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
