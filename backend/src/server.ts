import app from './app.js';
import { validateConfig } from './config/index.js';
import { getDb } from './db/init.js';
import { refreshCache } from './services/cache.js';

const port = process.env.PORT || 3000;

async function start() {
  validateConfig();
  getDb();
  refreshCache();
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

start();
