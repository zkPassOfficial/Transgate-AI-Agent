import config from '../config/index.js';
import { getDb } from '../db/init.js';
import type { VerifySchema } from '../types/index.js';

const { devServer, appId } = config.zkpass;

export async function fetchSchema(schemaId: string) {
  const res = await fetch(`${devServer}/schema/${schemaId}`);
  if (!res.ok) throw new Error('Failed to fetch schema');
  return await res.json();
}

export async function allocateTask(schemaId: string) {
  const res = await fetch(`${devServer}/sdk/atask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://dev.zkpass.org',
      'Referer': 'https://dev.zkpass.org/',
    },
    body: JSON.stringify({
      schema_id: schemaId,
      app_id: appId,
      chain_type: 'evm',
      debug: false,
    }),
  });
  if (!res.ok) throw new Error('Failed to allocate task');
  const data = await res.json();
  if (data.errno !== '0') throw new Error(data.msg || 'Task allocation failed');
  return data.info;
}

/**
 * Build the full verify payload for a single schema.
 * Looks up the schemaId in SQLite, fetches zkPass schema + allocates task in parallel,
 * then merges with local DB metadata.
 * Returns null if the schema doesn't exist or has no zkpass_schema_id.
 */
/**
 * Build the full verify payload by local schemaId.
 */
export async function buildVerifyPayload(schemaId: string): Promise<VerifySchema | null> {
  const db = getDb();
  const row = db.prepare('SELECT title, zkpass_schema_id, http_version, login_config, navigation FROM schemas WHERE id = ?').get(schemaId) as Record<string, string> | undefined;
  if (!row?.zkpass_schema_id) return null;
  return buildPayloadFromZkpass(row.zkpass_schema_id, row);
}

/**
 * Build the full verify payload by zkpass schemaId.
 */
export async function buildVerifyPayloadByZkpass(zkpassSchemaId: string): Promise<VerifySchema | null> {
  const db = getDb();
  const row = db.prepare('SELECT title, zkpass_schema_id, http_version, login_config, navigation FROM schemas WHERE zkpass_schema_id = ?').get(zkpassSchemaId) as Record<string, string> | undefined;
  if (!row) return null;
  return buildPayloadFromZkpass(zkpassSchemaId, row);
}

async function buildPayloadFromZkpass(zkpassSchemaId: string, row: Record<string, string>): Promise<VerifySchema> {
  const [schema, task] = await Promise.all([
    fetchSchema(zkpassSchemaId),
    allocateTask(zkpassSchemaId),
  ]);

  return {
    title: row.title || '',
    zkpassSchemaId,
    website: schema.website,
    APIs: schema.APIs,
    signature: schema.signature,
    httpVersion: row.http_version || '1.1',
    task: task.task,
    nodeHost: task.node_host,
    nodeAddress: task.node_address,
    allocAddress: task.alloc_address,
    allocSignature: task.alloc_signature,
    loginDetect: JSON.parse(row.login_config || 'null'),
    targetPage: JSON.parse(row.navigation || 'null'),
  };
}
