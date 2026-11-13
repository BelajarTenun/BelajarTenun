import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type Config } from './api';

// Status akun + kamera aktif dibagi antar halaman (kamera tetap menyala dari "Siapkan" ke "Praktik").
type Ctx = { config: Config | null; refresh: () => Promise<void>; camera: any; setCamera: (c: any) => void };
const AppCtx = createContext<Ctx>(null!);

export function AppProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [camera, setCameraState] = useState<any>(null);
  const refresh = async () => setConfig(await api<Config>('/api/config'));
  useEffect(() => { refresh(); }, []);
  const setCamera = (c: any) => setCameraState((old: any) => { if (old && old !== c) old.stop?.(); return c; });
  return <AppCtx.Provider value={{ config, refresh, camera, setCamera }}>{children}</AppCtx.Provider>;
}
export const useApp = () => useContext(AppCtx);
