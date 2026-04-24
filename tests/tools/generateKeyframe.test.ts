// agent-sdk/tests/tools/generateKeyframe.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/supabase.js', () => ({
  getShotTemplate: vi.fn().mockResolvedValue({
    id: 'establishing_home',
    skeleton_prompt: 'Exterior facade of a luxury modern home',
    skeleton_motion_prompt: 'slow dolly-in, 5 seconds',
  }),
  getVisualSystem: vi.fn().mockResolvedValue({
    lighting: 'warm ambient fill',
    color_grading: 'muted warm tones',
    lens_language: { establishing: '24mm wide, low angle' },
    negative_system: 'cartoon, CGI render',
  }),
}));

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    images: {
      generate: vi.fn().mockResolvedValue({ data: [{ url: 'https://example.com/image.jpg' }] }),
      edit: vi.fn().mockResolvedValue({ data: [{ url: 'https://example.com/edited.jpg' }] }),
    },
  })),
}));

describe('generateKeyframe', () => {
  it('calls OpenAI images.generate for start frame without reference', async () => {
    const { generateKeyframe } = await import('../../src/tools/generateKeyframe.js');
    const url = await generateKeyframe({
      scene: {
        id: 1, shot_template_id: 'establishing_home', espacio_fisico: 'exterior',
        duracion_s: 5, subject: 'residencia premium', motion_prompt: 'slow dolly-in',
        prompt_strength: 0.9, transition_next: 'hard_cut',
      },
      role: 'start',
    });
    expect(url).toBe('https://example.com/image.jpg');
  });

  it('calls images.edit when referenceImageUrl is provided', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    }));
    const { generateKeyframe } = await import('../../src/tools/generateKeyframe.js');
    const url = await generateKeyframe({
      scene: {
        id: 2, shot_template_id: 'establishing_home', espacio_fisico: 'living',
        duracion_s: 5, subject: 'living room', motion_prompt: 'static',
        prompt_strength: 0.9, transition_next: 'crossfade_300ms',
      },
      role: 'end',
      referenceImageUrl: 'https://example.com/ref.jpg',
    });
    expect(url).toBe('https://example.com/edited.jpg');
  });
});
