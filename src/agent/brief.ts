// agent-sdk/src/agent/brief.ts

import { v4 as uuid } from 'uuid';
import { generateStoryboard } from './storyboard.js';
import { generateKeyframe } from '../tools/generateKeyframe.js';
import { judgeImage } from '../tools/judgeImage.js';
import { supabase, updateReelStatus } from '../supabase.js';
import type { Brief, BriefResponse, Scene, Storyboard } from '../types/index.js';

export async function runBrief(brief: Brief): Promise<BriefResponse> {
  const reelId = uuid();

  const storyboard = await generateStoryboard(reelId, brief);

  const { error } = await supabase.from('reels').insert({
    id: reelId,
    brand: 'elan.casa',
    format: brief.format,
    linea_negocio: brief.linea_negocio,
    arco: brief.arco ?? 'lifestyle',
    status: 'KEYFRAMES_RENDERING',
    idea_titulo: storyboard.titulo,
    storyboard_json: storyboard,
    scenes_count: storyboard.scenes.length,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Failed to insert reel: ${error.message}`);

  // Fire keyframe generation in background — don't block the HTTP response
  processKeyframesBackground(reelId, storyboard).catch(async (err) => {
    console.error('processKeyframes error:', err);
    try {
      await updateReelStatus(reelId, 'ERROR', {
        error_stage: 'KEYFRAMES_RENDERING',
        error_detail: String(err),
      });
    } catch { /* ignore */ }
  });

  return { reel_id: reelId, storyboard, status: 'processing' };
}

async function processKeyframesBackground(reelId: string, storyboard: Storyboard): Promise<void> {
  const spaceCache: Record<string, string> = {};
  const startUrls: string[] = [];
  const endUrls: string[] = [];

  for (const scene of storyboard.scenes) {
    const referenceUrl = spaceCache[scene.espacio_fisico];
    const startUrl = await generateAndJudge(scene, 'start', referenceUrl);
    const endUrl = await generateAndJudge(scene, 'end', startUrl);
    startUrls.push(startUrl);
    endUrls.push(endUrl);
    spaceCache[scene.espacio_fisico] = startUrl;
  }

  await updateReelStatus(reelId, 'AWAITING_SCENE_APPROVAL', {
    keyframes_start_urls: startUrls,
    keyframes_end_urls: endUrls,
    keyframe_status: startUrls.map(() => 'ready'),
  });

  // Notify n8n that keyframes are ready
  const n8nKeyframesUrl = process.env.N8N_KEYFRAMES_WEBHOOK_URL;
  if (n8nKeyframesUrl) {
    await fetch(n8nKeyframesUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reel_id: reelId, storyboard, keyframes_start_urls: startUrls, keyframes_end_urls: endUrls }),
    });
  }
}

async function generateAndJudge(scene: Scene, role: 'start' | 'end', referenceUrl?: string): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const url = await generateKeyframe({ scene, role, referenceImageUrl: referenceUrl });
    const score = await judgeImage({ imageUrl: url, sceneBrief: `${scene.shot_template_id}: ${scene.subject}` });
    if (score.pass || attempt === 1) return url;
  }
  throw new Error('unreachable');
}
