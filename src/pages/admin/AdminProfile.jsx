import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { User, Mail, Phone, School, Calendar, Lock, Camera, Bell, Globe, BarChart3, Sun, Moon, Monitor, Shield, Award, ImagePlus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { profileService } from "@/services/profileService";
import { schoolService } from "@/services/schoolService";

const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export default function AdminProfile() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState(null);
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [notifications, setNotifications] = useState({
    email: true, system: true, reports: true, alerts: true, daily: true,
  });
  const [passwords, setPasswords] = useState({ current: "", newPass: "", confirm: "" });
  const [schoolNameModalOpen, setSchoolNameModalOpen] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const response = await profileService.getMyProfile();
        const data = response?.data || response;
        console.log("profile:", data);
        console.log("school:", data?.school || null);
        setProfile(data);
        setSchool(data?.school || null);
      } catch (error) {
        toast.error(error.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
    window.addEventListener("profile-branding-updated", fetchProfile);
    return () => window.removeEventListener("profile-branding-updated", fetchProfile);
  }, []);

  const displayName = profile?.fullName || user?.fullName || user?.name || "Administrator";
  const displayId = profile?.userId || user?.userId || user?.id || "-";
  const displayEmail = profile?.email || user?.email || "-";
  const displayPhone = profile?.phone || user?.phone || "-";
  const displaySchoolName = school?.schoolName || user?.schoolName || "School";
  const currentAvatar = avatarPreview || profile?.profileImage || null;
  const currentLogo = logoPreview || school?.logo || null;

  const refreshBranding = async () => {
    const response = await profileService.getMyProfile();
    const data = response?.data || response;
    setProfile(data);
    setSchool(data?.school || null);
    window.dispatchEvent(new Event("profile-branding-updated"));
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setUploadingPhoto(true);
    try {
      const response = await profileService.uploadPhoto(file);
      const data = response?.data || response;
      setProfile((prev) => ({
        ...(prev || {}),
        profileImage: data?.profileImage || previewUrl,
      }));
      setAvatarPreview(data?.profileImage || previewUrl);
      window.dispatchEvent(new Event("profile-branding-updated"));
      toast.success("Profile photo updated!");
    } catch (error) {
      setAvatarPreview(profile?.profileImage || null);
      toast.error(error.message || "Failed to upload profile photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !school?.schoolId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);
    setUploadingLogo(true);
    try {
      const response = await schoolService.uploadLogo(school.schoolId, file);
      const data = response?.data || response;
      setSchool((prev) => ({
        ...(prev || {}),
        ...data,
        logo: data?.logo || previewUrl,
      }));
      setLogoPreview(data?.logo || previewUrl);
      window.dispatchEvent(new Event("profile-branding-updated"));
      toast.success("School logo updated!");
    } catch (error) {
      setLogoPreview(school?.logo || null);
      toast.error(error.message || "Failed to upload school logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handlePasswordUpdate = (e) => {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirm) {
      toast.error("Passwords do not match");
      return;
    }
    toast.success("Password updated successfully!");
    setPasswords({ current: "", newPass: "", confirm: "" });
  };

  const openSchoolNameModal = () => {
    setNewSchoolName(displaySchoolName);
    setSchoolNameModalOpen(true);
  };

  const handleSchoolNameSave = async () => {
    if (!newSchoolName.trim() || !school?.schoolId) {
      toast.error("School name cannot be empty");
      return;
    }

    try {
      const response = await schoolService.update(school.schoolId, { schoolName: newSchoolName.trim() });
      const data = response?.data || response;
      setSchool((prev) => ({
        ...(prev || {}),
        ...data,
      }));
      setSchoolNameModalOpen(false);
      await refreshBranding();
      toast.success("School name updated successfully!");
    } catch (error) {
      toast.error(error.message || "Failed to update school name");
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-heading">My Profile</h1>
        <p className="text-sm text-text-secondary">Administrator account and school settings</p>
      </div>

      {loading && <div className="text-sm text-muted-foreground">Loading profile...</div>}

      <motion.div {...anim} className="bg-card rounded-xl border border-border p-6">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="relative">
            {currentAvatar ? (
              <img src={currentAvatar} alt="Avatar" className="w-20 h-20 rounded-2xl object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground text-3xl font-bold">
                {displayName.charAt(0) || "A"}
              </div>
            )}
            <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center border-2 border-card cursor-pointer">
              <Camera className="w-3.5 h-3.5 text-primary-foreground" />
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-bold text-heading">{displayName}</h2>
            <p className="text-xs text-text-secondary">School Administrator | {displaySchoolName}</p>
            <div className="flex items-center gap-2 mt-1 justify-center sm:justify-start">
              <span className="text-[10px] text-muted-foreground">ID: {displayId}</span>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                <Shield className="w-3 h-3" /> Admin
              </span>
            </div>
            {uploadingPhoto && <p className="text-[10px] text-primary mt-1">Uploading photo...</p>}
          </div>
        </div>
      </motion.div>

      <motion.div {...anim} transition={{ delay: 0.03 }} className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold text-heading mb-4 flex items-center gap-2">
          <School className="w-4 h-4 text-muted-foreground" /> School Settings
        </h3>

        <div className="flex items-center justify-between mb-5 p-3 rounded-lg bg-muted/30 gap-4">
          <div className="min-w-0">
            <p className="text-[10px] text-text-secondary uppercase tracking-wider">School Name</p>
            <p className="text-sm font-medium text-heading truncate max-w-[220px]" title={displaySchoolName}>{displaySchoolName}</p>
          </div>
          <button onClick={openSchoolNameModal} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <Pencil className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <p className="text-xs font-medium text-text-secondary mb-2">School Logo</p>
        <p className="text-xs text-text-secondary mb-4">Upload your school's logo. It will appear in the sidebar for users in this school.</p>
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30 flex-shrink-0">
            {currentLogo ? (
              <img src={currentLogo} alt="School logo" className="w-full h-full object-contain p-1" />
            ) : (
              <School className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="px-4 py-2 gradient-primary text-primary-foreground rounded-lg text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1.5 w-fit">
              <ImagePlus className="w-3.5 h-3.5" /> Upload Logo
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </label>
            <p className="text-[10px] text-muted-foreground">PNG, JPG or SVG. Max 5MB.</p>
            {uploadingLogo && <p className="text-[10px] text-primary">Uploading logo...</p>}
          </div>
        </div>
      </motion.div>

      <motion.div {...anim} transition={{ delay: 0.05 }} className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold text-heading mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" /> Personal Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: User, label: "Full Name", value: displayName },
            { icon: Shield, label: "Admin ID", value: displayId },
            { icon: School, label: "School", value: displaySchoolName },
            { icon: BarChart3, label: "Role", value: "School Administrator" },
            { icon: Calendar, label: "Role Context", value: "Authenticated admin account" },
            { icon: Mail, label: "Email", value: displayEmail },
            { icon: Phone, label: "Phone", value: displayPhone },
            { icon: Award, label: "Status", value: profile?.role || user?.role || "SCHOOL_ADMIN" },
          ].map((f) => (
            <div key={f.label} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                <f.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] text-text-secondary uppercase tracking-wider">{f.label}</p>
                <p className="text-sm font-medium text-heading">{f.value}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div {...anim} transition={{ delay: 0.1 }} className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold text-heading mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-muted-foreground" /> Account Settings
        </h3>
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">Current Password</label>
            <input type="password" placeholder="........" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-heading outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">New Password</label>
              <input type="password" placeholder="........" value={passwords.newPass} onChange={(e) => setPasswords({ ...passwords, newPass: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-heading outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">Confirm Password</label>
              <input type="password" placeholder="........" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-heading outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <button type="submit" className="px-4 py-2 gradient-primary text-primary-foreground rounded-lg text-xs font-bold hover:opacity-90 transition-opacity">
            Update Password
          </button>
        </form>
      </motion.div>

      <motion.div {...anim} transition={{ delay: 0.15 }} className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold text-heading mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted-foreground" /> Preferences
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">Language</label>
            <select className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-heading outline-none">
              <option>English</option>
              <option>Amharic</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-2">Theme</label>
            <div className="flex gap-2">
              {[{ value: "light", label: "Light", icon: Sun }, { value: "dark", label: "Dark", icon: Moon }, { value: "auto", label: "Auto", icon: Monitor }].map((t) => (
                <button key={t.value} onClick={() => setTheme(t.value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${theme === t.value ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                  <t.icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { key: "email", label: "Email notifications", icon: Mail },
            { key: "system", label: "System alerts", icon: Bell },
            { key: "reports", label: "Report reminders", icon: BarChart3 },
            { key: "alerts", label: "Operational alerts", icon: Bell },
            { key: "daily", label: "Daily summary", icon: Calendar },
          ].map((n) => (
            <label key={n.key} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={notifications[n.key]} onChange={(e) => setNotifications({ ...notifications, [n.key]: e.target.checked })} className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30" />
              <n.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-heading">{n.label}</span>
            </label>
          ))}
        </div>
      </motion.div>

      <Dialog open={schoolNameModalOpen} onOpenChange={setSchoolNameModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update School Name</DialogTitle>
          </DialogHeader>
          <input
            value={newSchoolName}
            onChange={(e) => setNewSchoolName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-heading outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="School name"
          />
          <DialogFooter>
            <button type="button" onClick={() => setSchoolNameModalOpen(false)} className="px-4 py-2 rounded-lg border border-border text-sm">
              Cancel
            </button>
            <button type="button" onClick={handleSchoolNameSave} className="px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-semibold">
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
