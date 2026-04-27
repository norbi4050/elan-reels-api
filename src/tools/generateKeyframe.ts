// agent-sdk/src/tools/generateKeyframe.ts

import OpenAI from 'openai';
import { config } from '../config.js';
import { getShotTemplate, getVisualSystem, supabase } from '../supabase.js';
import type { Scene, ShotTemplate } from '../types/index.js';

const openai = new OpenAI({ apiKey: config.openaiKey });

async function uploadBase64ToStorage(b64: string): Promise<string> {
  const buffer = Buffer.from(b64, 'base64');
  const filename = `keyframes/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  const { error } = await supabase.storage
    .from('reels-videos')
    .upload(filename, buffer, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(`generateKeyframe: Storage upload failed: ${error.message}`);
  const { data: { publicUrl } } = supabase.storage.from('reels-videos').getPublicUrl(filename);
  return publicUrl;
}

export async function generateKeyframe(params: {
  scene: Scene;
  role: 'start' | 'end';
  referenceImageUrl?: string;
}): Promise<string> {
  const { scene, role, referenceImageUrl } = params;
  const [template, vs] = await Promise.all([
    getShotTemplate(scene.shot_template_id),
    getVisualSystem(),
  ]);

  const prompt = buildPrompt(scene, template, vs, role);

  if (referenceImageUrl) {
    const refResponse = await fetch(referenceImageUrl);
    const refBuffer = await refResponse.arrayBuffer();
    const refFile = new File([refBuffer], 'reference.jpg', { type: 'image/jpeg' });
    const editResponse = await openai.images.edit({
      model: 'gpt-image-1',
      image: refFile,
      prompt: `Maintain exact same architectural space, materials, and lighting from this reference image. ${prompt}`,
      size: '1024x1792' as '1024x1024',
    });
    const b64 = editResponse.data?.[0]?.b64_json;
    if (!b64) throw new Error('generateKeyframe: OpenAI edit returned no image data');
    return uploadBase64ToStorage(b64);
  }

  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt,
    size: '1024x1792' as '1024x1024',
    quality: 'high',
    n: 1,
  });
  const b64 = response.data?.[0]?.b64_json;
  if (!b64) throw new Error('generateKeyframe: OpenAI returned no image data');
  return uploadBase64ToStorage(b64);
}

function buildPrompt(scene: Scene, template: ShotTemplate, vs: Record<string, unknown>, role: 'start' | 'end'): string {
  const lensMap = vs.lens_language as Record<string, string>;
  const lens = getLens(template.id, lensMap);
  const rolePrefix = role === 'end'
    ? 'Show the final resting state of this scene. '
    : 'Show the initial state of this scene. ';

  return [
    rolePrefix + template.skeleton_prompt,
    `Subject: ${scene.subject}`,
    `Lighting: ${vs.lighting as string}`,
    `Color grading: ${vs.color_grading as string}`,
    `Lens: ${lens}`,
    `Materials: polished concrete, dark wood, tempered glass, brushed steel`,
    `Portrait orientation 9:16, 1080x1920px`,
    `NEGATIVE: ${vs.negative_system as string}`,
  ].join('. ');
}

function getLens(templateId: string, lensMap: Record<string, string>): string {
  if (['shelly_device_macro','fibaro_keypad_macro','solar_inverter_macro','energy_savings_graph','fibaro_sensor_room'].includes(templateId)) return lensMap.detail;
  if (['establishing_home','solar_panels_roof','home_overview_auto','solar_day_timelapse'].includes(templateId)) return lensMap.establishing;
  if (['app_control_hands','climate_smart','fibaro_app_tablet'].includes(templateId)) return lensMap.lifestyle;
  return lensMap.product;
}
