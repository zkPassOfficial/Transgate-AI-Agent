import { Router, Request, Response } from 'express';
import { buildVerifyPayload, buildVerifyPayloadByZkpass } from '../services/zkpass.js';

const router = Router();

/**
 * POST /api/verify
 * Accepts either { schemaId } (local DB id) or { zkpassSchemaId } (zkPass platform id).
 * Fetches zkPass schema + allocates task, merges with local DB metadata.
 */
router.post('/', async (req: Request, res: Response) => {
  const { schemaId, zkpassSchemaId } = req.body;

  if (!schemaId && !zkpassSchemaId) {
    res.status(400).json({ action: 'error', reply: 'Missing schemaId or zkpassSchemaId' });
    return;
  }

  const id = schemaId || zkpassSchemaId;
  if (typeof id !== 'string') {
    res.status(400).json({ action: 'error', reply: 'Invalid schemaId or zkpassSchemaId' });
    return;
  }

  try {
    const payload = schemaId
      ? await buildVerifyPayload(schemaId)
      : await buildVerifyPayloadByZkpass(zkpassSchemaId);

    if (!payload) {
      res.status(404).json({ action: 'error', reply: 'Schema not found or not verifiable' });
      return;
    }

    res.json(payload);
  } catch (err) {
    console.error(JSON.stringify({ event: 'verify_error', id, error: (err as Error).message }));
    res.status(500).json({ action: 'error', reply: 'Failed to prepare verification, please try again' });
  }
});

export default router;
