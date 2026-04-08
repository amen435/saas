// src/hooks/useProtectedGet.js

import { useEffect, useState } from "react";
import api from "@/services/api";

/**
 * Simple helper hook for calling protected GET endpoints.
 * Uses the shared cookie-based API client.
 */
export function useProtectedGet(endpoint) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!endpoint);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!endpoint) return;

    let active = true;

    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(endpoint);
        if (!active) return;
        setData(res);
      } catch (err) {
        if (!active) return;
        setError(err.message || "Failed to load data.");
      } finally {
        if (active) setLoading(false);
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [endpoint]);

  return { data, loading, error, setData };
}
