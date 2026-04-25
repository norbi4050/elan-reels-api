// agent-sdk/src/agent/render.ts

import { tmpdir } from 'os';
import { join } from 'path';
import { rm, mkdir } from 'fs/promises';
import axios from 'axios';
import { createWriteStream } from 'fs';
import { generateVideo } from '../tools/generateVideo.js';
import { generateVoiceover } from '../tools/generateVoiceover.js';
import { generateCaptions } from '../tools/generateCaptions.js';
import { concatAndMix } from '../tools/concatAndMix.js';
import { validateVideo } from '../tools/validateVideo.js';
import { supabase, updateReelStatus, getPendingVideoJobs } from '../supabase.js';
import type { RenderRequest, RenderResponse } from '../types/index.js';

export async function runRender(request: RenderRequest): Promise<RenderResponse> {
  const { reel_id, storyboard, approved_scenes } = request;

  try {
    await updateReelStatus(reel_id, 'VIDEO_RENDERING');

    const sceneMap = new Map(storyboard.scenes.map(s => [s.id, s]));
    const jobPromises = approved_scenes.map((scene, i) =>
      generateVideo({
        reelId: reel_id,
        sceneIndex: i,
        startFrameUrl: scene.start_url,
        endFrameUrl: scene.end_url,
        motionPrompt: sceneMap.get(scene.scene_id)?.motion_prompt ?? 'static shot, 5 seconds',
        durationS: sceneMap.get(scene.scene_id)?.duracion_s ?? 5,
      })
    );
    await Promise.all(jobPromises);

    return {
      reel_id,
      video_url: 'pending_webhook',
      duration_s: storyboard.duracion_total_s,
      scenes_validated: approved_scenes.length,
    };
  } catch (err) {
    await updateReelStatus(reel_id, 'ERROR', { error_stage: 'VIDEO_RENDERING', error_detail: String(err) });
    throw err;
  }
}

export async function runAssemble(reelId: string, storyboard: RenderRequest['storyboard']): Promise<string> {
  const workDir = join(tmpdir(), `reel-${reelId}`);
  await mkdir(workDir, { recursive: true });

  try {
    await updateReelStatus(reelId, 'VIDEO_READY');

    const jobs = await getPendingVideoJobs(reelId);
    const sortedJobs = jobs.sort((a, b) => a.scene_index - b.scene_index);

    const clipPaths: string[] = [];
    for (const job of sortedJobs) {
      const localPath = join(workDir, `clip-${job.scene_index}.mp4`);
      await downloadFile(job.result_url, localPath);
      clipPaths.push(localPath);
      const validation = await validateVideo({ videoUrl: localPath, expectedDurationS: storyboard.scenes[job.scene_index]?.duracion_s ?? 5 });
      if (!validation.valid) {
        console.warn(`Scene ${job.scene_index} failed validation: ${validation.errors.join(', ')}`);
      }
    }

    const voiceoverPath = join(workDir, 'voiceover.mp3');
    await generateVoiceover({ text: storyboard.voz_narracion, outputPath: voiceoverPath });

    const { srtContent } = await generateCaptions({ audioPath: voiceoverPath });
    const srtPath = join(workDir, 'captions.srt');
    const { writeFile } = await import('fs/promises');
    await writeFile(srtPath, srtContent);

    const outputPath = join(workDir, 'final.mp4');
    await concatAndMix({
      clipPaths,
      scenes: storyboard.scenes,
      voiceoverPath,
      srtPath,
      outputPath,
    });

    const { readFile } = await import('fs/promises');
    const videoBuffer = await readFile(outputPath);
    const storageKey = `reels/${reelId}/final.mp4`;

    const { error } = await supabase.storage
      .from('reels-videos')
      .upload(storageKey, videoBuffer, { contentType: 'video/mp4', upsert: true });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);

    const { data: urlData } = supabase.storage.from('reels-videos').getPublicUrl(storageKey);
    const publicUrl = urlData.publicUrl;

    await updateReelStatus(reelId, 'AWAITING_FINAL_APPROVAL', {
      assembled_url: publicUrl,
      caption: storyboard.caption_instagram,
      hashtags: storyboard.hashtags,
    });

    return publicUrl;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function downloadFile(url: string, dest: string): Promise<void> {
  const response = await axios({ url, method: 'GET', responseType: 'stream' });
  return new Promise((resolve, reject) => {
    const writer = createWriteStream(dest);
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}
