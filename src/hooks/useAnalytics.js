import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { aiService } from '@/services/aiService';

export function useStudentPerformance(studentId, academicYear) {
  return useQuery({
    queryKey: ['studentPerformance', studentId, academicYear],
    queryFn: () => aiService.getStudentPerformance(studentId, academicYear),
    enabled: !!studentId && !!academicYear,
  });
}

export function usePerformanceTrends(studentId) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['performanceTrends', studentId],
    queryFn: () => aiService.getPerformanceTrends(studentId),
    enabled: !!studentId && !!user,
  });
}

export function useAtRiskStudents(classId, academicYear) {
  return useQuery({
    queryKey: ['atRiskStudents', classId, academicYear],
    queryFn: () => aiService.getAtRiskStudents(classId, academicYear),
    enabled: !!classId && !!academicYear,
  });
}

export function useSchoolOverview(academicYear) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['schoolOverview', academicYear],
    queryFn: () => aiService.getSchoolOverview(academicYear),
    enabled: !!user?.schoolId && !!academicYear && user.role === 'SCHOOL_ADMIN',
  });
}
