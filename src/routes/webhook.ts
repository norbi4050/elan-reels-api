// agent-sdk/src/routes/webhook.ts

import { Router } from 'express';
import { upsertVideoJob, supabase, updateReelStatus } from '../supabase.js';

export const webhookRouter = Router();

webhookRouter.post('/fal', async (req, res) => {
  res.sendStatus(200);
  try {
    const { reel_id, scene_index } = req.query as { reel_id: string; scene_index: string };
    const payload = req.body;

    const videoUrl = payload.payload?.video?.url ?? payload.output?.video?.url;
    const isError = payload.status === 'ERROR' || !videoUrl;

    await upsertVideoJob({
      request_id: payload.request_id ?? 'unknown',
      reel_id,
      scene_index: Number(scene_index),
      status: isError ? 'error' : 'done',
      result_url: videoUrl,
      error: isError ? JSON.stringify(payload.error ?? payload.detail ?? 'no output') : undefined,
    });

    const { data: jobs } = await supabase
      .from('video_render_jobs')
      .select('scene_index, status, result_url')
      .eq('reel_id', reel_id);

    // Collapse to best status per scene_index (done > error > pending)
    const byScene = new Map<number, string>();
    for (const j of jobs ?? []) {
      const cur = byScene.get(j.scene_index);
      if (!cur || j.status === 'done' || (j.status === 'error' && cur === 'pending')) {
        byScene.set(j.scene_index, j.status);
      }
    }
    const total = byScene.size;
    const done = [...byScene.values()].filter(s => s === 'done').length;
    const errored = [...byScene.values()].filter(s => s === 'error').length;

    if (done + errored === total && total > 0) {
      const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL!;
      await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reel_id, done, errored, total }),
      });
    }
  } catch (err) {
    console.error('webhook/fal error:', err);
    // Best-effort: try to mark reel as ERROR
    const { reel_id } = req.query as { reel_id: string; scene_index: string };
    try {
      await updateReelStatus(reel_id, 'ERROR', {
        error_stage: 'VIDEO_RENDERING',
        error_detail: String(err),
      });
    } catch {
      // ignore secondary error
    }
  }
});
