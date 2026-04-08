import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, BookOpen, CalendarCheck, Bot, BarChart3, MessageSquare, School, Settings, LogOut } from "lucide-react";

const navByRole = {
  student: [
    { label: "Home", path: "/student", icon: LayoutDashboard },
    { label: "Homework", path: "/student/homework", icon: BookOpen },
    { label: "AI", path: "/student/ai-chat", icon: Bot },
    { label: "Grades", path: "/student/attendance", icon: BarChart3 },
  ],
  parent: [
    { label: "Home", path: "/parent", icon: LayoutDashboard },
    { label: "Attend", path: "/parent/attendance", icon: CalendarCheck },
    { label: "Grades", path: "/parent/grades", icon: BarChart3 },
    { label: "Msgs", path: "/parent/messages", icon: MessageSquare },
  ],
  teacher: [
    { label: "Home", path: "/teacher", icon: LayoutDashboard },
    { label: "Attendance", path: "/teacher/attendance", icon: CalendarCheck },
    { label: "Homework", path: "/teacher/homework", icon: BookOpen },
    { label: "Grades", path: "/teacher/grades", icon: BarChart3 },
  ],
  homeroom: [
    { label: "Home", path: "/homeroom", icon: LayoutDashboard },
    { label: "Attend", path: "/homeroom/attendance", icon: CalendarCheck },
    { label: "Grades", path: "/homeroom/grades", icon: BarChart3 },
    { label: "Msgs", path: "/homeroom/messages", icon: MessageSquare },
  ],
  admin: [
    { label: "Home", path: "/admin", icon: LayoutDashboard },
    { label: "Students", path: "/admin/students", icon: BarChart3 },
    { label: "Attend", path: "/admin/attendance", icon: CalendarCheck },
    { label: "Homeroom", path: "/admin/homeroom", icon: School },
  ],
  superadmin: [
    { label: "Home", path: "/superadmin", icon: LayoutDashboard },
    { label: "Schools", path: "/superadmin/schools", icon: School },
    { label: "SMS", path: "/superadmin/sms", icon: MessageSquare },
    { label: "Settings", path: "/superadmin/settings", icon: Settings },
  ],
};

export default function MobileBottomNav() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;
  const normalizedRole = (user.role || "").toString().toUpperCase();
  const roleKey =
    normalizedRole === "SUPER_ADMIN" ? "superadmin" :
    normalizedRole === "SCHOOL_ADMIN" ? "admin" :
    normalizedRole === "HOMEROOM_TEACHER" ? "homeroom" :
    normalizedRole === "TEACHER" ? "teacher" :
    normalizedRole === "STUDENT" ? "student" :
    normalizedRole === "PARENT" ? "parent" : "";
  const items = navByRole[roleKey] || [];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
      <div className="flex items-center justify-around h-16 px-1">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[44px] rounded-lg transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[44px] rounded-lg transition-colors text-destructive"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-medium">Logout</span>
        </button>
      </div>
    </nav>
  );
}
