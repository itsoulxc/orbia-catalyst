export interface CatalystUpdate {
  current_version: string;
  latest_version?: string;
  update_available: boolean;
  name?: string;
  body?: string;
  published_at?: string;
  download_url?: string;
  size?: number;
  available?: boolean;
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
  async downloadAndLaunch(update: CatalystUpdate): Promise<boolean> {
    if (!update.download_url) return false;
    const response = await fetch(`${ENGINE_URL}/api/updates/install`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ download_url: update.download_url })
    });
    return response.ok;
  }
};
