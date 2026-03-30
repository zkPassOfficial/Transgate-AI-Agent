import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getDb } from '../db/init.js';

/**
 * Search schemas by platform, category, and/or keywords.
 * Returns up to 20 matching rows for the LLM to pick from.
 */
export const searchSchemasTool = tool(
  async ({ platform, category, keywords }) => {
    const db = getDb();
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (platform) {
      conditions.push('(platform LIKE ? OR aliases LIKE ?)');
      params.push(`%${platform}%`, `%${platform}%`);
    }
    if (category) {
      conditions.push('(category LIKE ? OR keywords LIKE ?)');
      params.push(`%${category}%`, `%${category}%`);
    }
    if (keywords?.length) {
      const kwClauses = keywords.map(() => '(keywords LIKE ? OR aliases LIKE ? OR title LIKE ? OR description LIKE ?)');
      conditions.push(`(${kwClauses.join(' OR ')})`);
      for (const kw of keywords) {
        const like = `%${kw}%`;
        params.push(like, like, like, like);
      }
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT id, title, description, condition, platform, category
      FROM schemas
      ${where}
      ORDER BY created_at DESC
      LIMIT 20
    `;

    const rows = db.prepare(sql).all(...params);
    return JSON.stringify(rows);
  },
  {
    name: 'search_schemas',
    description:
      'Search verification schemas by platform, category, and keywords. All params are optional. Retry with broader criteria if results are empty.',
    schema: z.object({
      platform: z.string().optional().describe("e.g. 'twitter', 'binance', 'okx'"),
      category: z.string().optional().describe("e.g. 'followers', 'balance', 'account'"),
      keywords: z.array(z.string()).optional().describe('Search keywords'),
    }),
  },
);

/**
 * Search campaigns by name or alias.
 * Returns campaigns with their associated schema IDs.
 */
export const searchCampaignsTool = tool(
  async ({ query }) => {
    const db = getDb();
    const like = `%${query}%`;

    const rows = db.prepare(`
      SELECT c.id, c.name, c.description,
             GROUP_CONCAT(cs.schema_id) AS schema_ids
      FROM campaigns c
      LEFT JOIN campaign_schemas cs ON c.id = cs.campaign_id
      WHERE c.name LIKE ? OR c.aliases LIKE ?
      GROUP BY c.id
    `).all(like, like) as any[];

    const results = rows.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      schemaIds: r.schema_ids ? r.schema_ids.split(',') : [],
    }));

    return JSON.stringify(results);
  },
  {
    name: 'search_campaigns',
    description: 'Search campaigns and their associated verification schemas by name or keyword.',
    schema: z.object({
      query: z.string().describe('Campaign name or keyword'),
    }),
  },
);
