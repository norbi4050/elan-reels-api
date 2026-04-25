// agent-sdk/tests/tools/validateVideo.test.ts
import { describe, it, expect, vi } from 'vitest';

const mockFfprobe = vi.fn();

vi.mock('fluent-ffmpeg', () => ({
  default: vi.fn().mockReturnValue({
    ffprobe: mockFfprobe,
  }),
}));

// Default: valid 9:16, 5-second video
// ffprobe is called as instance.ffprobe(cb) — the URL is already bound to the ffmpeg instance
mockFfprobe.mockImplementation((cb: Function) => {
  cb(null, {
    streams: [{ codec_type: 'video', width: 1080, height: 1920, r_frame_rate: '30/1' }],
    format: { duration: '5.0' },
  });
});

describe('validateVideo', () => {
  it('passes a valid 9:16 5-second video', async () => {
    const { validateVideo } = await import('../../src/tools/validateVideo.js');
    const result = await validateVideo({ videoUrl: 'https://example.com/clip.mp4', expectedDurationS: 5 });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails a video with wrong resolution', async () => {
    mockFfprobe.mockImplementationOnce((cb: Function) => {
      cb(null, {
        streams: [{ codec_type: 'video', width: 1920, height: 1080, r_frame_rate: '30/1' }],
        format: { duration: '5.0' },
      });
    });
    const { validateVideo } = await import('../../src/tools/validateVideo.js');
    const result = await validateVideo({ videoUrl: 'https://example.com/clip.mp4', expectedDurationS: 5 });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('resolution'))).toBe(true);
  });
});
