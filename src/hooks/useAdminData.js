import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../services/api.js';

export function useAdminData() {
  const [data, setData] = useState({ users: [], files: [] });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const response = await adminApi.getData();
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Не удалось загрузить данные приложения.');
      setData(result);
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { data, setData, error, setError, loading };
}
