import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const ROLE_ROUTES = {
  SUPER_ADMIN: '/superadmin',
  SCHOOL_ADMIN: '/admin',
  HOMEROOM_TEACHER: '/homeroom',
  TEACHER: '/teacher',
  STUDENT: '/student',
  PARENT: '/parent',
};

export default function RoleSelection() {
  const { user, activeRole, setActiveRole } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const roles = Array.isArray(user.roles) && user.roles.length > 0
    ? user.roles
    : [user.role].filter(Boolean);

  const handleSelect = (role) => {
    setActiveRole(role);
    const route = ROLE_ROUTES[role] || '/';
    navigate(route);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card rounded-xl border border-border p-6 shadow-lg space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-heading">Choose your role</h1>
          <p className="text-xs text-text-secondary mt-1">
            Your account has access to multiple views. Select how you want to use the system now.
          </p>
        </div>

        <div className="space-y-3">
          {roles.includes('TEACHER') && (
            <button
              onClick={() => handleSelect('TEACHER')}
              className="w-full text-left px-4 py-3 rounded-lg border border-border bg-background hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <p className="text-sm font-semibold text-heading">Teacher View</p>
              <p className="text-xs text-text-secondary">
                Manage subjects, lessons, and grades.
              </p>
            </button>
          )}

          {roles.includes('HOMEROOM_TEACHER') && (
            <button
              onClick={() => handleSelect('HOMEROOM_TEACHER')}
              className="w-full text-left px-4 py-3 rounded-lg border border-border bg-background hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <p className="text-sm font-semibold text-heading">Homeroom Teacher View</p>
              <p className="text-xs text-text-secondary">
                Manage class students, parents, and attendance.
              </p>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

