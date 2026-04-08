import { useState, useCallback } from 'react';
import { aiService } from '@/services/aiService';

export function useAIChat(sessionId = null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = useCallback(async (question) => {
    setLoading(true);
    setError(null);
    try {
      const chat = await aiService.chat(question, {
        sessionId: sessionId?.toString?.(),
      });
      return chat?.aiResponse || '';
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const getHistory = useCallback(async (params = {}) => {
    try {
      return await aiService.getChatHistory({ ...params, sessionId });
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, [sessionId]);

  return { sendMessage, getHistory, loading, error };
}
