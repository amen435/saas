import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { User, Mail, Phone, School, Calendar, Lock, Camera, Bell, Globe, Sun, Moon, Monitor, Users } from "lucide-react";
import { toast } from "sonner";
import api from "@/services/api";
import { profileService } from "@/services/profileService";

const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export default function HomeroomProfile() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState(null);
  const [profileSummary, setProfileSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [notifications, setNotifications] = useState({
    email: true, behavior: true, grades: true, parents: true, daily: false,
  });

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError("");
      try {
        const [detailResponse, summaryResponse] = await Promise.all([
          api.get("/teacher/profile"),
          profileService.getMyProfile(),
        ]);
        console.log("profile response:", detailResponse?.data ?? detailResponse);
        const detailData = detailResponse?.data?.data || detailResponse?.data || detailResponse;
        const summaryData = summaryResponse?.data || summaryResponse;
        setProfile(detailData);
        setProfileSummary(summaryData);
      } catch (e) {
        setError(e.message || "Failed to load profile");
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  console.log("profile state:", profile);

  const displayName = profile?.user?.fullName || profileSummary?.fullName || user?.fullName || user?.name || "Homeroom Teacher";
  const displayId = profile?.teacherId || profile?.user?.userId || profileSummary?.userId || user?.userId || "-";
  const displayEmail = profile?.user?.email || profileSummary?.email || user?.email || "-";
  const displayPhone = profile?.user?.phone || profileSummary?.phone || user?.phone || "-";
  const schoolName = profile?.school?.schoolName || profileSummary?.school?.schoolName || user?.schoolName || "-";
  const homeroomCount = profile?._count?.homeroomClasses ?? 0;
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
                {displayName.charAt(0) || "H"}
              </div>
            )}
            <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center border-2 border-card cursor-pointer">
              <Camera className="w-3.5 h-3.5 text-primary-foreground" />
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-bold text-heading">{displayName}</h2>
            <p className="text-xs text-text-secondary">Homeroom Teacher | {schoolName}</p>
            <p className="text-[10px] text-muted-foreground mt-1">ID: {displayId}</p>
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
              { icon: User, label: "Full Name", value: displayName },
              { icon: School, label: "Teacher ID", value: displayId },
              { icon: School, label: "School", value: schoolName },
              { icon: Users, label: "Homeroom Classes", value: String(homeroomCount) },
              { icon: Mail, label: "Email", value: displayEmail },
              { icon: Phone, label: "Phone", value: displayPhone },
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
            { key: "behavior", label: "Behavior incident alerts", icon: Bell },
            { key: "grades", label: "Class grade summaries", icon: User },
            { key: "parents", label: "Parent message alerts", icon: Users },
            { key: "daily", label: "Daily class report", icon: Calendar },
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
