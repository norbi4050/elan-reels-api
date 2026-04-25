// agent-sdk/src/routes/render.ts

import { Router } from 'express';
import { runRender, runAssemble } from '../agent/render.js';
import type { RenderRequest } from '../types/index.js';

export const renderRouter = Router();

renderRouter.post('/', async (req, res) => {
  try {
    const request = req.body as RenderRequest;
    const result = await runRender(request);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

renderRouter.post('/assemble', async (req, res) => {
  try {
    const { reel_id, storyboard } = req.body;
    const videoUrl = await runAssemble(reel_id, storyboard);
    res.json({ reel_id, video_url: videoUrl });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
