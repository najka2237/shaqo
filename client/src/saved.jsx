import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import { useAuth } from './auth.jsx';

// Which jobs the logged-in job seeker has saved (heart button).
export function useSaved() {
  const { user } = useAuth();
  const [ids, setIds] = useState([]);
  useEffect(() => {
    if (user?.role === 'jobseeker') api.get('/saved/ids').then(setIds).catch(() => {});
    else setIds([]);
  }, [user]);
  const toggle = useCallback(async (jobId) => {
    const has = ids.includes(jobId);
    setIds(has ? ids.filter((x) => x !== jobId) : [...ids, jobId]);
    try { has ? await api.del(`/saved/${jobId}`) : await api.post(`/saved/${jobId}`); }
    catch { setIds(ids); }
  }, [ids]);
  return { ids, toggle, enabled: user?.role === 'jobseeker' };
}
