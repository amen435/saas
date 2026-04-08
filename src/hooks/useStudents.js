import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { studentService } from '@/services/studentService';
import api from '@/services/api';

export function useAdminStudents(params = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['adminStudents', user?.schoolId, params],
    queryFn: () => studentService.getAdminStudents(params),
    enabled: !!user && user.role === 'SCHOOL_ADMIN',
  });
}

export function useHomeroomClasses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['homeroomClasses', user?.userId],
    queryFn: async () => {
      const data = await api.get('/homeroom/my-homeroom-classes');
      return data?.data || [];
    },
    enabled: !!user && ['TEACHER', 'HOMEROOM_TEACHER'].includes(user.role),
  });
}

export function useHomeroomStudents(classId, params = {}) {
  return useQuery({
    queryKey: ['homeroomStudents', classId, params],
    queryFn: () => studentService.getHomeroomStudents(classId, params),
    enabled: !!classId,
  });
}

/**
 * Fetches all homeroom students for the logged-in homeroom teacher.
 *
 * Backend endpoints used (NO `/api/homeroom/students` list endpoint):
 * - GET `/api/homeroom/my-homeroom-classes`
 * - For each class: GET `/api/homeroom/classes/:classId/students`
 * - Merge results client-side.
 */
export function useHomeroomAllStudents(params = {}) {
  const { user } = useAuth();
  const paramsKey = JSON.stringify(params || {});
  return useQuery({
    queryKey: ['homeroomAllStudents', user?.userId, paramsKey],
    queryFn: async () => {
      return studentService.getStudents(params);
    },
    enabled: !!user && ['TEACHER', 'HOMEROOM_TEACHER'].includes(user?.role),
  });
}
