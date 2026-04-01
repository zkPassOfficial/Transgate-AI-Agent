import { Router, Request, Response } from 'express';
import { getDb } from '../db/init.js';

const router = Router();

/**
 * GET /api/campaign/:id
 * Returns campaign info and associated zkpass schema IDs.
 */
router.get('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid campaign ID' });
    return;
  }

  const db = getDb();

  const campaign = db.prepare('SELECT id, name, description FROM campaigns WHERE id = ?').get(id) as Record<string, any> | undefined;
  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  const schemas = db.prepare(`
    SELECT s.zkpass_schema_id
    FROM campaign_schemas cs
    JOIN schemas s ON cs.schema_id = s.id
    WHERE cs.campaign_id = ?
    ORDER BY cs.display_order
  `).all(id) as { zkpass_schema_id: string }[];

  res.json({
    campaign: { id: campaign.id, name: campaign.name },
    zkpassSchemaIds: schemas.map(s => s.zkpass_schema_id),
  });
});

export default router;
