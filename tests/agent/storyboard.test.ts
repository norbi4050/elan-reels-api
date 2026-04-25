// agent-sdk/tests/agent/storyboard.test.ts
import { describe, it, expect, vi } from 'vitest';
import type { Storyboard, Brief } from '../../src/types/index.js';

const mockStoryboard: Storyboard = {
  reel_id: 'test-uuid',
  brand: 'elan.casa',
  format: 'reel',
  linea_negocio: 'solar',
  arco: 'educativo',
  titulo: 'Tus paneles trabajan mientras dormís',
  duracion_total_s: 30,
  voz_narracion: 'Texto de prueba',
  caption_instagram: 'Caption de prueba',
  hashtags: '#solar',
  scenes: [{
    id: 1, shot_template_id: 'solar_panels_roof', espacio_fisico: 'exterior_techo',
    duracion_s: 5, subject: 'paneles Enertik', motion_prompt: 'slow pan, 5 seconds',
    prompt_strength: 0.9, transition_next: 'hard_cut',
  }],
};

// Hoisted shared spy — same pattern as judgeImage.test.ts — avoids ESM re-mock issues
const mockCreate = vi.fn().mockResolvedValue({
  content: [{ type: 'text', text: JSON.stringify(mockStoryboard) }],
});

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

describe('generateStoryboard', () => {
  it('returns a valid Storyboard from Claude', async () => {
    const { generateStoryboard } = await import('../../src/agent/storyboard.js');
    const brief: Brief = { format: 'reel', linea_negocio: 'solar', arco: 'educativo' };
    const result = await generateStoryboard('test-uuid', brief);
    expect(result.brand).toBe('elan.casa');
    expect(result.format).toBe('reel');
    expect(result.scenes.length).toBeGreaterThan(0);
  });

  it('throws when Claude returns invalid JSON', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'not json' }],
    });
    const { generateStoryboard } = await import('../../src/agent/storyboard.js');
    await expect(generateStoryboard('id', { format: 'reel', linea_negocio: 'solar' }))
      .rejects.toThrow();
  });
});
