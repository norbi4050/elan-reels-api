// agent-sdk/src/routes/webhook.ts

import { Router } from 'express';
import { upsertVideoJob, supabase } from '../supabase.js';

export const webhookRouter = Router();

webhookRouter.post('/fal', async (req, res) => {
  res.sendStatus(200);
  try {
    const { reel_id, scene_index } = req.query as { reel_id: string; scene_index: string };
    const payload = req.body;

    const isError = payload.status === 'ERROR' || !payload.output?.video?.url;

    await upsertVideoJob({
      request_id: payload.request_id ?? 'unknown',
      reel_id,
      scene_index: Number(scene_index),
      status: isError ? 'error' : 'done',
      result_url: payload.output?.video?.url,
      error: isError ? JSON.stringify(payload.error ?? 'no output') : undefined,
    });

    const { data: jobs } = await supabase
      .from('video_render_jobs')
      .select('status, result_url')
      .eq('reel_id', reel_id);

    const total = jobs?.length ?? 0;
    const done = jobs?.filter(j => j.status === 'done').length ?? 0;
    const errored = jobs?.filter(j => j.status === 'error').length ?? 0;

    if (done + errored === total && total > 0) {
      const n8nWebhookUrl = `${process.env.WEBHOOK_BASE_URL}/webhook/rp-video-done`;
      await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reel_id, done, errored, total }),
      });
    }
  } catch (err) {
    console.error('webhook/fal error:', err);
  }
});
