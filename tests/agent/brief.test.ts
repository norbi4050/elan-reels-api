// agent-sdk/tests/agent/brief.test.ts
import { describe, it, expect, vi } from 'vitest';
import type { Brief, Storyboard } from '../../src/types/index.js';

const mockStoryboard: Storyboard = {
  reel_id: 'mock-reel-id',
  brand: 'elan.casa', format: 'reel', linea_negocio: 'solar', arco: 'educativo',
  titulo: 'Test', duracion_total_s: 30, voz_narracion: 'Voz', caption_instagram: 'Cap', hashtags: '#test',
  scenes: [{ id: 1, shot_template_id: 'solar_panels_roof', espacio_fisico: 'techo', duracion_s: 5,
    subject: 'paneles', motion_prompt: 'slow pan, 5s', prompt_strength: 0.9, transition_next: 'hard_cut' }],
};

vi.mock('../../src/agent/storyboard.js', () => ({
  generateStoryboard: vi.fn().mockResolvedValue(mockStoryboard),
}));

vi.mock('../../src/tools/generateKeyframe.js', () => ({
  generateKeyframe: vi.fn().mockResolvedValue('https://img.url/1.jpg'),
}));

vi.mock('../../src/tools/judgeImage.js', () => ({
  judgeImage: vi.fn().mockResolvedValue({ score: 8, reasoning: 'great', pass: true }),
}));

// Mock uuid so reel_id is deterministic
vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('test-reel-uuid'),
}));

// Mock supabase module — avoid chained call issues by using simple standalone fns
vi.mock('../../src/supabase.js', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
  updateReelStatus: vi.fn().mockResolvedValue(undefined),
}));

describe('runBrief', () => {
  it('returns reel_id, storyboard, and keyframe URLs', async () => {
    const { runBrief } = await import('../../src/agent/brief.js');
    const brief: Brief = { format: 'reel', linea_negocio: 'solar' };
    const result = await runBrief(brief);
    expect(result.reel_id).toBeDefined();
    expect(result.storyboard.brand).toBe('elan.casa');
    expect(result.keyframes_start_urls).toHaveLength(1);
    expect(result.keyframes_end_urls).toHaveLength(1);
  });
});
