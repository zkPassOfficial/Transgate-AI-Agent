import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import chatRouter from './routes/chat.js';
import verifyRouter from './routes/verify.js';
import campaignRouter from './routes/campaign.js';
import { requireUserAddress, rateLimit } from './middleware/user.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.use(express.static(path.resolve(__dirname, '..', 'public')));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/chat', requireUserAddress, rateLimit(60_000, 20), chatRouter);
app.use('/api/verify', requireUserAddress, rateLimit(60_000, 20), verifyRouter);
app.use('/api/campaign', campaignRouter);

export default app;
