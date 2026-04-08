import { useState, useCallback } from 'react';
import { aiService } from '@/services/aiService';

export function useAIHomework() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generate = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    try {
      const result = await aiService.generateHomework(params);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTeacherHomework = useCallback(async (params = {}) => {
    try {
      return await aiService.getTeacherHomework(params);
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, []);

  const getClassHomework = useCallback(async (classId, params = {}) => {
    try {
      return await aiService.getClassHomework(classId, params);
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, []);

  return { generate, getTeacherHomework, getClassHomework, loading, error };
}
