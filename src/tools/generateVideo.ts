// agent-sdk/src/tools/generateVideo.ts

import { fal } from '@fal-ai/client';
import { config } from '../config.js';
import { upsertVideoJob } from '../supabase.js';

fal.config({ credentials: config.falKey });

const HAPPYHORSE_MODEL = 'fal-ai/happyhorse/image-to-video';
const KLING_MODEL = 'fal-ai/kling-video/v1.6/standard/image-to-video';

export async function generateVideo(params: {
  reelId: string;
  sceneIndex: number;
  startFrameUrl: string;
  endFrameUrl: string;
  motionPrompt: string;
  durationS: number;
}): Promise<string> {
  const { reelId, sceneIndex, startFrameUrl, endFrameUrl, motionPrompt, durationS } = params;
  const webhookUrl = `${config.agentBaseUrl}/webhook/fal?reel_id=${reelId}&scene_index=${sceneIndex}`;
  const useHappyHorse = config.useHappyHorse;

  const modelId = useHappyHorse ? HAPPYHORSE_MODEL : KLING_MODEL;
  const input = useHappyHorse
    ? { image_urls: [startFrameUrl, endFrameUrl], prompt: motionPrompt, prompt_strength: 0.9, duration: durationS, aspect_ratio: '9:16' }
    : { image_url: startFrameUrl, prompt: motionPrompt, duration: String(durationS), aspect_ratio: '9:16' };

  const { request_id } = await fal.queue.submit(modelId, { input, webhookUrl });

  await upsertVideoJob({ request_id, reel_id: reelId, scene_index: sceneIndex, status: 'pending' });

  return request_id;
}
