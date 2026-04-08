import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { profileService } from "@/services/profileService";
import {
  LayoutDashboard, BookOpen, GraduationCap, Bot, CalendarCheck, Calendar,
  User, LogOut, ChevronLeft, MessageSquare, Users, School, Settings,
  Shield, FileText, Bell, BarChart3, CreditCard, Globe,
  UserCheck, DollarSign, X, AlertTriangle, Home
} from "lucide-react";

const navByRole = {
  student: [
    { label: "Dashboard", path: "/student", icon: LayoutDashboard },
    { label: "Homework", path: "/student/homework", icon: BookOpen },
    { label: "Grades", path: "/student/grades", icon: BarChart3 },
    { label: "Learning Portal", path: "/student/learning", icon: GraduationCap },
    { label: "AI Tutor", path: "/student/ai-chat", icon: Bot },
    { label: "Attendance", path: "/student/attendance", icon: CalendarCheck },
    { label: "Timetable", path: "/student/timetable", icon: Calendar },
    { label: "Profile", path: "/student/profile", icon: User },
  ],
  parent: [
    { label: "Dashboard", path: "/parent", icon: LayoutDashboard },
    { label: "Attendance", path: "/parent/attendance", icon: CalendarCheck },
    { label: "Grades", path: "/parent/grades", icon: BarChart3 },
    { label: "Homework", path: "/parent/homework", icon: BookOpen },
    { label: "Timetable", path: "/parent/timetable", icon: Calendar },
    { label: "Messages", path: "/parent/messages", icon: MessageSquare },
    { label: "Profile", path: "/parent/profile", icon: User },
  ],
  teacher: [
    { label: "Dashboard", path: "/teacher", icon: LayoutDashboard },
    { label: "My Classes", path: "/teacher/classes", icon: Users },
    { label: "Attendance", path: "/teacher/attendance", icon: CalendarCheck },
    { label: "My Attendance", path: "/teacher/my-attendance", icon: UserCheck },
    { label: "Grades", path: "/teacher/grades", icon: BarChart3 },
    { label: "Homework", path: "/teacher/homework", icon: BookOpen },
    { label: "Reports", path: "/teacher/reports", icon: FileText },
    { label: "Messages", path: "/teacher/messages", icon: MessageSquare },
    { label: "Timetable", path: "/teacher/timetable", icon: Calendar },
    { label: "Profile", path: "/teacher/profile", icon: User },
  ],
  homeroom: [
    { label: "Dashboard", path: "/homeroom", icon: LayoutDashboard },
    { label: "Add Student", path: "/homeroom/add-student", icon: Users },
    { label: "Attendance", path: "/homeroom/attendance", icon: CalendarCheck },
    { label: "Behavior", path: "/homeroom/behavior", icon: AlertTriangle },
    { label: "Grades", path: "/homeroom/grades", icon: BarChart3 },
    { label: "Messages", path: "/homeroom/messages", icon: MessageSquare },
    { label: "Profile", path: "/homeroom/profile", icon: User },
  ],
  admin: [
    { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { label: "Teachers", path: "/admin/teachers", icon: GraduationCap },
    { label: "Students", path: "/admin/students", icon: Users },
    { label: "Classes & Sections", path: "/admin/classes", icon: School },
    { label: "Subjects", path: "/admin/subjects", icon: BookOpen },
    { label: "Homeroom", path: "/admin/homeroom", icon: Home },
    { label: "Attendance", path: "/admin/attendance", icon: CalendarCheck },
    { label: "Grades", path: "/admin/grades", icon: BarChart3 },
    { label: "Messages", path: "/admin/messages", icon: MessageSquare },
    { label: "Timetable", path: "/admin/timetable", icon: Calendar },
    { label: "School Fees", path: "/admin/fees", icon: DollarSign },
    { label: "Profile", path: "/admin/profile", icon: User },
  ],
  superadmin: [
    { label: "Dashboard", path: "/superadmin", icon: LayoutDashboard },
    { label: "Schools", path: "/superadmin/schools", icon: School },
    { label: "Subscriptions", path: "/superadmin/plans", icon: CreditCard },
    { label: "Roles & Permissions", path: "/superadmin/roles", icon: Shield },
    { label: "Analytics", path: "/superadmin/analytics", icon: BarChart3 },
    { label: "Announcements", path: "/superadmin/announcements", icon: Bell },
    { label: "Settings", path: "/superadmin/settings", icon: Settings },
    { label: "Logs", path: "/superadmin/logs", icon: Globe },
    { label: "Profile", path: "/superadmin/profile", icon: User },
  ],
};

export default function AppSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const { user, logout, loading, activeRole } = useAuth();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [platformLogo, setPlatformLogo] = useState(() => localStorage.getItem("superadmin_platform_logo"));
  const [displayName, setDisplayName] = useState(() => localStorage.getItem("superadmin_display_name"));

  const normalizedRole = (activeRole || user?.role || "").toString().toUpperCase();
  const roleKey =
    normalizedRole === "SUPER_ADMIN" ? "superadmin" :
    normalizedRole === "SCHOOL_ADMIN" ? "admin" :
    normalizedRole === "HOMEROOM_TEACHER" ? "homeroom" :
    normalizedRole === "TEACHER" ? "teacher" :
    normalizedRole === "STUDENT" ? "student" :
    normalizedRole === "PARENT" ? "parent" : "";
  const items = navByRole[roleKey] || [];
  const isSuperAdmin = roleKey === "superadmin";

  useEffect(() => {
    if (!user || isSuperAdmin) {
      setProfile(null);
      return undefined;
    }

    let mounted = true;

    const fetchProfile = async () => {
      try {
        const response = await profileService.getMyProfile();
        const data = response?.data || response;
        if (!mounted) return;
        setProfile(data);
      } catch (error) {
        if (mounted) {
          setProfile(null);
        }
      }
    };

    fetchProfile();
    window.addEventListener("profile-branding-updated", fetchProfile);

    return () => {
      mounted = false;
      window.removeEventListener("profile-branding-updated", fetchProfile);
    };
  }, [user, isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) return undefined;

    const syncPlatformBranding = () => {
      setPlatformLogo(localStorage.getItem("superadmin_platform_logo"));
      setDisplayName(localStorage.getItem("superadmin_display_name"));
    };

    syncPlatformBranding();
    window.addEventListener("storage", syncPlatformBranding);
    window.addEventListener("profile-branding-updated", syncPlatformBranding);

    return () => {
      window.removeEventListener("storage", syncPlatformBranding);
      window.removeEventListener("profile-branding-updated", syncPlatformBranding);
    };
  }, [isSuperAdmin]);

  if (loading || !user) {
    return null;
  }

  const schoolLogo = profile?.school?.logo || null;
  const schoolName = profile?.school?.schoolName || user?.schoolName || "E-SCHOOL";
  const showSchoolLogo = !isSuperAdmin && schoolLogo;
  const showPlatformLogo = isSuperAdmin && platformLogo;
  const displayUserName = profile?.fullName || user?.fullName || user?.username || "User";
  const displayUserImage = profile?.profileImage || null;
  const sidebarTitle = isSuperAdmin ? (displayName || "E-SCHOOL") : schoolName;

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground flex flex-col z-50 transition-all duration-300
        ${collapsed ? "w-[68px]" : "w-[220px]"}
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0
      `}
    >
      <div className="flex items-center justify-between px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 bg-sidebar-accent">
            {showSchoolLogo ? (
              <img src={schoolLogo} alt="School logo" className="w-full h-full object-contain" />
            ) : showPlatformLogo ? (
              <img src={platformLogo} alt="Platform logo" className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full gradient-primary flex items-center justify-center">
                <School className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
          </div>
          {!collapsed && (
            <span
              className="font-bold text-sm tracking-wider truncate max-w-[160px]"
              title={sidebarTitle}
            >
              {sidebarTitle}
            </span>
          )}
        </div>
        <button
          onClick={onMobileClose}
          className="md:hidden text-sidebar-foreground/70 hover:text-sidebar-foreground min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onMobileClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all relative group min-h-[44px] ${
                isActive
                  ? "gradient-primary text-primary-foreground"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {isActive && !collapsed && <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5">
          {displayUserImage ? (
            <img
              src={displayUserImage}
              alt={displayUserName}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
              {displayUserName.charAt(0).toUpperCase()}
            </div>
          )}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" title={displayUserName}>
                {displayUserName}
              </p>
              <p className="text-[10px] text-success flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                {normalizedRole}
              </p>
            </div>
          )}
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-destructive text-xs font-medium mt-3 hover:opacity-80 transition-opacity w-full min-h-[44px]"
        >
          <LogOut className="w-3.5 h-3.5" />
          {!collapsed && "END SESSION"}
        </button>
      </div>

      <button
        onClick={onToggle}
        className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-sidebar border border-sidebar-border rounded-full items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
      >
        <ChevronLeft className={`w-3 h-3 transition-transform ${collapsed ? "rotate-180" : ""}`} />
      </button>
    </aside>
  );
}
