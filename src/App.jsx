// frontend/src/App.jsx

import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Toaster } from "react-hot-toast";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import Login from "./pages/Login";
import RoleSelection from "./pages/RoleSelection";
import DashboardLayout from "./components/layout/DashboardLayout";

// Student Pages
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentHomework from "./pages/student/StudentHomework";
import StudentLearning from "./pages/student/StudentLearning";
import StudentAIChat from "./pages/student/StudentAIChat";
import StudentAttendance from "./pages/student/StudentAttendance";
import StudentTimetable from "./pages/student/StudentTimetable";
import StudentGrades from "./pages/student/StudentGrades";
import StudentProfile from "./pages/student/StudentProfile";

// Parent Pages
import ParentDashboard from "./pages/parent/ParentDashboard";
import ParentAttendance from "./pages/parent/ParentAttendance";
import ParentGrades from "./pages/parent/ParentGrades";
import ParentHomework from "./pages/parent/ParentHomework";
import ParentTimetable from "./pages/parent/ParentTimetable";
import ParentMessages from "./pages/parent/ParentMessages";
import ParentProfile from "./pages/parent/ParentProfile";

// Teacher Pages
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherAttendance from "./pages/teacher/TeacherAttendance";
import TeacherGrades from "./pages/teacher/TeacherGrades";
import TeacherHomework from "./pages/teacher/TeacherHomework";
import TeacherReports from "./pages/teacher/TeacherReports";
import TeacherMessages from "./pages/teacher/TeacherMessages";
import TeacherMyAttendance from "./pages/teacher/TeacherMyAttendance";
import TeacherProfile from "./pages/teacher/TeacherProfile";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminTimetable from "./pages/admin/AdminTimetable";
import AdminAttendance from "./pages/admin/AdminAttendance";
import AdminGrades from "./pages/admin/AdminGrades";
import AdminTeachers from "./pages/admin/AdminTeachers";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminHomeroom from "./pages/admin/AdminHomeroom";
import AdminSubjects from "./pages/admin/AdminSubjects";
import AdminClasses from "./pages/admin/AdminClasses";
import AdminMessages from "./pages/admin/AdminMessages";
import AdminProfile from "./pages/admin/AdminProfile";

// Homeroom Pages
import HomeroomDashboard from "./pages/homeroom/HomeroomDashboard";
import HomeroomAddStudent from "./pages/homeroom/HomeroomAddStudent";
import HomeroomAttendance from "./pages/homeroom/HomeroomAttendance";
import HomeroomBehavior from "./pages/homeroom/HomeroomBehavior";
import HomeroomGrades from "./pages/homeroom/HomeroomGrades";
import HomeroomMessages from "./pages/homeroom/HomeroomMessages";
import HomeroomProfile from "./pages/homeroom/HomeroomProfile";

// Super Admin Pages
import SuperAdminDashboard from "./pages/superadmin/SuperAdminDashboard";
import SchoolsManagement from "./pages/superadmin/SchoolsManagement";
import SubscriptionPlans from "./pages/superadmin/SubscriptionPlans";
import RolesPermissions from "./pages/superadmin/RolesPermissions";
import PlatformAnalytics from "./pages/superadmin/PlatformAnalytics";
import GlobalAnnouncements from "./pages/superadmin/GlobalAnnouncements";
import SystemSettings from "./pages/superadmin/SystemSettings";
import LogsMonitoring from "./pages/superadmin/LogsMonitoring";
import SuperAdminProfile from "./pages/superadmin/SuperAdminProfile";

const queryClient = new QueryClient();

// ============================================
// NOT FOUND PAGE
// ============================================
function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-8">Page not found</p>
        <a
          href="/login"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Go to Login
        </a>
      </div>
    </div>
  );
}

// ============================================
// UNAUTHORIZED PAGE
// ============================================
function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-600 mb-4">403</h1>
        <p className="text-xl text-gray-600 mb-8">Access Denied</p>
        <p className="text-gray-500 mb-8">
          You don't have permission to access this page
        </p>
        <a
          href="/login"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Go to Login
        </a>
      </div>
    </div>
  );
}

