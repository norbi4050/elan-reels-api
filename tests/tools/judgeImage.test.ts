// agent-sdk/tests/tools/judgeImage.test.ts
import { describe, it, expect, vi } from 'vitest';

const mockCreate = vi.fn().mockResolvedValue({
  content: [{ type: 'text', text: '{"score":8,"reasoning":"professional quality","pass":true}' }],
});

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

describe('judgeImage', () => {
  it('returns parsed VLMScore from Claude response', async () => {
    const { judgeImage } = await import('../../src/tools/judgeImage.js');
    const result = await judgeImage({
      imageUrl: 'https://example.com/img.jpg',
      sceneBrief: 'establishing_home: exterior residencia premium',
    });
    expect(result.score).toBe(8);
    expect(result.pass).toBe(true);
    expect(result.reasoning).toBe('professional quality');
  });

  it('returns pass: false when score < 7', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"score":5,"reasoning":"amateurish","pass":false}' }],
    });
    const { judgeImage } = await import('../../src/tools/judgeImage.js');
    const result = await judgeImage({ imageUrl: 'https://example.com/img.jpg', sceneBrief: 'test' });
    expect(result.pass).toBe(false);
  });
});
