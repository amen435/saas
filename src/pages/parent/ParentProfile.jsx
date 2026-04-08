import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { User, Mail, Phone, Lock, Camera, Bell, Globe, Sun, Moon, Monitor, Calendar, Users, School } from "lucide-react";
import { toast } from "sonner";
import api from "@/services/api";
import { profileService } from "@/services/profileService";

const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export default function ParentProfile() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState(null);
  const [profileSummary, setProfileSummary] = useState(null);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [notifications, setNotifications] = useState({
    grades: true, homework: true, messages: true, attendance: true, daily: false,
  });

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError("");
      try {
        const [childrenResponse, summaryResponse] = await Promise.all([
          api.get("/parents/me/children"),
          profileService.getMyProfile(),
        ]);
        console.log("profile response:", childrenResponse?.data ?? childrenResponse);
        const childData = childrenResponse?.data?.data || childrenResponse?.data || childrenResponse;
        const childList = Array.isArray(childData) ? childData : childData?.children || [];
        const summaryData = summaryResponse?.data || summaryResponse;

        setChildren(childList);
        setProfile({
          fullName: summaryData?.fullName || user?.fullName || user?.name || "Parent",
          userId: summaryData?.userId || user?.userId || user?.id || "-",
          email: summaryData?.email || user?.email || "-",
          phone: summaryData?.phone || user?.phone || "-",
          schoolName: summaryData?.school?.schoolName || user?.schoolName || "-",
        });
        setProfileSummary(summaryData);
      } catch (e) {
        setError(e.message || "Failed to load profile");
        setChildren([]);
        setProfile({
          fullName: user?.fullName || user?.name || "Parent",
          userId: user?.userId || user?.id || "-",
          email: user?.email || "-",
          phone: user?.phone || "-",
          schoolName: user?.schoolName || "-",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  console.log("profile state:", profile);

  const childNames = useMemo(
    () => children.map((child) => child?.fullName || child?.name || child?.studentName).filter(Boolean),
    [children]
  );

  const currentAvatar = avatarPreview || profileSummary?.profileImage || null;

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
      setProfileSummary((prev) => ({
        ...(prev || {}),
        profileImage: data?.profileImage || previewUrl,
      }));
      setAvatarPreview(data?.profileImage || previewUrl);
      window.dispatchEvent(new Event("profile-branding-updated"));
      toast.success("Profile photo updated!");
    } catch (error) {
      setAvatarPreview(profileSummary?.profileImage || null);
      toast.error(error.message || "Failed to upload profile photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-heading">My Profile</h1>
        <p className="text-sm text-text-secondary">Personal information and preferences</p>
      </div>

      <motion.div {...anim} className="bg-card rounded-xl border border-border p-6">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="relative">
            {currentAvatar ? (
              <img src={currentAvatar} alt="Avatar" className="w-20 h-20 rounded-2xl object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground text-3xl font-bold">
                {(profile?.fullName || "P").charAt(0)}
              </div>
            )}
            <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center border-2 border-card cursor-pointer">
              <Camera className="w-3.5 h-3.5 text-primary-foreground" />
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-bold text-heading">{profile?.fullName || "Parent"}</h2>
            <p className="text-xs text-text-secondary">Parent | {children.length} children linked</p>
            <p className="text-[10px] text-muted-foreground mt-1">ID: {profile?.userId || "-"}</p>
            {uploadingPhoto && <p className="text-[10px] text-primary mt-1">Uploading photo...</p>}
          </div>
        </div>
      </motion.div>

      {loading && <div className="text-sm text-muted-foreground">Loading profile...</div>}
      {!loading && error && <div className="text-sm text-destructive">{error}</div>}

      {profile && (
        <motion.div {...anim} transition={{ delay: 0.05 }} className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-heading mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" /> Personal Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: User, label: "Full Name", value: profile.fullName || "-" },
              { icon: User, label: "Parent ID", value: profile.userId || "-" },
              { icon: Mail, label: "Email", value: profile.email || "-" },
              { icon: Phone, label: "Phone", value: profile.phone || "-" },
              { icon: School, label: "School", value: profile.schoolName || "-" },
              { icon: Users, label: "Children", value: childNames.length ? childNames.join(", ") : "No linked children" },
              { icon: Calendar, label: "Children Count", value: String(children.length) },
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
      )}

      <motion.div {...anim} transition={{ delay: 0.08 }} className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold text-heading mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" /> My Children
        </h3>
        {children.length > 0 ? (
          <div className="space-y-3">
            {children.map((child, index) => (
              <div key={child?.id || child?.studentId || index} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium text-heading">{child?.fullName || child?.name || child?.studentName || "Student"}</p>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  {child?.className || child?.gradeLevel || "-"} | {child?.studentId || child?.userId || "-"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No linked children found.</p>
        )}
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
            { key: "grades", label: "Grade alerts", icon: Bell },
            { key: "homework", label: "Homework reminders", icon: Bell },
            { key: "messages", label: "Teacher messages", icon: Mail },
            { key: "attendance", label: "Attendance alerts", icon: Calendar },
            { key: "daily", label: "Daily summary", icon: Bell },
          ].map((n) => (
            <label key={n.key} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={notifications[n.key]} onChange={(e) => setNotifications({ ...notifications, [n.key]: e.target.checked })} className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30" />
              <n.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-heading">{n.label}</span>
            </label>
          ))}
        </div>
      </motion.div>

      <motion.div {...anim} transition={{ delay: 0.2 }} className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold text-heading mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-muted-foreground" /> Account Settings
        </h3>
        <p className="text-sm text-muted-foreground">Password management is available from the authenticated account settings flow.</p>
      </motion.div>
    </div>
  );
}
