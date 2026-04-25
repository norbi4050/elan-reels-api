// agent-sdk/src/routes/brief.ts

import { Router } from 'express';
import { runBrief } from '../agent/brief.js';
import type { Brief } from '../types/index.js';

export const briefRouter = Router();

briefRouter.post('/', async (req, res) => {
  try {
    const brief = req.body as Brief;
    if (!brief.format || !brief.linea_negocio) {
      res.status(400).json({ error: 'format and linea_negocio are required' });
      return;
    }
    const result = await runBrief(brief);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});
