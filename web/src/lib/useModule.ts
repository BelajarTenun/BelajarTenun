import { useEffect, useState } from 'react';
import { api, type Module } from './api';

export function useModule(id?: string) {
  const [module, setModule] = useState<Module | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { if (id) api<Module>(`/api/module?id=${encodeURIComponent(id)}`).then(setModule, (e) => setError(e.message)); }, [id]);
  return { module, error };
}
