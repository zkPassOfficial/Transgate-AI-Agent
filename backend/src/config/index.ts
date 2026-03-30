export interface AppConfig {
  openai: { apiKey: string; model: string };
  zkpass: { devServer: string; appId: string };
  db: { path: string };
  resolver: { recursionLimit: number; timeoutMs: number };
}

const env = process.env.NODE_ENV || 'development';

let config: AppConfig;
if (env === 'production') {
  config = (await import('./config.prod.js')).default;
} else {
  config = (await import('./config.dev.js')).default;
}

/** Validate required config for server runtime. Call at startup. */
export function validateConfig(): void {
  const required: [string, unknown][] = [
    ['openai.apiKey', config.openai?.apiKey],
    ['zkpass.appId', config.zkpass?.appId],
  ];

  const missing = required.filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) {
    throw new Error(`Missing required config: ${missing.join(', ')}`);
  }
}

export default config;
