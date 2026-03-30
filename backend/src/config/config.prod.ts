export default {
  openai: {
    apiKey: '',
    model: '',
  },
  zkpass: {
    devServer: 'https://dev.zkpass.org/v1',
    appId: '',
  },
  db: {
    path: './db/data/transgate.db',
  },
  resolver: {
    recursionLimit: 10,
    timeoutMs: 30_000,
  },
};