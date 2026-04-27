// agent-sdk/src/tools/generateVideo.ts

import { fal } from '@fal-ai/client';
import { config } from '../config.js';
import { upsertVideoJob } from '../supabase.js';

fal.config({ credentials: config.falKey });

const HAPPYHORSE_MODEL = 'fal-ai/happyhorse/image-to-video';
const SEEDANCE_MODEL = 'bytedance/seedance-2.0/image-to-video';

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

  const modelId = useHappyHorse ? HAPPYHORSE_MODEL : SEEDANCE_MODEL;
  const input = useHappyHorse
    ? { image_urls: [startFrameUrl, endFrameUrl], prompt: motionPrompt, prompt_strength: 0.9, duration: durationS, aspect_ratio: '9:16' }
    : { image_url: startFrameUrl, end_image_url: endFrameUrl, prompt: motionPrompt, duration: String(durationS), aspect_ratio: '9:16', resolution: '1080p', generate_audio: false };

  const { request_id } = await fal.queue.submit(modelId, { input, webhookUrl });

  await upsertVideoJob({ request_id, reel_id: reelId, scene_index: sceneIndex, status: 'pending' });

  return request_id;
}
