// agent-sdk/src/supabase.ts

import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { ShotTemplate, ReelStatus } from './types/index.js';

export const supabase = createClient(config.supabaseUrl, config.supabaseKey);

export async function getShotTemplate(id: string): Promise<ShotTemplate> {
  const { data, error } = await supabase
    .from('shot_templates')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) throw new Error(`Shot template not found: ${id}`);
  return data as ShotTemplate;
}

export async function getVisualSystem(): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from('elan_visual_system')
    .select('key, value');
  if (error || !data) throw new Error('Visual system not found in Supabase');
  return Object.fromEntries(data.map(row => [row.key, row.value]));
}

export async function updateReelStatus(
  reelId: string,
  status: ReelStatus,
  extra?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from('reels')
    .update({ status, updated_at: new Date().toISOString(), ...extra })
    .eq('id', reelId);
  if (error) throw new Error(`Failed to update reel ${reelId}: ${error.message}`);
}

export async function upsertVideoJob(params: {
  request_id: string;
  reel_id: string;
  scene_index: number;
  status: 'pending' | 'done' | 'error';
  result_url?: string;
  error?: string;
}): Promise<void> {
  const { error } = await supabase.from('video_render_jobs').upsert({
    ...params,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Failed to upsert video job: ${error.message}`);
}

export async function getPendingVideoJobs(reelId: string): Promise<{ scene_index: number; result_url: string }[]> {
  const { data, error } = await supabase
    .from('video_render_jobs')
    .select('scene_index, result_url, status')
    .eq('reel_id', reelId)
    .eq('status', 'done');
  if (error) throw new Error(`Failed to get video jobs: ${error.message}`);
  return (data ?? []) as { scene_index: number; result_url: string }[];
}
