import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { User, Mail, Phone, School, Calendar, Lock, Camera, Bell, Globe, BarChart3, Star, Sun, Moon, Monitor, Shield, Award, Zap, Pencil, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

const achievements = [
  { icon: "🌍", title: "50 Schools", desc: "Onboarded 50 schools to the platform", earned: true },
  { icon: "🚀", title: "Platform Launch", desc: "Launched national e-school platform", earned: true },
  { icon: "🔒", title: "Zero Breach", desc: "No security incident for 2 years", earned: true },
  { icon: "📊", title: "1M Records", desc: "Managed 1M+ student records", earned: false },
  { icon: "⚡", title: "99.9% Uptime", desc: "Maintained 99.9% platform uptime", earned: true },
  { icon: "🏅", title: "Gov. Certified", desc: "MoE certified platform operator", earned: true },
];

export default function SuperAdminProfile() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const displayName = user?.fullName || user?.name || "Super Admin";
  const displayId = user?.userId || user?.id || "-";
  const displayEmail = user?.email || "-";
  const displayPhone = user?.phone || "-";
  const [notifications, setNotifications] = useState({
    email: true, security: true, platform: true, schools: true, daily: true,
  });
  const [avatarPreview, setAvatarPreview] = useState(() => localStorage.getItem("superadmin_profile_photo"));
  const [passwords, setPasswords] = useState({ current: "", newPass: "", confirm: "" });
  const [displayNameModal, setDisplayNameModal] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [platformLogo, setPlatformLogo] = useState(() => localStorage.getItem("superadmin_platform_logo"));
  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
        localStorage.setItem("superadmin_profile_photo", reader.result);
        toast.success("Profile photo updated!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePasswordUpdate = (e) => {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirm) { toast.error("Passwords do not match"); return; }
    toast.success("Password updated successfully!");
    setPasswords({ current: "", newPass: "", confirm: "" });
  };

  const openDisplayNameModal = () => {
    setNewDisplayName(localStorage.getItem("superadmin_display_name") || "E-SCHOOL");
    setDisplayNameModal(true);
  };

  const handleDisplayNameSave = () => {
    if (!newDisplayName.trim()) { toast.error("Display name cannot be empty"); return; }
    localStorage.setItem("superadmin_display_name", newDisplayName.trim());
    toast.success("Display name updated!");
    setDisplayNameModal(false);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      setPlatformLogo(reader.result);
      localStorage.setItem("superadmin_platform_logo", reader.result);
      toast.success("Platform logo updated!");
    };
    reader.readAsDataURL(file);
  };

  const handleLogoRemove = () => {
    localStorage.removeItem("superadmin_platform_logo");
    setPlatformLogo(null);
    toast.success("Platform logo removed.");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-heading">My Profile</h1>
        <p className="text-sm text-text-secondary">Super administrator account and platform settings</p>
      </div>

      {/* Profile Card */}
      <motion.div {...anim} className="bg-card rounded-xl border border-border p-6">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="relative">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-20 h-20 rounded-2xl object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground text-3xl font-bold">
                {displayName.charAt(0) || "S"}
              </div>
            )}
            <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center border-2 border-card cursor-pointer">
              <Camera className="w-3.5 h-3.5 text-primary-foreground" />
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-bold text-heading">{displayName}</h2>
            <p className="text-xs text-text-secondary">Super Administrator · National Platform</p>
            <div className="flex items-center gap-2 mt-1 justify-center sm:justify-start">
              <span className="text-[10px] text-muted-foreground">ID: {displayId}</span>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                <Zap className="w-3 h-3" /> Super Admin
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Platform Settings */}
      <motion.div {...anim} transition={{ delay: 0.04 }} className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold text-heading mb-4 flex items-center gap-2">
          <School className="w-4 h-4 text-muted-foreground" /> Platform Settings
        </h3>

        {/* Display Name */}
        <div className="flex items-center justify-between mb-5 p-3 rounded-lg bg-muted/30">
          <div>
            <p className="text-[10px] text-text-secondary uppercase tracking-wider">Dashboard Display Name</p>
            <p className="text-sm font-medium text-heading">{localStorage.getItem("superadmin_display_name") || "E-SCHOOL"}</p>
          </div>
          <button onClick={openDisplayNameModal} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <Pencil className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Platform Logo */}
        <p className="text-xs font-medium text-text-secondary mb-2">Platform Logo</p>
        <p className="text-xs text-text-secondary mb-4">Upload your platform logo. It will replace the default icon in the sidebar.</p>
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30 flex-shrink-0">
            {platformLogo ? (
              <img src={platformLogo} alt="Platform logo" className="w-full h-full object-contain p-1" />
            ) : (
              <School className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="px-4 py-2 gradient-primary text-primary-foreground rounded-lg text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1.5 w-fit">
              <ImagePlus className="w-3.5 h-3.5" /> Upload Logo
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </label>
            {platformLogo && (
              <button onClick={handleLogoRemove} className="text-xs text-destructive hover:underline w-fit">Remove logo</button>
            )}
            <p className="text-[10px] text-muted-foreground">PNG, JPG or SVG. Max 5MB.</p>
          </div>
        </div>
      </motion.div>

      {/* Personal Info */}
      <motion.div {...anim} transition={{ delay: 0.05 }} className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold text-heading mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" /> Personal Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: User, label: "Full Name", value: displayName },
            { icon: Shield, label: "Super Admin ID", value: displayId },
            { icon: School, label: "Organization", value: "Ministry of Education, Ethiopia" },
            { icon: Zap, label: "Access Level", value: "Full Platform Access" },
            { icon: Calendar, label: "Role Context", value: "Authenticated super admin account" },
            { icon: Mail, label: "Email", value: displayEmail },
            { icon: Phone, label: "Phone", value: displayPhone },
            { icon: BarChart3, label: "Role", value: user?.role || "SUPER_ADMIN" },
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

      {/* Account Settings */}
      <motion.div {...anim} transition={{ delay: 0.1 }} className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold text-heading mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-muted-foreground" /> Account Settings
        </h3>
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">Current Password</label>
            <input type="password" placeholder="••••••••" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-heading outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">New Password</label>
              <input type="password" placeholder="••••••••" value={passwords.newPass} onChange={(e) => setPasswords({ ...passwords, newPass: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-heading outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">Confirm Password</label>
              <input type="password" placeholder="••••••••" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-heading outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <button type="submit" className="px-4 py-2 gradient-primary text-primary-foreground rounded-lg text-xs font-bold hover:opacity-90 transition-opacity">
            Update Password
          </button>
        </form>
      </motion.div>

      {/* Preferences */}
      <motion.div {...anim} transition={{ delay: 0.15 }} className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold text-heading mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted-foreground" /> Preferences
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">Language</label>
            <select className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-heading outline-none">
              <option>English</option>
              <option>አማርኛ (Amharic)</option>
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
        <p className="text-xs font-medium text-text-secondary mb-3">Notifications</p>
        <div className="space-y-3">
          {[
            { key: "email", label: "Email notifications", icon: Mail },
            { key: "security", label: "Security & breach alerts", icon: Shield },
            { key: "platform", label: "Platform health updates", icon: Zap },
            { key: "schools", label: "New school onboarding", icon: School },
            { key: "daily", label: "Daily platform digest", icon: BarChart3 },
          ].map((n) => (
            <label key={n.key} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={notifications[n.key]} onChange={(e) => setNotifications({ ...notifications, [n.key]: e.target.checked })} className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30" />
              <n.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-heading">{n.label}</span>
            </label>
          ))}
        </div>
      </motion.div>

      {/* Achievements */}
      <motion.div {...anim} transition={{ delay: 0.2 }} className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold text-heading mb-4 flex items-center gap-2">
          <Award className="w-4 h-4 text-warning" /> Platform Milestones
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {achievements.map((a) => (
            <div key={a.title} className={`rounded-xl border p-4 text-center transition-all ${a.earned ? "border-warning/30 bg-warning/5" : "border-border bg-muted/30 opacity-50"}`}>
              <span className="text-2xl">{a.icon}</span>
              <p className="text-xs font-bold text-heading mt-2">{a.title}</p>
              <p className="text-[10px] text-text-secondary mt-0.5">{a.desc}</p>
              {a.earned && <span className="text-[9px] font-bold text-success mt-1 inline-block">ACHIEVED ✓</span>}
            </div>
          ))}
        </div>
      </motion.div>
      {/* Display Name Modal */}
      <Dialog open={displayNameModal} onOpenChange={setDisplayNameModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Display Name</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label>Display Name</Label>
            <Input value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} placeholder="E-SCHOOL" className="mt-1" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisplayNameModal(false)}>Cancel</Button>
            <Button onClick={handleDisplayNameSave} className="gradient-primary text-primary-foreground">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
