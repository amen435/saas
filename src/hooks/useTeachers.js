import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { teacherService } from '@/services/teacherService';

export function useTeachers(params = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['teachers', user?.schoolId, params],
    queryFn: () => teacherService.getAll(params),
    enabled: !!user && user.role === 'SCHOOL_ADMIN',
  });
}
