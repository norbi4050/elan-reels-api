// agent-sdk/tests/types.test.ts
import { describe, it, expect } from 'vitest';
import type { Storyboard, Brief, BriefResponse, VLMScore } from '../src/types/index.js';

describe('types', () => {
  it('Storyboard shape is correct', () => {
    const s: Storyboard = {
      reel_id: 'uuid-1',
      brand: 'elan.casa',
      format: 'reel',
      linea_negocio: 'solar',
      arco: 'fomo',
      titulo: 'Test',
      duracion_total_s: 30,
      voz_narracion: 'Texto de prueba.',
      caption_instagram: 'Caption #test',
      hashtags: '#test',
      scenes: [],
    };
    expect(s.brand).toBe('elan.casa');
    expect(s.format).toBe('reel');
  });
});
