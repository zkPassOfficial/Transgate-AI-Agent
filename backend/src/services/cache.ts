import { getDb } from '../db/init.js';
import type { PlatformSummary, CampaignSummary } from '../types/index.js';

let platformSummary: PlatformSummary[] = [];
let campaignSummary: CampaignSummary[] = [];

/**
 * Rebuild in-memory caches from SQLite.
 * Call once at startup; call again if data changes.
 */
export function refreshCache(): void {
  const db = getDb();

  platformSummary = db.prepare(`
    SELECT platform, GROUP_CONCAT(DISTINCT category) AS categories
    FROM schemas
    GROUP BY platform
    ORDER BY platform
  `).all().map((row: any) => ({
    platform: row.platform,
    categories: row.categories.split(','),
  }));

  campaignSummary = db.prepare(`
    SELECT id, name, aliases, description
    FROM campaigns
    ORDER BY id
  `).all() as CampaignSummary[];
}

export function getPlatformSummary(): PlatformSummary[] {
  return platformSummary;
}

export function getCampaignSummary(): CampaignSummary[] {
  return campaignSummary;
}
