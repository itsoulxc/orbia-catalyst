export interface CatalystUpdate {
  current_version: string;
  latest_version?: string;
  update_available: boolean;
  name?: string;
  body?: string;
  published_at?: string;
  download_url?: string;
  size?: number;
  sha256?: string;
  available?: boolean;
  error?: string;
}

export interface UpdateProgress {
  state: 'downloading' | 'verifying' | 'launched' | 'error';
  progress: number;
  downloaded_bytes: number;
  total_bytes: number;
  error?: string;
}

const ENGINE_URL = 'http://127.0.0.1:8008';

export const updateService = {
  async check(): Promise<CatalystUpdate | null> {
    try {
      const response = await fetch(`${ENGINE_URL}/api/updates/check`);
      if (!response.ok) return null;
      return await response.json() as CatalystUpdate;
    } catch {
      return null;
    }
  },
  async downloadAndLaunch(update: CatalystUpdate): Promise<string | null> {
    if (!update.download_url) return null;
    const response = await fetch(`${ENGINE_URL}/api/updates/install`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ download_url: update.download_url, sha256: update.sha256 })
    });
    if (!response.ok) return null;
    const body = await response.json() as { job_id?: string };
    return body.job_id || null;
  },
  async getProgress(jobId: string): Promise<UpdateProgress | null> {
    try {
      const response = await fetch(`${ENGINE_URL}/api/updates/status/${encodeURIComponent(jobId)}`);
      return response.ok ? await response.json() as UpdateProgress : null;
    } catch {
      return null;
    }
  }
};
