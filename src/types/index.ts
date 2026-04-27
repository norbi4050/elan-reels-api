// agent-sdk/src/types/index.ts

export type Format = 'reel' | 'presentacion';
export type LineaNegocio = 'solar' | 'domotica' | 'ambas';
export type Arco = 'lifestyle' | 'educativo' | 'fomo' | 'tecnico';
export type Transition = 'hard_cut' | 'crossfade_300ms';
export type ReelStatus =
  | 'DRAFT' | 'IDEA_PROPOSED' | 'STORYBOARD_READY'
  | 'KEYFRAMES_RENDERING' | 'KEYFRAMES_READY'
  | 'AWAITING_SCENE_APPROVAL' | 'SCENES_APPROVED'
  | 'VIDEO_RENDERING' | 'VIDEO_READY' | 'ASSEMBLED'
  | 'AWAITING_FINAL_APPROVAL' | 'PUBLISHED' | 'ERROR';

export interface Scene {
  id: number;
  shot_template_id: string;
  espacio_fisico: string;
  duracion_s: number;
  subject: string;
  motion_prompt: string;
  prompt_strength: number;
  transition_next: Transition;
  seed?: number;
  keyframe_start_url?: string;
  keyframe_end_url?: string;
  video_clip_url?: string;
}

export interface Storyboard {
  reel_id: string;
  brand: 'elan.casa';
  format: Format;
  linea_negocio: LineaNegocio;
  arco: Arco;
  titulo: string;
  duracion_total_s: number;
  voz_narracion: string;
  caption_instagram: string;
  hashtags: string;
  scenes: Scene[];
}

export interface Brief {
  format: Format;
  linea_negocio: LineaNegocio;
  arco?: Arco;
  tema_libre?: string;
}

export interface BriefResponse {
  reel_id: string;
  storyboard: Storyboard;
  status: 'processing';
}

export interface RenderRequest {
  reel_id: string;
  storyboard: Storyboard;
  approved_scenes: ApprovedScene[];
}

export interface ApprovedScene {
  scene_id: number;
  start_url: string;
  end_url: string;
}

export interface RenderResponse {
  reel_id: string;
  video_url: string;
  duration_s: number;
  scenes_validated: number;
}

export interface VLMScore {
  score: number;
  reasoning: string;
  pass: boolean;
}

export interface ShotTemplate {
  id: string;
  nombre: string;
  descripcion: string;
  tecnologia: string;
  camera_motion: string;
  skeleton_prompt: string;
  skeleton_motion_prompt: string;
}

export interface VideoJob {
  request_id: string;
  reel_id: string;
  scene_index: number;
  status: 'pending' | 'done' | 'error';
  result_url?: string;
  error?: string;
}
