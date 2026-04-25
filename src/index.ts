// agent-sdk/src/index.ts

import express from 'express';
import { validateConfig, config } from './config.js';
import { healthRouter } from './routes/health.js';
import { briefRouter } from './routes/brief.js';
import { webhookRouter } from './routes/webhook.js';
import { renderRouter } from './routes/render.js';

validateConfig();

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use('/health', healthRouter);
app.use('/brief', briefRouter);
app.use('/webhook', webhookRouter);
app.use('/render', renderRouter);

app.listen(config.port, () => {
  console.log(`elan Agent SDK running on port ${config.port}`);
});
