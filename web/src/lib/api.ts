export type User = { id: string; name: string; email: string; role: 'pemula' | 'partner' | 'admin'; status: string };
export type Config = { ai: boolean; tts: boolean; live: boolean; livekit: boolean; user: User | null; authDisabled: boolean };
export type ModuleSummary = { id: string; title: string; tradition?: string; description?: string; steps: number };
export type Step = { id: string; title: string; instruction: string; tips?: string[]; demo_video?: string; demo_start?: number; demo_attribution?: string; auto_detect?: boolean };
export type Module = {
  id: string; title: string; tradition?: string; description?: string; steps: Step[];
  intro?: { video?: string | null; video_attribution?: string | null; summary?: string | null; tools?: string[]; points?: string[]; duration_min?: number | null };
};

export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }

export async function api<T = any>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, body === undefined
    ? { credentials: 'same-origin' }
    : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(json.error || res.statusText, res.status);
  return json as T;
}

export const log = (type: string, data: Record<string, unknown> = {}) => api('/api/log', { type, ...data }).catch(() => {});

export function speak(text: string) {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text); u.lang = 'id-ID'; u.rate = 0.95;
  speechSynthesis.speak(u);
}