// ============================================
// APP ROUTES
// ============================================
function AppRoutes() {
  const { user, isAuthenticated, loading, activeRole } = useAuth();
  const role = String(activeRole || user?.role || '').toUpperCase();
  const roleHome =
    role === 'SUPER_ADMIN' ? '/superadmin' :
    role === 'SCHOOL_ADMIN' ? '/admin' :
    role === 'HOMEROOM_TEACHER' ? '/homeroom' :
    role === 'TEACHER' ? '/teacher' :
    role === 'STUDENT' ? '/student' :
    role === 'PARENT' ? '/parent' : '/select-role';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate
              to={
                role ? `/${role.toLowerCase()}` : '/select-role'
              }
              replace
            />
          ) : (
            <Login />
          )
        }
      />
      <Route
        path="/select-role"
        element={
          isAuthenticated ? <RoleSelection /> : <Navigate to="/login" replace />
        }
      />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Root Redirect */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate 
              to={roleHome} 
              replace 
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Student Routes */}
      <Route
        path="/student"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentDashboard />} />
        <Route path="homework" element={<StudentHomework />} />
        <Route path="learning" element={<StudentLearning />} />
        <Route path="ai-chat" element={<StudentAIChat />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="timetable" element={<StudentTimetable />} />
        <Route path="grades" element={<StudentGrades />} />
        <Route path="profile" element={<StudentProfile />} />
      </Route>

      {/* Parent Routes */}
      <Route
        path="/parent"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ParentDashboard />} />
        <Route path="attendance" element={<ParentAttendance />} />
        <Route path="grades" element={<ParentGrades />} />
        <Route path="homework" element={<ParentHomework />} />
        <Route path="timetable" element={<ParentTimetable />} />
        <Route path="messages" element={<ParentMessages />} />
        <Route path="profile" element={<ParentProfile />} />
      </Route>

      {/* Teacher Routes */}
      <Route
        path="/teacher"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<TeacherDashboard />} />
        <Route path="classes" element={<TeacherDashboard />} />
        <Route path="attendance" element={<TeacherAttendance />} />
        <Route path="grades" element={<TeacherGrades />} />
        <Route path="homework" element={<TeacherHomework />} />
        <Route path="my-attendance" element={<TeacherMyAttendance />} />
        <Route path="reports" element={<TeacherReports />} />
        <Route path="messages" element={<TeacherMessages />} />
        <Route path="timetable" element={<StudentTimetable />} />
        <Route path="profile" element={<TeacherProfile />} />
      </Route>

      {/* Homeroom Teacher Routes */}
      <Route
        path="/homeroom"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomeroomDashboard />} />
        <Route path="add-student" element={<HomeroomAddStudent />} />
        <Route path="attendance" element={<HomeroomAttendance />} />
        <Route path="behavior" element={<HomeroomBehavior />} />
        <Route path="grades" element={<HomeroomGrades />} />
        <Route path="messages" element={<HomeroomMessages />} />
        <Route path="profile" element={<HomeroomProfile />} />
      </Route>

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="teachers" element={<AdminTeachers />} />
        <Route path="classes" element={<AdminClasses />} />
        <Route path="homeroom" element={<AdminHomeroom />} />
        <Route path="timetable" element={<AdminTimetable />} />
        <Route path="attendance" element={<AdminAttendance />} />
        <Route path="grades" element={<AdminGrades />} />
        <Route path="subjects" element={<AdminSubjects />} />
        <Route path="messages" element={<AdminMessages />} />
        <Route path="fees" element={<AdminDashboard />} />
        <Route path="profile" element={<AdminProfile />} />
      </Route>

      {/* Super Admin Routes */}
      <Route
        path="/superadmin"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<SuperAdminDashboard />} />
        <Route path="schools" element={<SchoolsManagement />} />
        <Route path="plans" element={<SubscriptionPlans />} />
        <Route path="roles" element={<RolesPermissions />} />
        <Route path="analytics" element={<PlatformAnalytics />} />
        <Route path="announcements" element={<GlobalAnnouncements />} />
        <Route path="sms" element={<SystemSettings />} />
        <Route path="settings" element={<SystemSettings />} />
        <Route path="logs" element={<LogsMonitoring />} />
        <Route path="profile" element={<SuperAdminProfile />} />
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// ============================================
// MAIN APP COMPONENT
// ============================================
const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 5000,
          }}
        />
        <BrowserRouter>
          <AuthProvider>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
